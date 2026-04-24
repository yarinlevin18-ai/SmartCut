# קרמליס סטודיו — Carmelis Studio

Next.js 14 website + admin dashboard for a premium men's shaving & grooming studio in Israel. Hebrew-first, RTL, dark theme.

**Stack:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind · Supabase (Postgres + Auth + Storage) · Framer Motion · React Hook Form + Zod

## Quick Start

### 1. Environment

```bash
cp .env.local.example .env.local
```

Then fill in your Supabase credentials in `.env.local` (Supabase Dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### 2. Install

```bash
npm ci
```

### 3. Supabase setup (one-time)

1. Create a project at https://supabase.com.
2. In the SQL Editor, run `supabase/migrations/001_initial_schema.sql` (tables + RLS policies).
3. Then run `supabase/migrations/002_storage.sql` (storage notes — the bucket itself is created in the next step).
4. **Storage** → create a public bucket named `gallery`.
5. **Authentication** → enable Email/Password, then create an admin user.
6. Optional: run `supabase/seed.sql` to populate demo services and content.

### 4. Run

```bash
npm run dev         # http://localhost:3000
npm run build       # production build
npm run start       # serve production build
npm run lint        # ESLint
npx tsc --noEmit    # type check (strict)
```

### 5. Admin dashboard

http://localhost:3000/admin/login — sign in with the admin user you created in Supabase.

## Project Structure

```
app/
  (public)/                         Customer-facing
    page.tsx                        Homepage (no navbar, full-viewport hero)
    services/page.tsx               Services listing
    gallery/page.tsx                Gallery
    booking/page.tsx                Booking form (saves + redirects to Wix)
    template.tsx                    Page transition wrapper
  (admin)/
    admin/
      login/page.tsx                Admin login
      page.tsx                      Dashboard home
      services/page.tsx             Services CRUD (+ ServiceModal)
      gallery/page.tsx              Gallery upload/delete
      bookings/page.tsx             Booking leads table
    layout.tsx                      Admin shell (AdminSidebar)
  layout.tsx                        Root layout (RTL, fonts)
  globals.css                       Global styles + Tailwind layers
  robots.ts / sitemap.ts            SEO

components/
  ui/                               Button, Card, Input, LogoImage, Modal, SectionDivider
  layout/                           Navbar, Footer, AdminSidebar, HomePageClient, ScrollBackgroundWrapper
  sections/                         Hero, GalleryPreview, ServicesPreview, About, CTASection, IntroAnimation(Wrapper), *PageClient
  providers/                        AnimationProvider, LanguageProvider, ScrollOverlayProvider

lib/
  actions.ts                        All server actions (data mutations + revalidatePath)
  supabase.ts                       Server client (createClient) + admin client (createServerAdmin, service-role)
  supabase-browser.ts               Browser client (createClientBrowser)
  animations.ts                     Framer Motion variants

types/
  index.ts                          Shared TypeScript interfaces

supabase/
  migrations/001_initial_schema.sql
  migrations/002_storage.sql
  seed.sql

next.config.mjs · tailwind.config.ts · tsconfig.json · postcss.config.mjs
```

> Homepage intentionally has no Navbar and does not render About or CTASection — those components exist for optional use on other pages. See `CLAUDE.md` for full design constraints.

## Design System

- **Colors**: `#0d0d0d` (dark bg), `#141417` (surface), `#c9a84c` (gold accent), `#e2c97e` (gold light), `#f0f0ec` (text), `#7a7a80` (muted)
- **Typography**: Cormorant Garamond (display/headings) + Heebo (body/Hebrew)
- **Direction**: RTL (`<html lang="he" dir="rtl">`)
- **Theme**: Dark only (no light mode)

## Pages

- **`/`** — Hero (full viewport, logo, character-staggered headline, CTA) → gallery preview slider (keyboard + drag nav) → services grid → footer
- **`/services`** — Full services grid, "Book Now" per card
- **`/gallery`** — Photos from Supabase Storage
- **`/booking`** — RTL form (name, phone, email, service, date, time, notes) → saves to `bookings` table → redirects to Wix booking page
- **`/admin/*`** — Email/password auth, Services CRUD, Gallery upload, Bookings view

## Security

- RLS enabled on all tables (see `supabase/migrations/001_initial_schema.sql`)
- Public tables (`services`, `gallery`, `site_content`): public SELECT, authenticated INSERT/UPDATE/DELETE
- `bookings`: anonymous INSERT, authenticated SELECT
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (used by `createServerAdmin` in `lib/supabase.ts`) — never import it into client components
- `.env.local` is gitignored

## Deployment (Vercel)

1. Push to `master`.
2. Import the repo in Vercel.
3. Add the same env vars from `.env.local` to Vercel Project Settings → Environment Variables.
4. Deploy. Sitemap lives at `/sitemap.xml`, robots at `/robots.txt`.

Pre-deploy checks: `npm run lint`, `npx tsc --noEmit`, `npm run build` all clean.

## Troubleshooting

- **"Missing Supabase environment variables"** — create `.env.local` from the example and restart `npm run dev`.
- **RLS errors on write** — ensure you're signed in as the admin user; verify migrations ran.
- **Gallery images 404** — create the `gallery` bucket in Supabase Storage and mark it public.
- **RTL layout glitches** — confirm `<html dir="rtl" lang="he">` in `app/layout.tsx` hasn't been overridden.

## External Integrations

- **Wix booking**: https://www.carmelis-studio.com/book-online
- **BitPay payments**: https://www.bitpay.co.il
- **Instagram**: https://www.instagram.com/carmelis_studio

See `CLAUDE.md` for detailed architecture notes, coding conventions, and design decisions.
