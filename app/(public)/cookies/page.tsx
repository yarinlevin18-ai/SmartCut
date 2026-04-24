import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import { CookiePreferencesButton } from "@/components/legal/CookiePreferencesButton";

export const metadata: Metadata = {
  title: "מדיניות קובצי Cookie",
  description:
    "מדיניות קובצי ה-Cookie של קרמליס סטודיו — סוגי הקבצים שבהם אנו משתמשים וכיצד ניתן לשלוט בהם.",
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <LegalPageLayout
        eyebrow="Cookie Policy"
        title="מדיניות קובצי Cookie"
        lastUpdated="אפריל 2026"
      >
        <p>
          האתר שלנו עושה שימוש מוגבל בקובצי Cookie כדי להפעיל את השירות, לשמור
          העדפות ולשפר את חוויית הגלישה. מדיניות זו מפרטת אילו קבצים אנו
          משתמשים, למה, וכיצד ניתן לשלוט בהם.
        </p>

        <h2>מהם קובצי Cookie</h2>
        <p>
          קובץ Cookie הוא קובץ טקסט קטן שהאתר שומר בדפדפן שלכם. הוא מאפשר לאתר
          &ldquo;לזכור&rdquo; פעולות והעדפות בין ביקורים, כמו שפה, העדפות
          פרטיות או מצב כניסה.
        </p>

        <h2>סוגי הקבצים שאנו משתמשים</h2>

        <h3>חיוניים (Strictly Necessary)</h3>
        <p>
          נדרשים להפעלת האתר ואינם דורשים הסכמה. כוללים שמירת העדפת הקוקיז
          עצמה, מזהה הפעלה ומניעת התקפות CSRF. אי-אפשר לכבות אותם מבלי לפגוע
          בתפקוד בסיסי.
        </p>

        <h3>ניתוח וביצועים (Analytics)</h3>
        <p>
          מסייעים לנו להבין באופן מצטבר ואנונימי כיצד גולשים משתמשים באתר —
          אילו דפים נצפים, היכן נתקעים, באיזה מכשיר גולשים. מופעלים רק לאחר
          קבלת הסכמתכם.
        </p>

        <h3>שיווק (Marketing)</h3>
        <p>
          משמשים להצגת תוכן ופרסומות רלוונטיות מחוץ לאתר. כיום הסטודיו אינו
          מפעיל פיקסלים פרסומיים; אם מצב זה ישתנה, נבקש את הסכמתכם המפורשת
          מראש.
        </p>

        <h2>קבצים של צדדים שלישיים</h2>
        <ul>
          <li>
            <strong>Vercel</strong> — ספק האירוח. עשוי להציב קבצים טכניים לאיזון
            עומסים ולאבטחה.
          </li>
          <li>
            <strong>Supabase</strong> — מסד הנתונים. משמש לשמירת מצבי התחברות
            באזור הניהול בלבד.
          </li>
          <li>
            <strong>Google Fonts</strong> — גופני האתר מוגשים דרך CDN של Google.
            השימוש אינו כולל זיהוי אישי.
          </li>
        </ul>

        <h2>ניהול ההעדפות</h2>
        <p>
          בעת הביקור הראשון יוצג לכם באנר קוקיז המאפשר לקבל את כל הקבצים, לדחות
          את הלא-חיוניים או להגדיר העדפה מותאמת. ניתן לשנות את הבחירה בכל עת
          דרך הכפתור שבהמשך עמוד זה, או דרך הקישור שבבסיס כל עמוד באתר.
        </p>
        <CookiePreferencesButton />

        <p>
          בנוסף, ניתן לחסום או למחוק קבצי Cookie דרך הגדרות הדפדפן. שימו לב
          שחסימה גורפת עלולה לפגוע בתפקוד חלקים באתר. להלן הפניות להוראות:
        </p>
        <ul>
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple Safari
            </a>
          </li>
          <li>
            <a
              href="https://support.microsoft.com/microsoft-edge"
              target="_blank"
              rel="noopener noreferrer"
            >
              Microsoft Edge
            </a>
          </li>
        </ul>

        <h2>קישורים רלוונטיים</h2>
        <p>
          מדיניות זו יש לקרוא יחד עם <Link href="/privacy">מדיניות הפרטיות</Link>{" "}
          ועם <Link href="/terms">תנאי השימוש</Link>.
        </p>

        <h2>יצירת קשר</h2>
        <p>
          לשאלות ניתן לפנות בדוא&quot;ל{" "}
          <a href="mailto:privacy@carmelis-studio.com">
            privacy@carmelis-studio.com
          </a>
          .
        </p>
      </LegalPageLayout>
      <Footer />
    </>
  );
}
