# ADR 0001 — In-app slot-based scheduling (Wix replacement, no payment)

**Status:** Accepted · **Date:** 2026-04-25

## Context

Currently `/booking` collects name, phone, service, free-text date + time, then redirects to Wix Bookings. Goal: replace Wix as the booking system (availability, slot reservation, notifications, self-service reschedule/cancel, calendar sync) while leaving payment out of scope. Single barber, Israel, Asia/Jerusalem, Hebrew RTL.

## Decisions

### 1. Slot config storage — two dedicated tables

`availability_config` (weekday 0–6, open_time, close_time, break_start, break_end) + `blocked_dates` (date PK, reason). Rejected JSON-in-site_content: every read would require parsing, no constraint checks, concurrent-edit hazard, and `getAvailableSlots` needs indexable lookups.

### 2. Timezone — `timestamptz` + date-fns-tz + locked `Asia/Jerusalem`

`bookings.slot_start timestamptz` (UTC on disk). All user-facing rendering goes through `formatInTimeZone(value, "Asia/Jerusalem", fmt)`. Rejected `timestamp` + separate tz column — duplicates state, DST bugs inevitable. Rejected Luxon (heavier) and @internationalized/date (for React Aria pickers we don't have).

### 3. Slot granularity — 15 minutes

All current durations (30/30/45/60) align; keeps room for future 20/45-min variants. Enforced by `CHECK (duration_minutes % 15 = 0)` on `services`.

### 4. Calendar + time picker — react-day-picker v9 + custom Framer time grid

v9 has first-class RTL + Hebrew locale via `date-fns/locale/he`. Time slots are a simple Button grid — no dedicated time-picker lib. Rejected shadcn/ui Calendar: drags in Radix + CVA + tailwind-merge, which this project deliberately avoids (hand-rolled `components/ui/*`).

### 5. Conflict prevention — Postgres exclusion constraint

```sql
EXCLUDE USING gist (
  barber_id WITH =,
  tstzrange(slot_start, slot_end) WITH &&
) WHERE (status <> 'cancelled')
```

Declarative, enforced regardless of client (server action, admin panel, SQL console), and handles overlap — a 60-min Luxury overlapping a 30-min Classic starting 15 min later, which a plain `UNIQUE (slot_start)` would miss. Server actions catch `23P01` (exclusion violation) and show "slot just taken." Rejected advisory locks (app-layer only).

### 6. Public slot availability — `SECURITY DEFINER` RPC

Anon `.from('bookings').select('slot_start')` would leak PII-linkable booking metadata. Instead: `get_available_slots(service_id uuid, date date) RETURNS SETOF timestamptz` as `SECURITY DEFINER`, returning only free slot starts. `bookings` stays admin-read-only.

### 7. Status column + cancellation flow

Add `bookings.status` with values `confirmed | cancelled | completed | no_show`. Exclusion constraint filters `WHERE status <> 'cancelled'` so cancelling frees the slot.

## Non-negotiables

- **Never** wrap `get_available_slots` in `unstable_cache` — two users would see the same "free" slot for up to an hour.
- **Never** compute slot iteration via `new Date(ms + 86400000)` — use tz-aware `addDays`/`addMinutes` from date-fns-tz or DST days produce missing/duplicate slots.
- **Never** strip timezone offsets for display — always `formatInTimeZone`.
- Normalize phone to E.164 (`+972...`) on write.
- `CHECK (slot_start > now() - interval '1 day')` to bound the exclusion index.

## Known deferred items

- Shabbat/holiday recurring blocks (`recurring_blocks` table) — manual for now, revisit after Phase 1 ships.
- Post-appointment cleanup buffer (add `buffer_minutes` to services) — defer.
- `bookings.email` currently `NOT NULL` but form never collects it (stored as `""`). Fix in Phase 1 migration: either drop NOT NULL or add email field to form.
- Phase 1 introduces `bookings.barber_id` (single-barber for now, nullable FK to a `staff` table added later).

## Phases (tracked in session todos)

1. Availability + slot picker (this ADR's scope)
2. Notifications (Resend + Israeli SMS)
3. Self-service cancel/reschedule via signed token
4. Calendar sync via .ics feed
