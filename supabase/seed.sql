-- Carmelis Studio: Seed Data
-- Created: 2026-04-04
-- Language: Hebrew (עברית)

-- ============================================================================
-- SEED: site_content (editable homepage content)
-- ============================================================================

INSERT INTO site_content (key, value) VALUES
  (
    'hero_tagline',
    'חווה את הטיפול שמגיע לך'
  ),
  (
    'about_text',
    'קרמליס סטודיו הוא לא סתם מספרה. זה מקום שנבנה עבור הגבר שיודע מה הוא שווה.

כל תור מתחיל ברגע של שקט — קצף חם, סכין חדה, ידיים שמכירות את העבודה. בין פגישה לפגישה, בין אחריות לאחריות, מגיע לכם הפסקה שתרגישו בה.

ממוקמים בתל אביב. פתוחים ששה ימים בשבוע. מחכים לכם.'
  ),
  (
    'address',
    'רחוב קרמליס 42, תל אביב, ישראל'
  ),
  (
    'phone',
    '052-455-0069'
  ),
  (
    'hours',
    'ראשון - חמישי: 09:00 - 20:00 | שישי: 09:00 - 16:00 | שבת: סגור'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SEED: services (available grooming services)
-- ============================================================================

INSERT INTO services (name, description, price, duration_minutes, icon, display_order) VALUES
  (
    'גילוח קלאסי',
    'יוצאים עם עור חלק וראש פנוי. גילוח ידני מסורתי עם קצף חם וסכין ישרה — הדרך הישנה, הדרך הנכונה.',
    89,
    45,
    '✂️',
    1
  ),
  (
    'עיצוב זקן ושפם',
    'הזקן מדבר לפניכם — שיהיה מה לומר. עיצוב מדויק, קווים נקיים, תוצאה שמחזיקה.',
    65,
    35,
    '💈',
    2
  ),
  (
    'חבילת גילוח וטיפול שיער',
    'מהשיער ועד הסנטר — כל פרט מטופל. מגיעים למשהו חשוב? זו ההכנה שמגיעה לכם.',
    129,
    75,
    '👑',
    3
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- NOTE: Gallery items seeded separately via admin upload
-- ============================================================================
-- The gallery table will be populated with photos uploaded through the admin interface.
-- No sample images are included in this seed for production use.

-- ============================================================================
-- Verification queries (for manual testing, can be removed)
-- ============================================================================
-- SELECT COUNT(*) as content_count FROM site_content;
-- SELECT COUNT(*) as services_count FROM services;
-- SELECT * FROM services ORDER BY display_order;
