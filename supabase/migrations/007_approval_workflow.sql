-- Carmelis Studio: Approval workflow (Phase 5).
-- Created: 2026-04-25
-- Public bookings now arrive as 'pending'; admin must approve. Admin can also
-- 'deny' (distinct from customer-initiated 'cancelled') or offer an alternative
-- slot which the customer confirms via the public manage page.

-- ============================================================================
-- 1. Status enum extension
-- ============================================================================
-- Drop the existing CHECK by name (deterministic — created in migration 003).
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_chk;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_chk
  CHECK (status IN ('pending','confirmed','cancelled','denied','completed','no_show'));

-- ============================================================================
-- 2. GIST overlap exclusion — drop denied + cancelled rows from the index.
-- Pending rows MUST stay in the index so two customers cannot lock the same
-- slot via simultaneous requests.
-- ============================================================================
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    (COALESCE(barber_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
    tstzrange(slot_start, slot_end, '[)') WITH &&
  ) WHERE (status NOT IN ('cancelled','denied') AND slot_start IS NOT NULL);

-- ============================================================================
-- 3. New column: alt_offered_at
-- NULL = fresh pending request from the public form
-- NOT NULL = admin offered an alternative slot; manage page shows the
-- "approve/cancel the alternative" UI to the customer.
-- ============================================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS alt_offered_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN bookings.alt_offered_at IS
  'When admin offered an alternative slot for a pending booking. NULL on fresh pending; set on alternative-offer; cleared on approval/denial.';

-- ============================================================================
-- 4. notifications.template CHECK extension
-- ============================================================================
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname FROM pg_constraint
  WHERE conrelid = 'notifications'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%template%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_template_chk
  CHECK (template IN (
    'booking_confirmed',
    'booking_cancelled',
    'booking_reminder_24h',
    'booking_rescheduled',
    'booking_pending',
    'booking_approved',
    'booking_denied',
    'booking_alternative_offered'
  ));

-- ============================================================================
-- 5. RPC: customer_confirm_alternative_by_token(p_token uuid, p_decision text)
--
-- p_decision: 'accept' or 'cancel'
--
-- SECURITY DEFINER. Only acts on rows where status='pending' AND
-- alt_offered_at IS NOT NULL — i.e., admin-suggested alternative awaiting
-- the customer's confirmation. Other states are no-ops returning a clear
-- status code.
--
-- Status codes:
--   ok                          accepted/cancelled successfully
--   not_found                   bad token
--   not_pending                 booking is not in a pending alt-offered state
--   slot_in_past                offered slot already started
--   too_late                    < 24h before offered slot
--   slot_unavailable            (on accept) the slot was taken between offer and accept
-- ============================================================================
CREATE OR REPLACE FUNCTION customer_confirm_alternative_by_token(
  p_token uuid,
  p_decision text
)
RETURNS TABLE (
  status      text,
  booking_id  uuid,
  slot_start  timestamptz,
  slot_end    timestamptz,
  service_id  uuid,
  full_name   text,
  phone       text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_row bookings%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('accept','cancel') THEN
    RETURN QUERY SELECT 'not_pending'::text, NULL::uuid, NULL::timestamptz,
                        NULL::timestamptz, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM bookings WHERE manage_token = p_token;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::timestamptz,
                        NULL::timestamptz, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_row.status <> 'pending' OR v_row.alt_offered_at IS NULL THEN
    RETURN QUERY SELECT 'not_pending'::text, v_row.id, v_row.slot_start,
                        v_row.slot_end, v_row.service_id, v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  IF v_row.slot_start <= now() THEN
    RETURN QUERY SELECT 'slot_in_past'::text, v_row.id, v_row.slot_start,
                        v_row.slot_end, v_row.service_id, v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  IF v_row.slot_start - now() < interval '24 hours' THEN
    RETURN QUERY SELECT 'too_late'::text, v_row.id, v_row.slot_start,
                        v_row.slot_end, v_row.service_id, v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  IF p_decision = 'cancel' THEN
    UPDATE bookings
       SET status = 'cancelled',
           alt_offered_at = NULL
     WHERE id = v_row.id;
    RETURN QUERY SELECT 'ok'::text, v_row.id, v_row.slot_start,
                        v_row.slot_end, v_row.service_id, v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  -- accept: pending → confirmed. The slot is already in the GIST exclusion
  -- (since pending rows are indexed) so no concurrent insert could have
  -- claimed this exact slot. But just in case, the UPDATE itself can't
  -- collide with anything — confirmed rows occupying the same range would
  -- already conflict with this row. So it's safe.
  UPDATE bookings
     SET status = 'confirmed',
         alt_offered_at = NULL
   WHERE id = v_row.id;
  RETURN QUERY SELECT 'ok'::text, v_row.id, v_row.slot_start,
                      v_row.slot_end, v_row.service_id, v_row.full_name, v_row.phone;
END;
$func$;

REVOKE ALL ON FUNCTION customer_confirm_alternative_by_token(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION customer_confirm_alternative_by_token(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION customer_confirm_alternative_by_token(uuid, text) IS
  'Customer-facing accept/cancel for an admin-offered alternative slot. Only acts when status=pending AND alt_offered_at is set. SECURITY DEFINER bypasses RLS for anon callers (token is the auth).';

-- ============================================================================
-- 6. Extend get_booking_by_token to surface alt_offered_at
-- (Manage page needs to distinguish "fresh pending" from "alternative offered"
-- to render the right UI for the customer.)
-- ============================================================================
DROP FUNCTION IF EXISTS get_booking_by_token(uuid);

CREATE OR REPLACE FUNCTION get_booking_by_token(p_token uuid)
RETURNS TABLE (
  booking_id      uuid,
  full_name       text,
  phone           text,
  slot_start      timestamptz,
  slot_end        timestamptz,
  service_id      uuid,
  service_name    text,
  status          text,
  alt_offered_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
  SELECT b.id, b.full_name, b.phone, b.slot_start, b.slot_end,
         b.service_id, s.name, b.status, b.alt_offered_at
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  WHERE b.manage_token = p_token;
$func$;

REVOKE ALL ON FUNCTION get_booking_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_booking_by_token(uuid) TO anon, authenticated;

COMMENT ON FUNCTION get_booking_by_token(uuid) IS
  'Read booking details by opaque token for the customer-facing manage page. Returns zero rows if token unknown. Includes alt_offered_at so the manage page can route between fresh-pending and alternative-offered UI.';
