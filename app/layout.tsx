import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnimationProvider } from "@/components/providers/AnimationProvider";
import { CookieConsent } from "@/components/legal/CookieConsent";
import { DustLayer } from "@/components/effects/DustLayer";
import { Heebo, DM_Serif_Display, Montserrat } from "next/font/google";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-body",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-label",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.carmelis-studio.com"),
  title: {
    default: "קרמליס סטודיו | גילוח וטיפוח בתל אביב",
    template: "%s | קרמליס סטודיו",
  },
  description:
    "סטודיו גברים פרימיום בתל אביב. גילוח קלאסי, עיצוב זקן ושפם, וטיפול שיער. קבע תור עכשיו.",
  keywords: [
    "קרמליס סטודיו",
    "גילוח תל אביב",
    "מספרה גברים",
    "עיצוב זקן",
    "גילוח קלאסי",
    "טיפול שיער",
    "barbershop tel aviv",
  ],
  authors: [{ name: "קרמליס סטודיו" }],
  creator: "קרמליס סטודיו",
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://www.carmelis-studio.com",
    siteName: "קרמליס סטודיו",
    title: "קרמליס סטודיו | גילוח וטיפוח בתל אביב",
    description:
      "סטודיו גברים פרימיום בתל אביב. גילוח קלאסי, עיצוב זקן ושפם, וטיפול שיער. קבע תור עכשיו.",
    images: [
      {
        url: "https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png",
        width: 500,
        height: 500,
        alt: "קרמליס סטודיו — לוגו",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "קרמליס סטודיו | גילוח וטיפוח בתל אביב",
    description:
      "סטודיו גברים פרימיום בתל אביב. גילוח קלאסי, עיצוב זקן ושפם, וטיפול שיער.",
    images: [
      "https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png",
    ],
  },
  alternates: {
    canonical: "https://www.carmelis-studio.com",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  icons: {
    icon: "https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png",
    apple: "https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png",
    other: [
      {
        rel: "icon",
        url: "https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png",
        type: "image/png",
      },
    ],
  },
  verification: {
    google: "", // Add Google Search Console verification code when available
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    "@id": "https://www.carmelis-studio.com/#business",
    name: "קרמליס סטודיו",
    description:
      "סטודיו גברים פרימיום בתל אביב. גילוח קלאסי, עיצוב זקן ושפם, וטיפול שיער.",
    url: "https://www.carmelis-studio.com",
    image: "https://static.wixstatic.com/media/3d7d7e_c3c9c7388d8e45c9aa202d3e9a91c3b4~mv2.png",
    telephone: "+972-52-455-0069",
    priceRange: "₪₪",
    address: {
      "@type": "PostalAddress",
      streetAddress: "רחוב קרמליס 42",
      addressLocality: "תל אביב",
      addressCountry: "IL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 32.0853,
      longitude: 34.7818,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "09:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Friday"],
        opens: "09:00",
        closes: "16:00",
      },
    ],
    sameAs: ["https://www.instagram.com/carmelis_studio"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "שירותי גברים",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "גילוח קלאסי",
            description:
              "יוצאים עם עור חלק וראש פנוי. גילוח ידני מסורתי עם קצף חם וסכין ישרה.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "עיצוב זקן ושפם",
            description:
              "הזקן מדבר לפניכם — שיהיה מה לומר. עיצוב מדויק, קווים נקיים, תוצאה שמחזיקה.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "חבילת גילוח וטיפול שיער",
            description: "מהשיער ועד הסנטר — כל פרט מטופל.",
          },
        },
      ],
    },
  };

  return (
    <html lang="he" dir="rtl" suppressHydrationWarning className={`${heebo.variable} ${dmSerif.variable} ${montserrat.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        ></script>
      </head>
      <body className="bg-dark text-white font-body">
        <DustLayer />
        <AnimationProvider>
          <div className="relative z-[2]">{children}</div>
        </AnimationProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
