# קרמליס סטודיו — Carmelis Studio Website

Complete Next.js 14 website + admin dashboard for a premium men's shaving & grooming studio in Israel.

## 🚀 Quick Start

### 1. Setup Environment
```bash
cd c:\Users\משתמש\OneDrive\Desktop\AI\SmartCut
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Supabase Database

1. Create a new Supabase project at https://supabase.com
2. In Supabase SQL Editor, run `migrations.sql`:
   - Copy the contents of `migrations.sql`
   - Paste into Supabase SQL Editor
   - Execute

3. Seed initial data by running `seed.sql`:
   - Copy the contents of `seed.sql`
   - Paste into Supabase SQL Editor
   - Execute

4. Enable Auth:
   - Go to Supabase Auth settings
   - Enable Email/Password provider
   - Create admin user with email and password

5. Create storage bucket:
   - Go to Storage in Supabase
   - Create bucket named "gallery"
   - Make it public

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Access Admin Dashboard
```
URL: http://localhost:3000/admin/login
Email: admin@carmelis-studio.com (or what you created in Supabase)
Password: (what you set in Supabase)
```

## 📁 Project Structure

```
SmartCut/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                 # Homepage
│   │   ├── services/
│   │   │   └── page.tsx             # Services listing
│   │   ├── gallery/
│   │   │   └── page.tsx             # Gallery with lightbox
│   │   └── booking/
│   │       └── page.tsx             # Booking form
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── login/page.tsx       # Admin login
│   │   │   ├── page.tsx             # Dashboard home
│   │   │   ├── services/page.tsx    # Manage services
│   │   │   ├── gallery/page.tsx     # Manage gallery
│   │   │   ├── bookings/page.tsx    # View bookings
│   │   │   └── content/page.tsx     # Edit site content
│   │   └── layout.tsx               # Admin layout with sidebar
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # Global styles
├── components/
│   ├── providers/
│   │   └── LanguageProvider.tsx     # Language context (he/en)
│   ├── layout/
│   │   ├── Header.tsx               # Navigation header
│   │   ├── Footer.tsx               # Footer
│   │   └── AdminSidebar.tsx         # Admin sidebar nav
│   ├── sections/
│   │   ├── HeroSection.tsx          # Homepage hero
│   │   ├── ServicesSection.tsx      # Featured services
│   │   ├── GallerySection.tsx       # Photo gallery preview
│   │   └── CTASection.tsx           # Call-to-action
│   └── ui/
│       ├── Button.tsx               # Reusable button
│       ├── Card.tsx                 # Reusable card
│       ├── Input.tsx                # Form inputs
│       └── Modal.tsx                # Modal dialog
├── lib/
│   ├── supabase.ts                  # Supabase client setup
│   └── actions.ts                   # Server actions (queries, mutations)
├── types.ts                          # TypeScript interfaces
├── migrations.sql                    # Database schema
├── seed.sql                          # Sample data
├── package.json                      # Dependencies
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
└── README.md                         # This file
```

## 🎨 Design System

### Colors
- **Background**: `#0d0d0d` (dark)
- **Accent**: `#c9a84c` (gold)
- **Light Accent**: `#d4af73` (gold-light)
- **Text**: `#ffffff` (white)

### Typography
- **Headings**: Playfair Display (serif)
- **Body**: Heebo (sans-serif, excellent Hebrew support)

### Responsive Breakpoints
- Mobile: 375px
- Tablet: 768px
- Desktop: 1280px

All pages are mobile-first and fully responsive.

## 📄 Page Descriptions

### Homepage (`/`)
- Hero section with studio logo and CTA button
- About section (editable from admin)
- Featured services grid (3 services)
- Instagram gallery preview (6 latest photos)
- Social links and footer
- Animations: fade-up on scroll, stagger effects

### Services (`/services`)
- Grid of all services from database
- Each card: name, description, price, duration
- "Book Now" button on each card
- Fully managed from admin dashboard

### Gallery (`/gallery`)
- Masonry/grid layout of photos
- Lightbox on click (yet-another-react-lightbox)
- Photos stored in Supabase Storage
- Upload/delete from admin dashboard

### Booking (`/booking`)
- Form with fields: name, phone, email, service, date, time, notes
- Hebrew labels and placeholders
- On submit: save to "bookings" table, redirect to Wix booking
- Mobile-friendly form with RTL layout

### Admin Dashboard (`/admin`)
- **Login** (`/admin/login`): Email/password auth via Supabase
- **Dashboard Home** (`/admin`): Overview and quick links
- **Services** (`/admin/services`): Add/edit/delete services
- **Gallery** (`/admin/gallery`): Upload/delete photos
- **Bookings** (`/admin/bookings`): View all booking leads in table
- **Content** (`/admin/content`): Edit site tagline, about, address, hours

All admin changes update live (Next.js revalidation).

## 🔐 Security & Authentication

- **Admin Auth**: Supabase Auth with email/password
- **RLS Enabled**: All tables have Row-Level Security
- **Public Tables**: Services, gallery, site_content readable by anyone
- **Protected Writes**: Only authenticated users can edit content
- **Bookings**: Public can insert bookings, only admin can read

## 🚀 Deployment to Vercel

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push -u origin main

# 2. Create new project on Vercel
# Connect GitHub repo

# 3. Set environment variables in Vercel
# Add same .env vars as .env.local

# 4. Deploy
# Vercel auto-deploys on git push
```

## 📦 Dependencies

- **next**: 14.2.15
- **react**: 18
- **typescript**: Latest
- **tailwindcss**: 3.4.1
- **framer-motion**: 11.11.1 (animations)
- **@supabase/supabase-js**: 2.45.4 (database)
- **@supabase/ssr**: 0.5.1 (server-side auth)
- **react-hook-form**: 7.53.1 (forms)
- **zod**: 3.23.8 (validation)
- **yet-another-react-lightbox**: 3.21.5 (gallery lightbox)

## 🌐 Language Support

- **Default**: Hebrew (עברית)
- **Secondary**: English
- **RTL Support**: All pages fully RTL-compatible
- **Language Toggle**: Implemented via LanguageProvider context

## 📱 Mobile Optimization

- Mobile-first design
- All pages tested at 375px, 768px, 1280px
- Touch-friendly buttons and forms
- Optimized images via Next.js Image component
- Fast animations (0.3s–0.6s)

## 🔗 External Integrations

- **Booking**: Links to Wix booking page (existing system)
- **Payments**: Links to BitPay for payment processing
- **Instagram**: Links to @carmelis_studio Instagram
- **Logo**: From Wix (cached)

## 📧 API Keys & Secrets

Never commit `.env.local`. Use `.env.local.example` as template.

Required secrets:
- Supabase URL and keys
- Admin credentials (for initial setup only)

## 🐛 Troubleshooting

### RLS Errors
If you get "new row violates row-level security policy", ensure:
1. Supabase Auth is enabled
2. Migrations have been run
3. RLS policies are created
4. User is authenticated (for admin actions)

### Image Not Loading
- Check Supabase Storage bucket exists and is public
- Verify storage_path in database matches actual file path
- Check image URL in Supabase dashboard

### RTL Layout Issues
- Ensure `dir="rtl"` is set on html element in layout.tsx
- Use Tailwind's RTL-aware utilities
- Test in browser DevTools (Toggle device toolbar)

## 📞 Support

For issues with:
- **Supabase**: See https://supabase.com/docs
- **Next.js**: See https://nextjs.org/docs
- **Tailwind**: See https://tailwindcss.com/docs
- **Vercel**: See https://vercel.com/docs

## 📝 License

Private project for Carmelis Studio.
