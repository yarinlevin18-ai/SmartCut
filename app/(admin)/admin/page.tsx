import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  getServices,
  getGallery,
  getBookings,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [servicesRes, galleryRes, bookingsRes] = await Promise.all([
    getServices(),
    getGallery(),
    getBookings(),
  ]);

  const servicesCount =
    servicesRes.success && servicesRes.data ? servicesRes.data.length : 0;
  const galleryCount =
    galleryRes.success && galleryRes.data ? galleryRes.data.length : 0;
  const bookings =
    bookingsRes.success && bookingsRes.data ? bookingsRes.data : [];
  const bookingsCount = bookings.length;
  const recentBookings = bookings.slice(0, 5);

  const stats = [
    {
      label: "שירותים",
      en: "Services",
      value: servicesCount,
      href: "/admin/services",
    },
    {
      label: "תמונות בגלריה",
      en: "Gallery",
      value: galleryCount,
      href: "/admin/gallery",
    },
    {
      label: "בקשות תור",
      en: "Bookings",
      value: bookingsCount,
      href: "/admin/bookings",
    },
  ];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-12">
        <p
          className="font-label uppercase text-gold-accent mb-3"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.36em",
          }}
        >
          Dashboard · סקירה
        </p>
        <h1
          className="font-display text-white mb-3"
          style={{
            fontSize: "clamp(36px, 5vw, 52px)",
            lineHeight: 1.05,
          }}
        >
          שלום, <span className="text-gold-accent">{user.email?.split("@")[0]}</span>
        </h1>
        <p
          className="font-body text-white/55"
          style={{ fontSize: 15, fontWeight: 300 }}
        >
          ברוך הבא לניהול קרמליס סטודיו
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="group block p-8 transition-all hover:bg-white/5"
            style={{
              background: "#080808",
              border: "1px solid rgba(201,168,76,0.15)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <p
                className="font-label uppercase text-white/50 group-hover:text-gold-accent transition-colors"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.32em",
                }}
              >
                {stat.en}
              </p>
              <span
                className="w-1.5 h-1.5 rotate-45 bg-gold-accent/60 group-hover:bg-gold-accent transition-colors"
                aria-hidden
              />
            </div>
            <div
              className="font-display text-white mb-2"
              style={{ fontSize: 56, lineHeight: 1 }}
            >
              {stat.value}
            </div>
            <p
              className="font-body text-white/60"
              style={{ fontSize: 13, fontWeight: 300 }}
            >
              {stat.label}
            </p>
            <div
              className="mt-6 pt-4 font-label uppercase text-gold-accent group-hover:text-gold-light transition-colors flex items-center gap-2"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.28em",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span>Open</span>
              <span aria-hidden>←</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent bookings */}
      <div
        className="p-8"
        style={{
          background: "#080808",
          border: "1px solid rgba(201,168,76,0.12)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p
              className="font-label uppercase text-gold-accent mb-2"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.32em",
              }}
            >
              Recent Bookings
            </p>
            <h2
              className="font-display text-white"
              style={{ fontSize: 24 }}
            >
              בקשות תור אחרונות
            </h2>
          </div>
          <Link
            href="/admin/bookings"
            className="font-label uppercase text-white/60 hover:text-gold-accent transition-colors"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.28em",
            }}
          >
            הכל ←
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <p
            className="font-body text-white/40 py-8 text-center"
            style={{ fontSize: 13, fontWeight: 300 }}
          >
            אין בקשות תור עדיין
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {recentBookings.map((booking) => (
              <li
                key={booking.id}
                className="py-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="font-body text-white/90 truncate"
                    style={{ fontSize: 14, fontWeight: 400 }}
                  >
                    {booking.full_name}
                  </div>
                  <div
                    className="font-body text-white/45 mt-1 truncate"
                    style={{ fontSize: 12, fontWeight: 300 }}
                    dir="ltr"
                  >
                    {booking.phone}
                  </div>
                </div>
                <div
                  className="font-label uppercase text-gold-accent/70 shrink-0"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.24em",
                  }}
                >
                  {new Date(booking.created_at).toLocaleDateString("he-IL", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
