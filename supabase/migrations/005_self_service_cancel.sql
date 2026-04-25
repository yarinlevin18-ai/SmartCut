-- Carmelis Studio: Self-service cancel (Phase 3, Wix manage-link replacement)
-- Created: 2026-04-25
-- See: docs/adr/0003-self-service-cancel.md

-- ============================================================================
-- COLUMN: bookings.manage_token
-- Opaque UUID per booking; the URL parameter for the customer-facing manage page.
-- DEFAULT covers existing rows so backfill is automatic.
-- UNIQUE prevents collisions and enforces "one token per booking."
-- ============================================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS manage_token UUID NOT NULL DEFAULT gen_random_uuid();

-- UNIQUE as a separate step so re-runs don't fail if the column already exists without it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_manage_token_key' AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_manage_token_key UNIQUE (manage_token);
  END IF;
END $$;

COMMENT ON COLUMN bookings.manage_token IS
  'Opaque UUID for the customer-facing /booking/manage/[token] page. UUIDv4 (122 bits entropy).';

-- ============================================================================
-- RPC: cancel_booking_by_token(p_token uuid)
-- SECURITY DEFINER: runs as the function owner, bypassing RLS so anon callers
-- can cancel their own booking by presenting the token (the token is the auth).
--
-- Result codes (status column):
--   ok                — cancellation succeeded
--   not_found         — token doesn't match any booking
--   already_cancelled — booking is already cancelled (idempotent)
--   too_late          — within the 24h cutoff window
--   slot_in_past      — slot already started
-- ============================================================================
CREATE OR REPLACE FUNCTION cancel_booking_by_token(p_token uuid)
RETURNS TABLE (
  status       text,
  booking_id   uuid,
  slot_start   timestamptz,
  slot_end     timestamptz,
  service_id   uuid,
  full_name    text,
  phone        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_row bookings%ROWTYPE;
BEGIN
  -- Lookup. If no row, return not_found with NULLs.
  SELECT * INTO v_row FROM bookings WHERE manage_token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::timestamptz, NULL::timestamptz,
                        NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Already cancelled (idempotent — repeated calls never return 'ok' twice).
  IF v_row.status = 'cancelled' THEN
    RETURN QUERY SELECT 'already_cancelled'::text, v_row.id, v_row.slot_start, v_row.slot_end,
                        v_row.service_id, v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  -- Slot in the past — nothing to cancel.
  IF v_row.slot_start IS NOT NULL AND v_row.slot_start <= now() THEN
    RETURN QUERY SELECT 'slot_in_past'::text, v_row.id, v_row.slot_start, v_row.slot_end,
                        v_row.service_id, v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  -- 24h cutoff. Rule lives in SQL so any client (web, mobile, automation) gets the same enforcement.
  IF v_row.slot_start IS NOT NULL AND v_row.slot_start - now() < interval '24 hours' THEN
    RETURN QUERY SELECT 'too_late'::text, v_row.id, v_row.slot_start, v_row.slot_end,
                        v_row.service_id, v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  -- Soft-cancel. Status flip is the cancellation; the row is preserved for audit.
  UPDATE bookings SET status = 'cancelled' WHERE id = v_row.id;

  RETURN QUERY SELECT 'ok'::text, v_row.id, v_row.slot_start, v_row.slot_end,
                      v_row.service_id, v_row.full_name, v_row.phone;
END;
$func$;

-- Anon callers get EXECUTE on this RPC. They cannot read bookings directly (RLS).
REVOKE ALL ON FUNCTION cancel_booking_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_booking_by_token(uuid) TO anon, authenticated;

COMMENT ON FUNCTION cancel_booking_by_token(uuid) IS
  'Customer-facing cancel by opaque token. Enforces 24h cutoff in SQL. Returns status code; never throws on business-rule failures.';

-- ============================================================================
-- RPC: get_booking_by_token(p_token uuid)
-- Read-only sibling so the manage page can render booking details (anon cannot
-- SELECT bookings directly under RLS). SECURITY DEFINER bypasses RLS the same way
-- cancel does. Returns one row or zero rows; the route handler 404s on zero.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_booking_by_token(p_token uuid)
RETURNS TABLE (
  booking_id   uuid,
  full_name    text,
  phone        text,
  slot_start   timestamptz,
  slot_end     timestamptz,
  service_id   uuid,
  service_name text,
  status       text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
  SELECT b.id, b.full_name, b.phone, b.slot_start, b.slot_end,
         b.service_id, s.name, b.status
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  WHERE b.manage_token = p_token;
$func$;

REVOKE ALL ON FUNCTION get_booking_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_booking_by_token(uuid) TO anon, authenticated;

COMMENT ON FUNCTION get_booking_by_token(uuid) IS
  'Read booking details by opaque token for the customer-facing manage page. Returns zero rows if token unknown.';
