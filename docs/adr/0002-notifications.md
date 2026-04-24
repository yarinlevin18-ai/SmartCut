# ADR 0002 — Notifications (email + SMS)

**Status:** accepted
**Date:** 2026-04-25
**Supersedes:** —
**Depends on:** ADR 0001 (Scheduling)

## Context

Phase 1 landed a slot-based booking system. Customers submit a booking and get a silent database insert — no confirmation, no reminder, no cancellation notice. Wix handled all of this before and we ripped it out.

Requirements:
- **Confirmation** on successful `createBooking` (email + SMS).
- **24h reminder** before `slot_start` (email + SMS).
- **Cancellation notice** when an admin cancels a booking (email + SMS).
- **Hebrew-first** templates; English fallback later.
- **Auditable**: every send attempt logged, retryable, visible to admins.
- **Resilient**: a flaky provider does not break booking creation.

## Decisions

### D1. One audit table, one queue
`notifications` is both the outbox and the audit log. Every outbound message gets a row at enqueue time with `status='queued'`. A worker flips it to `sent`/`failed`/`skipped`. This gives us retries, observability, and a clean admin UI for free.

**Why:** We want booking creation to never block on SMTP/SMS. Enqueue is a local DB insert; the provider call happens out-of-band.

### D2. Split transport from trigger
- **Trigger** (server action): validates + writes `notifications` rows. Lives in `lib/actions.ts`. Uses service role to bypass RLS.
- **Worker** (Supabase Edge Function `notifications-send`): claims `queued` rows (`FOR UPDATE SKIP LOCKED`), calls the provider, updates status. Schedulable.

**Why:** Decouples user-facing latency from provider latency. Also lets us retry failed sends without re-running the trigger.

### D3. Providers
- **Email:** Resend (`resend` npm package). 3k/month free tier, simple API, good deliverability, Hebrew RTL-safe HTML bodies.
- **SMS:** Inforu (Israeli provider, ~0.08₪/SMS, Hebrew support, requires sender-ID approval). Adapter is isolated behind an `SmsProvider` interface so we can swap to 019mobile or Twilio without touching trigger code.

### D4. Template variables snapshotted at enqueue
`notifications.payload` (JSONB) captures `customer_name`, `slot_start_local`, `service_name`, `duration_minutes`, `shop_phone`, `shop_address`, `manage_url` at enqueue time. The worker reads the payload, not the current `bookings` row.

**Why:** Reproducibility. If an admin edits the booking at 11:30 and the reminder fires at 12:00, the reminder still reflects what the customer originally received.

### D5. Reminders queued at booking time, not at cron time
When `createBooking` succeeds, we immediately enqueue three rows:
- confirmation email + SMS, `scheduled_for = now()`
- reminder email + SMS, `scheduled_for = slot_start - 24h`

The worker polls `WHERE status='queued' AND scheduled_for <= now()`. No separate reminder scheduler needed; no pg_cron trigger that has to "discover" upcoming bookings.

**Why:** One control surface. Cancellations can set `status='skipped'` on the reminder before it fires.

### D6. Cancellation is a soft cancel
`deleteBooking` (hard delete) becomes `cancelBooking` (sets `status='cancelled'`, enqueues cancellation notice, marks any pending reminder as `skipped`). Hard delete moves to an admin-only "purge" action (not built yet).

**Why:** Audit trail + exclusion constraint already ignores cancelled rows. Deleting the booking also nulls the FK on the notifications table via `ON DELETE SET NULL` — we lose the link. Soft cancel preserves it.

### D7. No retries on validation errors
If the customer's email is malformed or phone isn't E.164, the worker marks that channel `skipped` with a descriptive error and does not retry. The other channel still sends. `attempts` is capped at 5 for transient failures.

## Non-negotiables

- **Booking creation never blocks on the provider.** If enqueue fails, log it, but still return success to the customer (the booking itself is valid).
- **No PII in logs.** Phone numbers and emails stay in the `notifications` row; never `console.log` them.
- **Service-role only.** Server actions use the service role client to insert. Anon can never read or write `notifications`.
- **Provider adapters are pure functions:** `(recipient, subject, body) => Promise<{ok, providerMessageId?, error?}>`. No side effects outside the provider SDK.
- **Israeli phone normalization stays at ingest** (already in Phase 1). The worker trusts `recipient` to be E.164.

## Open questions (resolved before Phase 2 ships)

- [ ] SMS sender-ID approval: which display name? (blocks Inforu signup)
- [ ] Reminder wording — do we include the manage-cancel link or defer that to Phase 3?
- [ ] Worker schedule — Supabase Scheduled Function every 60s, or pg_cron? (default: Scheduled Function.)
