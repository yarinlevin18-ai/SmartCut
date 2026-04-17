-- Seed site_content
INSERT INTO site_content (key, value) VALUES
  ('tagline', 'מומחים בגילוח ותסרוקות'),
  ('about', 'קרמליס סטודיו הוא מרכז גילוח ותספורות עם מיומנות רבה בטיפול בשיער גברים. אנו משתמשים בטכניקות הטובות ביותר ומוצרים בעלי איכות עליונה.'),
  ('address', 'תל אביב, ישראל'),
  ('phone', '+972-50-1234567'),
  ('hours', 'ראשון - חמישי: 10:00-20:00, שישי: 10:00-15:00, שבת: סגור'),
  ('hero_image', 'https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png');

-- Seed services
INSERT INTO services (name, description, price, duration_minutes, icon, display_order) VALUES
  ('גילוח קלאסי', 'גילוח מקצועי עם מוסך חם וטיפול עדין בעור', 50, 30, '✂️', 1),
  ('תספורת גברים', 'תספורת מודרנית וקלאסית בהשראת הטרנדים העדכניים', 40, 45, '💈', 2),
  ('עיצוב זקן', 'גיזוז וטיפול בזקן כולל עדכון צבע וחלקה', 35, 30, '🧔', 3);

-- Gallery images are managed via the admin panel
-- Go to /admin/gallery to upload and manage gallery photos
