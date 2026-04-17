# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Overview

**Carmelis Studio** — Premium men's shaving & grooming studio website (Hebrew, RTL). Custom Next.js replacement for Wix site.

- **Client**: Carmelis Studio, Israel
- **Current Site**: carmelis-studio.com (Wix)
- **Links**: Instagram @carmelis_studio | Booking via Wix | Donations via BitPay

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14, App Router, TypeScript (strict) |
| Styling | Tailwind CSS |
| Animations | Framer Motion v11 |
| Database | Supabase (Postgres + Storage + Auth) |
| Forms | react-hook-form + Zod |
| Deployment | Vercel |

---

## Key Constraints

- **Language**: Hebrew (all UI text)
- **Direction**: RTL (`<html dir="rtl" lang="he">`)
- **Dark theme only** — no light mode
- **Booking system**: Link to Wix (don't rebuild payments)
- **TypeScript strict mode** — zero `any` types
- **Server actions only** — no REST API endpoints
- **Font**: Cesso (headings, logo) + Inter (body)
- **Colors**: Dark background (#0d0d0d), gold accent (#b8952a), surface (#141417)

---

## Project Structure

```
/app
  /(public)           — Customer-facing pages (homepage, services, gallery, booking)
  /(admin)            — Admin dashboard (login, CRUD operations)
/components
  /ui                 — Reusable UI elements (Button, Card, Input, Modal)
  /layout             — Page structure (Navbar, Footer, AdminSidebar, Header)
  /sections           — Full-width content blocks (Hero, About, ServicesPreview, GalleryPreview, CTA)
/lib
  actions.ts          — Server actions (all data mutations + revalidatePath calls)
  supabase.ts         — Supabase client factories (client-side only, safe for browser)
  supabase-server.ts  — Supabase admin client (server-side only, uses service role key)
  animations.ts       — Framer Motion variants (reusable animation configs)
/types
  index.ts            — All shared TypeScript interfaces (SiteContent, Service, GalleryPhoto, Booking, etc.)
```

---

## Development Quick Start

### 1. Environment Setup

```bash
# Copy env template and fill in Supabase credentials
cp .env.local.example .env.local

# Required variables:
# NEXT_PUBLIC_SUPABASE_URL=           (from Supabase dashboard)
# NEXT_PUBLIC_SUPABASE_ANON_KEY=      (from Supabase dashboard)
# SUPABASE_SERVICE_ROLE_KEY=          (from Supabase dashboard → settings)
# NEXT_PUBLIC_WIX_BOOKING_URL=        (already set: carmelis-studio.com/book-online)
# NEXT_PUBLIC_INSTAGRAM_URL=          (already set)
# NEXT_PUBLIC_BITPAY_URL=             (already set)
```

### 2. Database Setup

```bash
# (One-time) Create Supabase project at supabase.com
# → Enable Auth (email/password)
# → Copy credentials to .env.local

# Run migrations (use Supabase dashboard or CLI):
# 1. supabase/migrations/001_initial_schema.sql  → creates 4 tables + RLS policies
# 2. Manually create Storage bucket named "gallery" (public read, auth write/delete)
# 3. supabase/seed.sql  → populates demo data (Hebrew text, test services)

# Create admin user in Supabase dashboard:
# Auth → Add User → email: admin@carmelis.local, password: [set your own]
```

### 3. Development Commands

```bash
npm run dev          # Start Next.js dev server at http://localhost:3000
                     # Hot reload on file changes, auto-opens browser on first run

npm run build        # Build for production (verify clean build before deploying)
npm run start        # Run production build locally (simulates Vercel)
npm run lint         # Run ESLint (expect zero errors, no auto-fix used)
npx tsc --noEmit    # Type-check entire codebase (expect zero errors, strict mode)
```

---

## Supabase Database Schema

### Tables

**site_content** — Editable homepage strings (key-value store)
```sql
key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ
-- Keys: hero_tagline, about_text, address, phone, hours
```

**services** — Haircut/grooming services
```sql
id UUID, name TEXT, description TEXT, price INTEGER (ILS),
duration_minutes INTEGER, icon TEXT, display_order INTEGER, created_at TIMESTAMPTZ
```

**gallery** — Photo metadata (images stored in Supabase Storage bucket "gallery")
```sql
id UUID, storage_path TEXT, caption TEXT, display_order INTEGER, created_at TIMESTAMPTZ
```

**bookings** — Booking leads (submitted via booking form, before Wix redirect)
```sql
id UUID, full_name TEXT, phone TEXT, email TEXT, service_id UUID,
preferred_date DATE, preferred_time TEXT, notes TEXT, created_at TIMESTAMPTZ
```

### RLS Policies

- `services`, `gallery`, `site_content` → Public SELECT, authenticated INSERT/UPDATE/DELETE
- `bookings` → Anonymous INSERT (form submissions), authenticated SELECT only (admin view)

---

## Coding Patterns

### TypeScript & Components

- **Named exports only** (except page.tsx files which default export the page)
- **Server components by default** — add `"use client"` only for: event handlers, hooks (useState, useEffect), Framer Motion
- **No inline types** — all shared interfaces in `/types/index.ts`
- **Props interfaces**: `interface [ComponentName]Props { ... }`
- **Return type annotations**: All async functions explicitly typed (e.g., `: Promise<void>`)

**Example:**
```tsx
// ✅ Good
export function ServiceCard({ service }: ServiceCardProps) {
  return <div>{service.name}</div>;
}

// ❌ Bad
export default function ServiceCard(props: any) {
  return <div>{props.service.name}</div>;
}
```

### Server Actions (`lib/actions.ts`)

1. Always call `revalidatePath()` after mutations (ensures live updates)
2. Wrap in try/catch, return `{ success: boolean, error?: string }`
3. Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
4. Use `createServerClient()` for server actions, not `createClient()`

**Example:**
```tsx
'use server'

export async function updateService(id: string, name: string) {
  try {
    const client = createServerClient();
    await client.from('services').update({ name }).eq('id', id);
    revalidatePath('/admin/services');  // ← Must call after mutation
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Forms (Booking Page)

- Use `react-hook-form` + Zod schema for validation
- On submit: save to `bookings` table → redirect to Wix in new tab
- Show Hebrew success message: `"תודה! הפרטים נשמרו. מעביר אותך לדף ההזמנה..."`

### Animations (Framer Motion)

- Use centralized variants from `lib/animations.ts` (containerVariants, itemVariants, scaleVariants)
- Scroll-triggered: `whileInView="visible"` with `viewport={{ once: true, margin: "-80px" }}`
- Always check `useReducedMotion()` when adding motion (respect accessibility preference)
- Animate **only** opacity and transform — never width/height (prevents layout shift)
- Custom easing: `[0.22, 1, 0.36, 1]` for premium feel (not linear)

**Example:**
```tsx
'use client'
import { useReducedMotion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/lib/animations';

export function ServiceList({ services }: ServiceListProps) {
  const shouldReduce = useReducedMotion();
  
  return (
    <motion.div
      variants={shouldReduce ? {} : containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {services.map(svc => (
        <motion.div key={svc.id} variants={shouldReduce ? {} : itemVariants}>
          {svc.name}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

## Common Development Tasks

### Add a New Service

1. **Create form inputs** in admin/services page
2. **Call `createService()` action** from `lib/actions.ts` (server action)
3. **Verify `revalidatePath()` is called** to refresh public pages
4. Service appears on homepage and services page automatically

### Upload Gallery Photo

1. User submits image in `/admin/gallery`
2. `addGalleryItem()` uploads to Supabase Storage bucket "gallery"
3. Saves metadata row to `gallery` table with storage_path
4. Automatically appears on `/gallery` page (lazy-loaded via Next/Image)

### Edit Homepage Text

1. **Site content** stored in `site_content` table as key-value pairs
2. Admin can edit via Supabase dashboard or build a UI page for it
3. Call `updateSiteContent(key, value)` → `revalidatePath('/')` updates live

### Debug Type Errors

```bash
# See all TypeScript errors
npx tsc --noEmit

# Find errors in specific file
npx tsc --noEmit app/page.tsx
```

### Debug Animations

1. **Chrome DevTools** → Disable JavaScript → refresh → animations should still work (CSS-based as fallback)
2. **Test reduced motion**: DevTools → Rendering → prefers-reduced-motion: reduce → animations should pause
3. **Check performance**: Lighthouse → Performance tab (target: LCP < 2.5s, CLS < 0.1)

### Debug Supabase Issues

1. Check `.env.local` has correct credentials (copy from Supabase dashboard)
2. Verify RLS policies allow your operation (public read, auth write, etc.)
3. Check network tab in DevTools for failed requests (look for 401/403 auth errors)
4. Log server action errors: catch block should include `error.message`

---

## Git & Branching

### Strategy

- **Main branch**: `master` (always deployable)
- **Feature branches**: Create from `master`, PR to `master`
- **Branch naming**: `feature/add-booking-form`, `fix/admin-sidebar-rtl`, `docs/update-readme`

### Commit Messages

Keep commits atomic and descriptive:
```
feat: add magnetic button hover for desktop only
fix: correct admin sidebar border direction for RTL
refactor: simplify gallery image loading with Next/Image
docs: add Supabase setup instructions
```

### Before Pushing

```bash
npm run lint              # Fix any errors before commit
npx tsc --noEmit         # Ensure TypeScript passes
npm run build             # Verify clean production build
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] `npm run build` passes (zero errors)
- [ ] `npx tsc --noEmit` returns zero errors
- [ ] `npm run lint` returns zero errors
- [ ] `.env.local` variables set correctly
- [ ] Supabase migrations applied (`001_initial_schema.sql`, storage bucket created, `seed.sql` imported)
- [ ] Test bookings form end-to-end (submit → Supabase saves → Wix redirects)

### Deploy to Vercel

1. Push to `master` branch
2. Vercel auto-detects and builds
3. Set environment variables in Vercel project settings (copy from `.env.local`)
4. Deploy → verify sitemap at `/sitemap.xml`, robots.txt at `/robots.txt`

### Post-Deployment

- Monitor Vercel logs for errors
- Test booking form on live site
- Check Lighthouse: LCP < 2.5s, CLS < 0.1
- Submit sitemap to Google Search Console

---

## Design System

### Colors (Tailwind)

```
dark:          #0d0d0d  (background)
surface:       #141417  (cards, secondary bg)
gold-accent:   #b8952a  (CTAs, hover states, accents)
gold-light:    #d4a843  (hover text)
text:          #f0f0ec  (primary text)
muted:         #7a7a80  (secondary text)
```

### Typography

- **Headings**: Cesso (serif, premium feel)
- **Body**: Inter (clean, readable)
- **Hebrew text**: All text in Hebrew by default

### Components

- **Cards**: `background: var(--color-surface), border: 1px solid rgba(255,255,255,0.07), border-radius: 12px`
- **Form inputs**: Dark background, gold border on focus, RTL-aware (`dir="auto"`)
- **Buttons**: Primary (gold background), secondary (outline), magnetic hover on desktop only (touch-safe)
- **Mobile**: Hamburger menu morphs to X on click, all touch targets 44-48px minimum

---

## RTL (Right-to-Left) Notes

This is a **fully RTL site** serving Hebrew content. Key points:

- Root: `<html lang="he" dir="rtl">`
- Layout: Flex containers reverse order naturally with Tailwind
- Borders: Use `border-l` for left (which appears on right in RTL), `border-r` for right
- Text: `dir="auto"` on inputs, auto-directionality for mixed content
- Admin sidebar: Appears on **right side** (not left)

---

## Performance & SEO

### Image Optimization

- Next/Image for all images (automatic format selection: AVIF/WebP)
- Remote patterns: Wix (static.wixstatic.com) and Supabase (*.supabase.co)
- Hero image: `priority={true}`, gallery images: `loading="lazy"`
- Lazy loading on scroll-triggered sections

### Font Optimization

- Preconnect to Google Fonts
- CSS `display=swap` prevents layout shift during font load

### SEO

- ✅ Sitemap (`/sitemap.xml`): All 4 public routes with priorities
- ✅ Robots.txt (`/robots.txt`): Blocks `/admin/*` from indexing
- ✅ JSON-LD Schema: HairSalon LocalBusiness with services, address, hours
- ✅ Per-page metadata: Each public route has custom title, description, OG image
- ✅ Canonical URLs: Set on all pages

---

## Known Limitations

- **Booking payments**: Linked to Wix (don't rebuild payment processing)
- **Admin auth**: Email/password only, no public registration (admin creates users in Supabase dashboard)
- **Gallery lightbox**: Not implemented yet (can use yet-another-react-lightbox if needed)
- **Admin content editor**: Editable via Supabase dashboard, no dedicated UI page yet

---

## Reference: 12 Animation Features

All animations implemented with Framer Motion v11:

1. **Page transitions** — Slide-up entrance on route change
2. **Hero character reveal** — Hebrew text letter-by-letter with stagger (0.04s)
3. **Hero parallax** — Scroll-based transform on heading/logo
4. **Scroll-triggered reveals** — About, Services, Gallery, CTA sections fade-up on scroll
5. **Staggered children** — `staggerChildren: 0.12` on section lists
6. **Magnetic button hover** — Primary buttons follow cursor (desktop only, touch-safe)
7. **Hamburger menu morph** — Icon rotates into X on mobile menu toggle
8. **Mobile menu slide** — Height/opacity transition on open/close
9. **Modal animations** — Scale + opacity on enter, fade on exit
10. **Reduced motion support** — All animations respect `prefers-reduced-motion` OS preference
11. **Custom easing** — `[0.22, 1, 0.36, 1]` cubic-bezier (premium, not linear)
12. **Layout stability** — Only transform + opacity (no width/height changes to prevent CLS)

---

## What NOT to Do

- Do NOT add light mode
- Do NOT use `Inter`, `Arial`, or `Roboto` for Hebrew text — use **Cesso** (headings) + **Inter** (body)
- Do NOT use purple gradients or generic AI aesthetics
- Do NOT set `dir="ltr"` anywhere — this is RTL
- Do NOT rebuild payment system — link to BitPay/Wix only
- Do NOT add public user registration — admins only via Supabase dashboard
- Do NOT use `any` types in TypeScript
- Do NOT skip `revalidatePath()` after server action mutations
- Do NOT animate width/height (causes layout shift) — use opacity + transform only
- Do NOT commit `.env.local` (it's in `.gitignore`)

---

## Useful Links

- **Supabase Dashboard**: https://app.supabase.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Instagram**: https://www.instagram.com/carmelis_studio
- **Wix Booking**: https://www.carmelis-studio.com/book-online
- **BitPay**: https://www.bitpay.co.il

---

**Last Updated**: 2026-04-06

For project status, next steps, and detailed metrics, see the session handoff notes or git history.
