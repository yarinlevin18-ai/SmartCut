-- Carmelis Studio: Notifications (Phase 2 — email + SMS audit trail)
-- Created: 2026-04-25

-- ============================================================================
-- TABLE: notifications (one row per outbound message attempt)
-- ============================================================================
-- Every email/SMS we attempt gets a row here, even before the provider returns.
-- Status transitions: queued -> sent | failed | skipped. Workers/edge functions
-- pick up queued rows (ORDER BY created_at LIMIT N FOR UPDATE SKIP LOCKED).
CREATE TABLE IF NOT EXISTS notifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id           UUID NULL REFERENCES bookings(id) ON DELETE SET NULL,
  channel              TEXT NOT NULL CHECK (channel IN ('sms')),
  template             TEXT NOT NULL CHECK (template IN ('booking_confirmed','booking_cancelled','booking_reminder_24h')),
  recipient            TEXT NOT NULL,                 -- email address or E.164 phone
  locale               TEXT NOT NULL DEFAULT 'he' CHECK (locale IN ('he','en')),
  status               TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','skipped')),
  attempts             SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  provider             TEXT NULL,                     -- e.g. 'resend', 'inforu', '019mobile'
  provider_message_id  TEXT NULL,                     -- set once provider accepts
  error                TEXT NULL,                     -- last error message if failed
  payload              JSONB NOT NULL DEFAULT '{}'::jsonb, -- template variables (customer_name, slot_start_local, service_name, etc.)
  scheduled_for        TIMESTAMPTZ NOT NULL DEFAULT now(), -- reminders are queued early with a future scheduled_for
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at              TIMESTAMPTZ NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE notifications IS 'Audit trail of every outbound customer notification (email/SMS). Source of truth for send status and retries.';
COMMENT ON COLUMN notifications.scheduled_for IS 'Worker only picks up queued rows where scheduled_for <= now(). Confirmations use now(); reminders use slot_start - 24h.';
COMMENT ON COLUMN notifications.payload IS 'Template variables snapshotted at enqueue time. Keeps the message reproducible even if the booking is later edited.';

-- Worker claim index (ORDER BY scheduled_for, FOR UPDATE SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_notifications_worker
  ON notifications (scheduled_for)
  WHERE status = 'queued';

-- Admin UI lookups
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications (booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS notifications_set_updated_at ON notifications;
CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- RLS: admins read/write, server writes via service role (bypasses RLS)
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_authenticated_select" ON notifications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "notifications_authenticated_update" ON notifications
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- No anon policies: customers never touch this table. No INSERT policies: inserts
-- happen server-side via the service role key (bypasses RLS) inside createBooking
-- and the admin cancel action.

-- ============================================================================
-- NOTE: pg_cron + worker scheduling
-- ============================================================================
-- The worker (Supabase Edge Function) is deployed separately. Once deployed,
-- schedule it via `cron.schedule` OR via Supabase's built-in Scheduled Functions
-- UI. Do NOT enable pg_cron here — we want the worker codepath stable and
-- tested end-to-end before we wire the trigger. See docs/adr/0002-notifications.md.
