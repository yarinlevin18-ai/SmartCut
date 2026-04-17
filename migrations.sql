-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Site Content Table
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery Table
CREATE TABLE IF NOT EXISTS gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  preferred_date DATE NOT NULL,
  preferred_time TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_content (public read, authenticated write)
CREATE POLICY "site_content_public_read" ON site_content FOR SELECT
  USING (true);

CREATE POLICY "site_content_authenticated_write" ON site_content FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "site_content_authenticated_update" ON site_content FOR UPDATE
  USING (auth.role() = 'authenticated');

-- RLS Policies for services (public read, authenticated write/delete)
CREATE POLICY "services_public_read" ON services FOR SELECT
  USING (true);

CREATE POLICY "services_authenticated_insert" ON services FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "services_authenticated_update" ON services FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "services_authenticated_delete" ON services FOR DELETE
  USING (auth.role() = 'authenticated');

-- RLS Policies for gallery (public read, authenticated write/delete)
CREATE POLICY "gallery_public_read" ON gallery FOR SELECT
  USING (true);

CREATE POLICY "gallery_authenticated_insert" ON gallery FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "gallery_authenticated_update" ON gallery FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "gallery_authenticated_delete" ON gallery FOR DELETE
  USING (auth.role() = 'authenticated');

-- RLS Policies for bookings (public insert, authenticated read)
CREATE POLICY "bookings_public_insert" ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "bookings_authenticated_read" ON bookings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Storage bucket for gallery
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true)
ON CONFLICT DO NOTHING;

-- Storage RLS policy for gallery
CREATE POLICY "gallery_storage_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery');

CREATE POLICY "gallery_storage_authenticated_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');

CREATE POLICY "gallery_storage_authenticated_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');
