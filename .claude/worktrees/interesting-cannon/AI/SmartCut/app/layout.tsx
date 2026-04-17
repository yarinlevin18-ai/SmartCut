import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnimationProvider } from "@/components/providers/AnimationProvider";
import { Heebo, Cormorant_Garamond } from "next/font/google";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
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
        url: "https://www.carmelis-studio.com/logo.jpg",
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
      "https://www.carmelis-studio.com/logo.jpg",
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
    icon: "https://www.carmelis-studio.com/logo.jpg",
    apple: "https://www.carmelis-studio.com/logo.jpg",
    other: [
      {
        rel: "icon",
        url: "https://www.carmelis-studio.com/logo.jpg",
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
    image: "https://www.carmelis-studio.com/logo.jpg",
    telephone: "+972-3-9000-000",
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
    <html lang="he" dir="rtl" suppressHydrationWarning className={`${heebo.variable} ${cormorant.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        ></script>
      </head>
      <body className="bg-dark text-white font-body">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-gold-accent focus:text-dark focus:rounded focus:font-body focus:text-sm focus:font-medium"
        >
          דלג לתוכן
        </a>
        <AnimationProvider>
          {children}
        </AnimationProvider>
      </body>
    </html>
  );
}
