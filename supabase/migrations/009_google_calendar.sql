-- Carmelis Studio: Google Calendar integration (Phase 7).
-- Created: 2026-04-25
-- Stores the studio owner's OAuth refresh token + tracks the Google event id
-- for each booking so we can update/delete the right event when the booking
-- changes.

-- ============================================================================
-- 1. oauth_tokens table — credentials for connected providers
-- ============================================================================
-- Single-row-per-provider for now (one barber). The provider column lets us
-- add other integrations later without a new table.
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL UNIQUE,
  account_email   TEXT,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  scope           TEXT,
  -- Future-proof: lets the barber pick a non-primary calendar later via UI.
  calendar_id     TEXT NOT NULL DEFAULT 'primary',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS oauth_tokens_set_updated_at ON oauth_tokens;
CREATE TRIGGER oauth_tokens_set_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE oauth_tokens IS
  'Per-provider OAuth credentials. Refresh tokens are credentials — never expose to anon clients.';
COMMENT ON COLUMN oauth_tokens.provider IS
  'Provider key. Currently only "google_calendar".';
COMMENT ON COLUMN oauth_tokens.calendar_id IS
  'Google calendar id to create events in. Defaults to "primary" — the connected account''s primary calendar.';

-- ============================================================================
-- 2. RLS — credentials NEVER leak to anon. Authenticated read/write only.
-- ============================================================================
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oauth_tokens_authenticated_select" ON oauth_tokens;
CREATE POLICY "oauth_tokens_authenticated_select" ON oauth_tokens
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "oauth_tokens_authenticated_insert" ON oauth_tokens;
CREATE POLICY "oauth_tokens_authenticated_insert" ON oauth_tokens
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "oauth_tokens_authenticated_update" ON oauth_tokens;
CREATE POLICY "oauth_tokens_authenticated_update" ON oauth_tokens
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "oauth_tokens_authenticated_delete" ON oauth_tokens;
CREATE POLICY "oauth_tokens_authenticated_delete" ON oauth_tokens
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- 3. bookings.gcal_event_id — the Google Calendar event mirror
-- NULL means: this booking has no Google event yet (e.g. pending, or created
-- before Google Calendar was connected). When admin approves, the action
-- creates a Google event and stores its id here.
-- ============================================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS gcal_event_id TEXT NULL;

COMMENT ON COLUMN bookings.gcal_event_id IS
  'Google Calendar event id for this booking. NULL when no Google event exists (pending, denied, or created before integration was connected).';
