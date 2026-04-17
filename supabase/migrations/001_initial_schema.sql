-- Carmelis Studio: Initial Schema
-- Created: 2026-04-04

-- ============================================================================
-- TABLE: site_content (editable homepage content key/value store)
-- ============================================================================
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE site_content IS 'Editable homepage content stored as key-value pairs';
COMMENT ON COLUMN site_content.key IS 'Unique content key (e.g., hero_tagline, about_text)';
COMMENT ON COLUMN site_content.value IS 'Content value (text)';
COMMENT ON COLUMN site_content.updated_at IS 'Timestamp of last update';

-- Enable RLS for site_content
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public SELECT (anyone can read)
CREATE POLICY "site_content_public_select" ON site_content
  FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can UPDATE
CREATE POLICY "site_content_authenticated_update" ON site_content
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can DELETE
CREATE POLICY "site_content_authenticated_delete" ON site_content
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: services (available grooming services)
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER,
  duration_minutes INTEGER,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE services IS 'Available grooming services offered by Carmelis Studio';
COMMENT ON COLUMN services.id IS 'Unique service identifier';
COMMENT ON COLUMN services.name IS 'Service name in Hebrew';
COMMENT ON COLUMN services.description IS 'Service description in Hebrew';
COMMENT ON COLUMN services.price IS 'Price in ILS (₪)';
COMMENT ON COLUMN services.duration_minutes IS 'Estimated duration in minutes';
COMMENT ON COLUMN services.icon IS 'Icon name or emoji';
COMMENT ON COLUMN services.display_order IS 'Display order on frontend (lower first)';
COMMENT ON COLUMN services.created_at IS 'Timestamp of creation';

-- Enable RLS for services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public SELECT (anyone can view services)
CREATE POLICY "services_public_select" ON services
  FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can INSERT
CREATE POLICY "services_authenticated_insert" ON services
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can UPDATE
CREATE POLICY "services_authenticated_update" ON services
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can DELETE
CREATE POLICY "services_authenticated_delete" ON services
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: gallery (photo metadata for lightbox)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE gallery IS 'Gallery photo metadata; files stored in Supabase Storage bucket "gallery"';
COMMENT ON COLUMN gallery.id IS 'Unique photo identifier';
COMMENT ON COLUMN gallery.storage_path IS 'Path in Storage bucket (e.g., gallery/photo1.jpg)';
COMMENT ON COLUMN gallery.caption IS 'Photo caption in Hebrew';
COMMENT ON COLUMN gallery.display_order IS 'Display order in lightbox (lower first)';
COMMENT ON COLUMN gallery.created_at IS 'Timestamp of metadata creation';

-- Enable RLS for gallery
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public SELECT (anyone can view gallery)
CREATE POLICY "gallery_public_select" ON gallery
  FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can INSERT
CREATE POLICY "gallery_authenticated_insert" ON gallery
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can UPDATE
CREATE POLICY "gallery_authenticated_update" ON gallery
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can DELETE
CREATE POLICY "gallery_authenticated_delete" ON gallery
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: bookings (booking leads captured before Wix redirect)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  preferred_date DATE,
  preferred_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE bookings IS 'Booking leads captured from booking form; used for CRM follow-up';
COMMENT ON COLUMN bookings.id IS 'Unique booking identifier';
COMMENT ON COLUMN bookings.full_name IS 'Customer full name';
COMMENT ON COLUMN bookings.phone IS 'Customer phone number';
COMMENT ON COLUMN bookings.email IS 'Customer email address';
COMMENT ON COLUMN bookings.service_id IS 'Reference to requested service';
COMMENT ON COLUMN bookings.preferred_date IS 'Requested booking date';
COMMENT ON COLUMN bookings.preferred_time IS 'Requested booking time';
COMMENT ON COLUMN bookings.notes IS 'Additional notes from customer';
COMMENT ON COLUMN bookings.created_at IS 'Timestamp of booking submission';

-- Enable RLS for bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anonymous users can INSERT (for form submissions)
CREATE POLICY "bookings_anon_insert" ON bookings
  FOR INSERT
  WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can SELECT (admin only)
CREATE POLICY "bookings_authenticated_select" ON bookings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can UPDATE
CREATE POLICY "bookings_authenticated_update" ON bookings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Authenticated users can DELETE
CREATE POLICY "bookings_authenticated_delete" ON bookings
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);
CREATE INDEX IF NOT EXISTS idx_gallery_display_order ON gallery(display_order);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
