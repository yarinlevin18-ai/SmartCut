import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הטיפולים שלנו",
  description:
    "גילוח קלאסי, עיצוב זקן ושפם וחבילת גילוח ושיער — טיפולי פרימיום לגבר המודרני. קרמליס סטודיו, תל אביב.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "הטיפולים שלנו | קרמליס סטודיו",
    description:
      "גילוח קלאסי, עיצוב זקן ושפם וחבילת גילוח ושיער — טיפולי פרימיום לגבר המודרני. קרמליס סטודיו, תל אביב.",
    url: "/services",
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
