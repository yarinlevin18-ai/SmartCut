-- Carmelis Studio: Self-service reschedule (Phase 3 v1.1, follow-up to v1 cancel)
-- Created: 2026-04-25
-- See: docs/adr/0003-self-service-cancel.md (D1 — reschedule deferred from v1)

-- ============================================================================
-- 1. Extend notifications.template CHECK to include 'booking_rescheduled'
-- The constraint name is deterministic (no IF NOT EXISTS for CHECK constraints
-- in older Postgres), so drop-then-add idempotently.
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
  CHECK (template IN ('booking_confirmed','booking_cancelled','booking_reminder_24h','booking_rescheduled'));

-- ============================================================================
-- 2. RPC: reschedule_booking_by_token(p_token uuid, p_new_slot_start timestamptz)
--
-- SECURITY DEFINER. Anon callers GRANTed EXECUTE — token is the auth.
--
-- Status codes (returned in `status` column of result row):
--   ok                — rescheduled, new slot stored
--   not_found         — token doesn't match any booking
--   already_cancelled — booking is cancelled, can't reschedule
--   slot_in_past      — original slot already started
--   too_late          — within 24h of original slot (matches cancel cutoff)
--   new_slot_in_past  — new slot is in the past
--   new_slot_too_soon — new slot < now + 24h (symmetric with too_late)
--   invalid_slot      — new slot not on 15-min grid
--   slot_unavailable  — new slot conflicts with another booking (catches 23P01)
-- ============================================================================
CREATE OR REPLACE FUNCTION reschedule_booking_by_token(
  p_token            uuid,
  p_new_slot_start   timestamptz
)
RETURNS TABLE (
  status            text,
  booking_id        uuid,
  old_slot_start    timestamptz,
  new_slot_start    timestamptz,
  new_slot_end      timestamptz,
  service_id        uuid,
  full_name         text,
  phone             text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_row             bookings%ROWTYPE;
  v_duration_min    int;
  v_new_end         timestamptz;
BEGIN
  -- Lookup. If no row, return not_found with NULLs.
  SELECT * INTO v_row FROM bookings WHERE manage_token = p_token;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::timestamptz,
                        NULL::timestamptz, NULL::timestamptz, NULL::uuid,
                        NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_row.status = 'cancelled' THEN
    RETURN QUERY SELECT 'already_cancelled'::text, v_row.id, v_row.slot_start,
                        NULL::timestamptz, NULL::timestamptz, v_row.service_id,
                        v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  IF v_row.slot_start IS NOT NULL AND v_row.slot_start <= now() THEN
    RETURN QUERY SELECT 'slot_in_past'::text, v_row.id, v_row.slot_start,
                        NULL::timestamptz, NULL::timestamptz, v_row.service_id,
                        v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  IF v_row.slot_start IS NOT NULL AND v_row.slot_start - now() < interval '24 hours' THEN
    RETURN QUERY SELECT 'too_late'::text, v_row.id, v_row.slot_start,
                        NULL::timestamptz, NULL::timestamptz, v_row.service_id,
                        v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  -- Validate new slot.
  IF p_new_slot_start IS NULL OR p_new_slot_start <= now() THEN
    RETURN QUERY SELECT 'new_slot_in_past'::text, v_row.id, v_row.slot_start,
                        p_new_slot_start, NULL::timestamptz, v_row.service_id,
                        v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  IF p_new_slot_start - now() < interval '24 hours' THEN
    RETURN QUERY SELECT 'new_slot_too_soon'::text, v_row.id, v_row.slot_start,
                        p_new_slot_start, NULL::timestamptz, v_row.service_id,
                        v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  -- 15-min grid: new_slot_start at (HH:00, HH:15, HH:30, HH:45) and zero seconds/microseconds.
  -- Use EXTRACT EPOCH and check divisibility by 900 seconds.
  IF MOD(EXTRACT(EPOCH FROM p_new_slot_start)::bigint, 900) <> 0 THEN
    RETURN QUERY SELECT 'invalid_slot'::text, v_row.id, v_row.slot_start,
                        p_new_slot_start, NULL::timestamptz, v_row.service_id,
                        v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  -- Compute new_slot_end from service duration.
  SELECT duration_minutes INTO v_duration_min FROM services WHERE id = v_row.service_id;
  IF v_duration_min IS NULL THEN
    -- Service deleted or unset on legacy row — treat as invalid.
    RETURN QUERY SELECT 'invalid_slot'::text, v_row.id, v_row.slot_start,
                        p_new_slot_start, NULL::timestamptz, v_row.service_id,
                        v_row.full_name, v_row.phone;
    RETURN;
  END IF;

  v_new_end := p_new_slot_start + make_interval(mins => v_duration_min);

  -- Atomic UPDATE. The GIST exclusion constraint enforces no overlap with
  -- other non-cancelled bookings; catch 23P01 to map to slot_unavailable.
  BEGIN
    UPDATE bookings
       SET slot_start = p_new_slot_start,
           slot_end   = v_new_end
     WHERE id = v_row.id;
  EXCEPTION WHEN exclusion_violation THEN
    RETURN QUERY SELECT 'slot_unavailable'::text, v_row.id, v_row.slot_start,
                        p_new_slot_start, v_new_end, v_row.service_id,
                        v_row.full_name, v_row.phone;
    RETURN;
  END;

  RETURN QUERY SELECT 'ok'::text, v_row.id, v_row.slot_start,
                      p_new_slot_start, v_new_end, v_row.service_id,
                      v_row.full_name, v_row.phone;
END;
$func$;

REVOKE ALL ON FUNCTION reschedule_booking_by_token(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reschedule_booking_by_token(uuid, timestamptz) TO anon, authenticated;

COMMENT ON FUNCTION reschedule_booking_by_token(uuid, timestamptz) IS
  'Customer-facing reschedule by opaque token. Enforces same 24h cutoff as cancel on both old + new slots. Conflict via GIST exclusion. Returns status code; never throws on business-rule failures.';
