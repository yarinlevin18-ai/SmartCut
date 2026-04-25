# קרמליס סטודיו — Carmelis Studio

Next.js 14 website + admin dashboard for a premium men's shaving & grooming studio in Israel. Replaces Wix Bookings with a self-hosted slot-based booking system, an approval workflow, customer self-service cancel/reschedule, an iCal feed, and SMS notifications. Hebrew-first, RTL, dark theme.

**Stack:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind · Supabase (Postgres + Auth + Storage) · Framer Motion · React Hook Form + Zod · date-fns-tz · react-day-picker v9

## Quick Start

### 1. Environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with real values. The full set of required env vars is documented inside `.env.local.example` — TL;DR:

| Var | What |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same place |
| `SUPABASE_SERVICE_ROLE_KEY` | Same place — **server-only**, never expose |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` for dev, `https://carmelis.co.il` for prod |
| `BARBER_CALENDAR_TOKEN` | Random UUID for the public iCal feed |
| `NOTIFICATIONS_WORKER_SECRET` | Random string for the SMS worker endpoint |
| `INFORU_USERNAME` / `INFORU_API_TOKEN` / `INFORU_SENDER` | After Inforu signup + sender-ID approval |

### 2. Install

```bash
npm ci
```

### 3. Supabase setup (one-time)

In the Supabase SQL editor, run **all migrations in order**:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_storage.sql
supabase/migrations/003_scheduling.sql
supabase/migrations/004_notifications.sql
supabase/migrations/005_self_service_cancel.sql
supabase/migrations/006_self_service_reschedule.sql
supabase/migrations/007_approval_workflow.sql
supabase/migrations/008_products.sql
```

Each is idempotent — re-running them is safe. Then:

1. **Storage** → public bucket `gallery` (or run `002_storage.sql`). The `products` bucket is created by `008_products.sql`.
2. **Auth** → enable Email/Password, create an admin user.
3. Optional: `supabase/seed.sql` for demo services + content.

### 4. Run

```bash
npm run dev         # http://localhost:3001  (or 3003 via .claude/launch.json)
npm run build       # production build
npm run lint        # ESLint
./node_modules/.bin/tsc --noEmit    # type check (strict)
```

### 5. Admin

`/admin/login` — sign in with the admin user. Sidebar tabs:

- **סקירה** — dashboard overview
- **שירותים** — services CRUD
- **מוצרים** — products CRUD (catalog with image upload + reorder)
- **תוכן אתר** — site content
- **גלריה** — gallery photos
- **זמינות** — weekly schedule + blocked dates
- **תורים** — bookings list with approve / deny / offer-alternative flow
- **התראות** — notifications queue (manual fallback while Inforu is offline)

## Project Structure

```
app/
  (public)/                            Customer-facing
    page.tsx                           Homepage
    services/                          Services listing
    products/                          Products listing                 (Phase 6)
    gallery/                           Gallery
    booking/                           Booking form
    booking/manage/[token]/            Customer self-service             (Phase 3)
    template.tsx                       Page transition wrapper
  (admin)/
    admin/
      login/                           Admin login
      page.tsx                         Dashboard home
      services/                        Services CRUD
      products/                        Products CRUD                    (Phase 6)
      content/                         Site content
      gallery/                         Gallery upload/delete
      availability/                    Weekly schedule + blocked dates
      bookings/                        Approve / deny / cancel / reschedule
      notifications/                   Queue viewer + manual fallback   (Phase 2)
    layout.tsx                         Admin shell (AdminSidebar)
  api/
    calendar/[barberToken]/            iCalendar feed                    (Phase 4)
    notifications/run/                 SMS worker drain endpoint         (Phase 2)
    admin/revalidate/                  Cache revalidation hook
  layout.tsx                           Root layout (RTL, fonts, DustLayer)
  globals.css

components/
  ui/                                  Button, Card, Input, LogoImage, Modal, SectionDivider
  layout/                              Navbar, Footer, AdminSidebar, HomePageClient
  sections/                            Hero, ServicesPreview, ProductsPreview, GalleryPreview, Reviews, CTASection, *PageClient
  booking/                             SlotPicker (shared between booking + manage page reschedule)
  effects/                             DustLayer (ambient particles)
  legal/                               CookieConsent + helpers
  providers/                           AnimationProvider, …

lib/
  actions.ts                           All server actions
  supabase.ts                          createClient (SSR), createAnonClient, createServerAdmin
  supabase-browser.ts                  Browser client
  notifications.ts                     Enqueue helpers (pending/approved/denied/cancelled/rescheduled/alt-offered)
  rate-limit.ts                        In-memory token bucket            (Phase 3.2)
  ics.ts                               RFC 5545 writer                   (Phase 4)
  sms/
    templates.ts                       Hebrew SMS body renderer
    inforu.ts                          Inforu v2 SMS adapter
    worker.ts                          Queue claim + send loop

supabase/
  migrations/001..008                  Schema, RLS, RPCs, storage buckets

scripts/
  smoke-*.mjs                          Per-phase end-to-end smoke tests
  audit-*.mjs                          Security/timezone regression scripts
  apply-migration.mjs                  Generic local migration runner

middleware.ts                          Admin auth + rate limit dispatch
vercel.json                            Cron + security headers
```

## Design System

- **Colors**: `#0d0d0d` (dark bg), `#0a0a0a` (cards), `#c9a84c` (gold accent), `#e2c97e` (gold light), `#f0f0ec` (text), `#7a7a80` (muted)
- **Typography**: DM Serif Display (display) + Heebo (body/Hebrew) + Montserrat (labels)
- **Direction**: RTL (`<html lang="he" dir="rtl">`)
- **Theme**: dark only

## Smoke tests

Each phase has an end-to-end smoke that exercises the real DB / live API. Run after any change to that phase:

```bash
node scripts/audit-rls.mjs                    # RLS regression check (Phase 1)
node scripts/audit-timezone.mjs               # DST / TZ behaviour
node scripts/smoke-slots.mjs                  # get_available_slots RPC
node scripts/smoke-conflict.mjs               # GIST exclusion + status flips
node scripts/smoke-notifications.mjs          # Phase 2 enqueue + worker claim
node scripts/smoke-self-service-cancel.mjs    # Phase 3 cancel-by-token RPC
node scripts/smoke-reschedule.mjs             # Phase 3 v1.1 reschedule RPC
node scripts/smoke-rate-limit.mjs             # Phase 3.2 (needs dev server)
node scripts/smoke-calendar-feed.mjs          # Phase 4 iCal contract (needs dev server)
node scripts/smoke-inforu-contract.mjs        # Inforu adapter contract (no creds needed)
node scripts/smoke-self-service-cancel.mjs    # Phase 3 cancel
node scripts/smoke-approval.mjs               # Phase 5 approval workflow
node scripts/smoke-products.mjs               # Phase 6 products RLS + CRUD

# Or all at once:
node scripts/smoke-all.mjs
```

## Security

- RLS enabled on every table. See each migration for the policies.
- `bookings`: anon INSERT (with status='pending'); authenticated full CRUD via service-role server actions.
- `services`, `gallery`, `site_content`, `availability_config`, `blocked_dates`: public SELECT, authenticated writes.
- `products`: anon SELECT only `is_active=true`; authenticated full CRUD.
- `notifications`: authenticated SELECT/UPDATE; inserts via service role only.
- Token-gated public RPCs (`cancel_booking_by_token`, `reschedule_booking_by_token`, `get_booking_by_token`, `customer_confirm_alternative_by_token`) are SECURITY DEFINER with `SET search_path = public, pg_temp` to block schema-hopping attacks.
- Self-service manage URL is rate-limited at 30 req/min/IP via Edge middleware (Phase 3.2).
- iCal feed is gated by an opaque UUID env var.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never import it from a client component.
- `.env.local` and `.env*.local` are gitignored.

## Deployment (Vercel)

### Pre-deploy checklist

```bash
./node_modules/.bin/tsc --noEmit    # 0 errors
npm run lint                        # 0 warnings
npm run build                       # exit 0
```

### Steps

1. Push to `master`.
2. Vercel → New Project → import the repo.
3. Set env vars (Project Settings → Environment Variables) — copy the full list from `.env.local.example`. **Generate fresh values** for `BARBER_CALENDAR_TOKEN` and `NOTIFICATIONS_WORKER_SECRET` — do NOT reuse dev values.
4. `vercel.json` already configures:
   - `* * * * *` cron hitting `/api/notifications/run` to drain the SMS queue every minute (uses `CRON_SECRET` automatically — set this env var to a random string).
   - Security headers (HSTS, frame-ancestors, referrer-policy).
   - Cache-Control on the calendar feed.
5. Add domain in Project Settings → Domains. DNS: `A` to `76.76.21.21` or `CNAME` to `cname.vercel-dns.com`.
6. After deploy: subscribe the barber's Google Calendar to `https://carmelis.co.il/api/calendar/<BARBER_CALENDAR_TOKEN>` (Other calendars → Add by URL).

### Inforu SMS provider (Phase 2)

The notifications queue is fully functional without Inforu — bodies render in `/admin/notifications` with copy buttons for manual handoff via WhatsApp. To go automatic:

1. Sign up at inforu.co.il. Submit sender ID for approval (2-5 day lead).
2. Allowlist your Vercel egress IPs in the Inforu portal (without this, sends fail with `StatusId:-2` "illegal IP address" even with valid creds).
3. Set `INFORU_USERNAME`, `INFORU_API_TOKEN`, `INFORU_SENDER` in Vercel.
4. Verify with `node scripts/smoke-inforu-contract.mjs` (no creds needed — probes the real Inforu API to make sure the contract still matches).
5. The cron will start draining the queue automatically.

## Troubleshooting

- **"Missing Supabase environment variables"** — create `.env.local` from the example and restart dev.
- **"new row violates row-level security policy for table 'bookings'"** — `createBooking` uses service-role; if you see this, check the action is using `createServerAdmin()` (not the SSR `createClient()`).
- **`useContext` server error after editing components** — kill dev, `rm -rf .next`, restart. Stale chunks from rapid HMR.
- **RTL layout glitches** — confirm `<html dir="rtl" lang="he">` in `app/layout.tsx`.
- **Inforu 401 "illegal IP address"** — IP allowlisting in the Inforu portal, not creds.

## External Integrations

- **Inforu** (SMS): https://inforu.co.il — adapter at `lib/sms/inforu.ts`
- **Supabase** (DB + auth + storage): https://supabase.com
- **Instagram**: https://www.instagram.com/carmelis_studio
- **BitPay**: https://www.bitpay.co.il

## License & Ownership

The application — source code, architecture, technical design — is the property of **Yarin Levin**. © 2026 Yarin Levin. All rights reserved. Marketing content (logo, photography, brand copy) belongs to Carmelis Studio. See `/terms` for the full notice.

See `CLAUDE.md` for detailed architecture notes, coding conventions, and per-phase design decisions.
