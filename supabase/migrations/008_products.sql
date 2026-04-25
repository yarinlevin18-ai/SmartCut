-- Carmelis Studio: Products feature (Phase 6).
-- Created: 2026-04-25
-- Public-facing product catalog (oils, pomades, beard care etc) with admin CRUD.

-- ============================================================================
-- 1. products table
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NULL CHECK (price IS NULL OR price >= 0),
  image_url     TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_active_order
  ON products (display_order)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE products IS 'Customer-facing product catalogue (retail items the studio sells in-shop).';
COMMENT ON COLUMN products.is_active IS 'When false, product is hidden from public surfaces but kept for the admin to re-activate later.';
COMMENT ON COLUMN products.price IS 'Nullable for "ask in-store" / variable pricing.';

-- ============================================================================
-- 2. RLS — anon reads ACTIVE products only; admin (authenticated) full CRUD
-- ============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_anon_select_active" ON products;
CREATE POLICY "products_anon_select_active" ON products
  FOR SELECT
  USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "products_authenticated_insert" ON products;
CREATE POLICY "products_authenticated_insert" ON products
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "products_authenticated_update" ON products;
CREATE POLICY "products_authenticated_update" ON products
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "products_authenticated_delete" ON products;
CREATE POLICY "products_authenticated_delete" ON products
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- 3. Storage bucket for product images (public read)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Public read on objects in the products bucket
DROP POLICY IF EXISTS "Public read products bucket" ON storage.objects;
CREATE POLICY "Public read products bucket" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'products');

-- Authenticated write/delete (admin only)
DROP POLICY IF EXISTS "Authenticated write products bucket" ON storage.objects;
CREATE POLICY "Authenticated write products bucket" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update products bucket" ON storage.objects;
CREATE POLICY "Authenticated update products bucket" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'products' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete products bucket" ON storage.objects;
CREATE POLICY "Authenticated delete products bucket" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'products' AND auth.role() = 'authenticated');
