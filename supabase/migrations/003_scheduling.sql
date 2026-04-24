-- Carmelis Studio: Slot-based scheduling (Phase 1, Wix Bookings replacement)
-- Created: 2026-04-25
-- See: docs/adr/0001-scheduling.md, project_smartcut_scheduling.md

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- btree_gist lets the bookings exclusion constraint mix uuid (=) with tstzrange (&&).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- SHARED: updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$func$;

-- ============================================================================
-- TABLE: availability_config (weekly opening hours per barber/weekday)
-- ============================================================================
CREATE TABLE IF NOT EXISTS availability_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id   UUID NULL,                          -- forward-compat; no FK yet
  weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sun (matches JS Date.getDay)
  open_time   TIME NOT NULL,
  close_time  TIME NOT NULL CHECK (close_time > open_time),
  break_start TIME NULL,
  break_end   TIME NULL,
  is_closed   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_config_break_pair_chk CHECK (
    (break_start IS NULL AND break_end IS NULL)
    OR (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
  )
);

-- One config row per (barber, weekday). NULLs in unique indexes are distinct in Postgres,
-- so use COALESCE to a sentinel uuid to enforce uniqueness for the single-barber (NULL) case.
CREATE UNIQUE INDEX IF NOT EXISTS availability_config_barber_weekday_uidx
  ON availability_config (COALESCE(barber_id, '00000000-0000-0000-0000-000000000000'::uuid), weekday);

DROP TRIGGER IF EXISTS availability_config_set_updated_at ON availability_config;
CREATE TRIGGER availability_config_set_updated_at
  BEFORE UPDATE ON availability_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE availability_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_config_public_select" ON availability_config
  FOR SELECT USING (true);

CREATE POLICY "availability_config_authenticated_insert" ON availability_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "availability_config_authenticated_update" ON availability_config
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "availability_config_authenticated_delete" ON availability_config
  FOR DELETE USING (auth.role() = 'authenticated');

-- Seed: single barber (barber_id NULL). Sun-Thu 09-19 with 13-14 break, Fri 09-14 no break, Sat closed.
INSERT INTO availability_config (barber_id, weekday, open_time, close_time, break_start, break_end, is_closed) VALUES
  (NULL, 0, '09:00', '19:00', '13:00', '14:00', false),  -- Sunday
  (NULL, 1, '09:00', '19:00', '13:00', '14:00', false),  -- Monday
  (NULL, 2, '09:00', '19:00', '13:00', '14:00', false),  -- Tuesday
  (NULL, 3, '09:00', '19:00', '13:00', '14:00', false),  -- Wednesday
  (NULL, 4, '09:00', '19:00', '13:00', '14:00', false),  -- Thursday
  (NULL, 5, '09:00', '14:00', NULL,    NULL,    false),  -- Friday
  (NULL, 6, '09:00', '19:00', NULL,    NULL,    true)    -- Saturday (closed; times are placeholders)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TABLE: blocked_dates (one-off closures: holidays, sick days)
-- ============================================================================
CREATE TABLE IF NOT EXISTS blocked_dates (
  date       DATE PRIMARY KEY,
  reason     TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_dates_public_select" ON blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "blocked_dates_authenticated_insert" ON blocked_dates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "blocked_dates_authenticated_update" ON blocked_dates
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "blocked_dates_authenticated_delete" ON blocked_dates
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- ALTER: services -- enforce 15-min grid alignment for slot generation
-- ============================================================================
ALTER TABLE services
  ADD CONSTRAINT services_duration_15min_grid_chk
  CHECK (duration_minutes IS NULL OR duration_minutes % 15 = 0);

-- ============================================================================
-- ALTER: bookings -- add slot fields, status, barber, drop email NOT NULL
-- ============================================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS slot_start TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS slot_end   TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS barber_id  UUID NULL;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_chk
  CHECK (status IN ('confirmed','cancelled','completed','no_show'));

ALTER TABLE bookings ALTER COLUMN email DROP NOT NULL;

-- Bound the exclusion index range: reject ancient slot_start values entirely.
ALTER TABLE bookings
  ADD CONSTRAINT bookings_slot_recent_chk
  CHECK (slot_start IS NULL OR slot_start > now() - interval '1 day');

ALTER TABLE bookings
  ADD CONSTRAINT bookings_slot_order_chk
  CHECK (slot_end IS NULL OR slot_end > slot_start);

-- Prevent overlapping bookings per barber. COALESCE because GIST '=' needs a concrete value
-- (NULL barber_id collapses to a sentinel uuid for the single-barber case).
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    (COALESCE(barber_id, '00000000-0000-0000-0000-000000000000'::uuid)) WITH =,
    tstzrange(slot_start, slot_end, '[)') WITH &&
  ) WHERE (status <> 'cancelled' AND slot_start IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_bookings_slot_start ON bookings(slot_start);

COMMENT ON COLUMN bookings.slot_start IS 'Booking start (timestamptz). NULL for legacy free-text rows; required for new slot-based bookings.';
COMMENT ON COLUMN bookings.slot_end   IS 'Booking end (timestamptz). slot_start + service.duration_minutes.';
COMMENT ON COLUMN bookings.status     IS 'confirmed|cancelled|completed|no_show. Only non-cancelled rows participate in overlap exclusion.';
COMMENT ON COLUMN bookings.barber_id  IS 'Forward-compat for multi-barber. NULL = single-barber default.';
-- NOTE: legacy rows (preferred_date / preferred_time text) are left as-is. They are historical
-- and will not be migrated to slot_start / slot_end.

-- ============================================================================
-- RPC: get_available_slots(service_id, date) -> setof timestamptz
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_slots(p_service_id uuid, p_date date)
RETURNS TABLE (slot_start timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_duration_min  integer;
  v_weekday       smallint;
  v_cfg           availability_config%ROWTYPE;
  v_tz            constant text := 'Asia/Jerusalem';
  v_cursor        time;
  v_step          constant interval := interval '15 minutes';
  v_slot_start_tz timestamptz;
  v_slot_end_tz   timestamptz;
  v_last_start    time;
BEGIN
  -- 1. Service duration
  SELECT duration_minutes INTO v_duration_min FROM services WHERE id = p_service_id;
  IF v_duration_min IS NULL THEN
    RETURN;
  END IF;

  -- 2. Weekday (0=Sun, matches JS getDay)
  v_weekday := EXTRACT(DOW FROM p_date)::smallint;

  -- 3. Blocked date short-circuit
  IF EXISTS (SELECT 1 FROM blocked_dates WHERE date = p_date) THEN
    RETURN;
  END IF;

  -- 4. Weekly config (single-barber: barber_id IS NULL)
  SELECT * INTO v_cfg
  FROM availability_config
  WHERE weekday = v_weekday AND barber_id IS NULL
  LIMIT 1;

  IF NOT FOUND OR v_cfg.is_closed THEN
    RETURN;
  END IF;

  -- Last legal start time so the slot fits before close.
  v_last_start := v_cfg.close_time - make_interval(mins => v_duration_min);
  v_cursor := v_cfg.open_time;

  WHILE v_cursor <= v_last_start LOOP
    -- Skip slots whose [start, start+duration) overlaps the break window.
    IF v_cfg.break_start IS NOT NULL
       AND v_cursor < v_cfg.break_end
       AND (v_cursor + make_interval(mins => v_duration_min)) > v_cfg.break_start
    THEN
      v_cursor := v_cursor + v_step;
      CONTINUE;
    END IF;

    -- Local wall-clock -> timestamptz in Asia/Jerusalem.
    v_slot_start_tz := (p_date + v_cursor) AT TIME ZONE v_tz;
    v_slot_end_tz   := v_slot_start_tz + make_interval(mins => v_duration_min);

    -- Past slots are not bookable.
    IF v_slot_start_tz <= now() THEN
      v_cursor := v_cursor + v_step;
      CONTINUE;
    END IF;

    -- Skip if any non-cancelled booking on the same barber lane overlaps.
    IF NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.status <> 'cancelled'
        AND b.slot_start IS NOT NULL
        AND b.slot_end IS NOT NULL
        AND b.barber_id IS NOT DISTINCT FROM NULL  -- single-barber lane
        AND tstzrange(b.slot_start, b.slot_end, '[)') && tstzrange(v_slot_start_tz, v_slot_end_tz, '[)')
    ) THEN
      slot_start := v_slot_start_tz;
      RETURN NEXT;
    END IF;

    v_cursor := v_cursor + v_step;
  END LOOP;

  RETURN;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_available_slots(uuid, date) TO anon, authenticated;
