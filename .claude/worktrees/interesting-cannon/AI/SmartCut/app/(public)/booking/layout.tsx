import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הזמנת תור",
  description:
    "קבע תור בקרמליס סטודיו — גילוח קלאסי, עיצוב זקן ושפם וטיפול שיער. טופס מהיר, תגובה מיידית.",
  alternates: {
    canonical: "/booking",
  },
  openGraph: {
    title: "הזמנת תור | קרמליס סטודיו",
    description:
      "קבע תור בקרמליס סטודיו — גילוח קלאסי, עיצוב זקן ושפם וטיפול שיער. טופס מהיר, תגובה מיידית.",
    url: "/booking",
  },
  robots: {
    index: true,
    follow: true,
    noarchive: true,
  },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
