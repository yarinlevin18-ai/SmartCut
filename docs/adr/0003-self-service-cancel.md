# ADR 0003 — Self-service cancel (Phase 3 v1)

**Status:** accepted
**Date:** 2026-04-25
**Depends on:** ADR 0001 (Scheduling), ADR 0002 (Notifications)

## Context

Phase 1 (booking) and Phase 2 (notifications, queued) are live. Customers who book today have no way to cancel without calling. Wix offered a "manage booking" link in its confirmation; we replicated everything else but left this gap.

We need a customer-facing manage page that:
- Lets customers cancel their own booking with no login.
- Cannot be accessed by anyone other than that customer (or someone they share the link with).
- Refuses cancellations that are too close to the slot.
- Updates the queue: enqueues a cancellation notice, marks any pending reminder as `skipped`.

## Decisions

### D1. Cancel-only for v1, reschedule deferred
Reschedule = "show the slot picker again, run conflict checks, atomically swap slot_start/slot_end on the existing booking." It's roughly 2× the work of cancel, and most users who want to reschedule will cancel + rebook anyway. Ship cancel-only now; reschedule lands in v1.1 once we have feedback on cancel adoption.

### D2. Token strategy: opaque UUID per booking
`bookings.manage_token uuid UNIQUE DEFAULT gen_random_uuid()`. The token is the URL parameter (e.g. `/booking/manage/3f1a…`). Looking up the booking is a single equality query.

**Why over HMAC-signed JWT:** simpler, no secret rotation problem, easy to revoke (set NULL), trivially auditable in DB. UUIDv4 has 122 bits of entropy — well past brute-force threshold.

**Why UNIQUE:** prevents token collisions and enforces "one token per booking." DEFAULT covers existing rows on the migration.

### D3. Cancel cutoff: 24h before slot_start
Hardcoded in the RPC. If `slot_start - now() < 24h`, return a "too late" code; UI shows "צור קשר עם המספרה" message. This gives the barber a buffer to rebook the slot and matches Israeli industry norms.

**Why in the RPC, not the route handler:** keeps the rule with the data. A second client (mobile app, admin tool, automation) can call the RPC and gets the same enforcement.

### D4. Cancel via SECURITY DEFINER RPC, not direct UPDATE
`cancel_booking_by_token(p_token uuid)` runs as the owner (bypasses RLS) and returns a structured result `(status text, booking_id uuid, slot_start timestamptz, ...)`. The route handler enforces token validity, the RPC enforces the cutoff and the status flip in one atomic statement.

Result codes (returned in `status` column of the result row):
- `ok` — cancellation succeeded, booking row updated
- `not_found` — token doesn't match any booking
- `already_cancelled` — booking is already cancelled
- `too_late` — within the 24h window
- `slot_in_past` — slot already started

Anon callers get `EXECUTE` on this RPC. They cannot read `bookings` directly (RLS).

### D5. Cancellation notice via existing notifications table
After a successful cancel, the route handler calls `enqueueBookingCancelled(...)` (the existing helper from Phase 2). This:
- Inserts a `booking_cancelled` SMS row, scheduled for now.
- Flips the pending `booking_reminder_24h` row to `status='skipped'`.

The customer sees the cancellation row appear in `/admin/notifications`. The barber gets the same audit trail as admin-initiated cancels.

### D6. Manage URL is in the SMS confirmation body (Phase 2.1, not Phase 3)
Once Inforu is live, the `booking_confirmed` template will append `אפשרות ביטול: https://carmelis.co.il/booking/manage/<token>`. Until then, the admin can copy the link from `/admin/notifications` (we'll show the manage URL on each booking row in the bookings page — small Phase 3.1 polish).

**For Phase 3 itself:** the manage page works given a valid token, regardless of how the customer got the link.

### D7. Manage page is a public route, not a route group
`app/(public)/booking/manage/[token]/page.tsx` — sits inside the existing `(public)` group so it inherits the site shell and styling. No middleware changes needed; the token in the URL is the auth.

## Non-negotiables

- **Token is required** — a missing or malformed token must 404 (not redirect, not error).
- **Constant-time-equivalent lookup.** The RPC uses a uuid `=` comparison; Postgres index lookup is fine here, no need for crypto-grade compare for an opaque-but-not-secret token.
- **No PII in the URL log.** Token is opaque; the booking row holds the PII.
- **Cancel is idempotent within "ok":** repeated calls on a cancelled booking return `already_cancelled`, never `ok` twice.
- **The 24h cutoff lives in SQL.** Do not duplicate the rule in TypeScript — that's how rules drift.
- **Soft-cancel only.** The RPC sets `status='cancelled'`; never deletes. Matches the admin cancel path from Phase 2.

## Open items (deferred, not blocking Phase 3 ship)

- [ ] Reschedule UI (v1.1)
- [ ] "Manage URL" column on `/admin/bookings` rows so admins can hand out links manually
- [ ] Rate-limit on the manage route (token guessing is statistically infeasible but a 4xx on >5 invalid tokens/min from one IP is cheap insurance)
