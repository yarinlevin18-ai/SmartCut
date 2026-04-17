import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "העבודות שלנו",
  description:
    "גלריית עבודות של קרמליס סטודיו — גילוח קלאסי, עיצוב זקן ושפם ועוד. ראו בעצמכם.",
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title: "העבודות שלנו | קרמליס סטודיו",
    description:
      "גלריית עבודות של קרמליס סטודיו — גילוח קלאסי, עיצוב זקן ושפם ועוד. ראו בעצמכם.",
    url: "/gallery",
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
