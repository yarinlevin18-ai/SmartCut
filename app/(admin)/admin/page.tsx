import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getBookings } from "@/lib/actions";
import { getGcalStatus, listUpcomingEvents, getPrimaryCalendarId } from "@/lib/gcal";
import { GcalPanel } from "./GcalPanel";
import { TodaySchedule } from "./TodaySchedule";
import { CalendarView } from "./CalendarView";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Pick a Hebrew display name for the dashboard greeting. Order of preference:
 *   1. user_metadata.first_name_he  — explicit Hebrew first name
 *   2. user_metadata.full_name_he   — explicit Hebrew full name
 *   3. user_metadata.first_name     — generic display name
 *   4. user_metadata.name           — generic display name (Supabase default key)
 *   5. EMAIL_TO_HE_FALLBACK[email]  — known studio owners (env-free baseline)
 *   6. email-prefix                 — last resort, never blank
 *
 * To set a Hebrew name in production:
 *   Supabase Dashboard → Authentication → Users → click user → Edit →
 *   Raw user metadata → add { "first_name_he": "ירין" }.
 */
const EMAIL_TO_HE_FALLBACK: Record<string, string> = {
  "yarinlevin18@gmail.com": "ירין",
};

function displayName(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta =
    (typeof meta.first_name_he === "string" && meta.first_name_he) ||
    (typeof meta.full_name_he === "string" && meta.full_name_he) ||
    (typeof meta.first_name === "string" && meta.first_name) ||
    (typeof meta.name === "string" && meta.name);
  if (fromMeta) return fromMeta as string;

  const email = user.email ?? "";
  if (EMAIL_TO_HE_FALLBACK[email]) return EMAIL_TO_HE_FALLBACK[email];

  return email.split("@")[0] || "אדמין";
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const [bookingsRes, gcalStatus] = await Promise.all([
    getBookings(),
    getGcalStatus(),
  ]);

  // Fetch the calendar surface in parallel — only when connected, to avoid
  // pointless API calls on every dashboard render for accounts that haven't
  // wired the integration yet.
  const [upcomingEvents, calendarId] = gcalStatus.connected
    ? await Promise.all([listUpcomingEvents(7, 50), getPrimaryCalendarId()])
    : [null, null];

  const bookings =
    bookingsRes.success && bookingsRes.data ? bookingsRes.data : [];
  const recentBookings = bookings.slice(0, 5);

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
          שלום, <span className="text-gold-accent">{displayName(user)}</span>
        </h1>
      </div>

      {/* Today's schedule — primary daily-driver view (DB-backed). */}
      <TodaySchedule bookings={bookings} />

      {/* Google Calendar integration panel (Phase 7) */}
      <GcalPanel
        configured={gcalStatus.configured}
        connected={gcalStatus.connected}
        accountEmail={gcalStatus.account_email}
      />

      {/* Next 7 days from Google Calendar — only renders when connected. */}
      <CalendarView
        events={upcomingEvents}
        calendarId={calendarId}
        connected={gcalStatus.connected}
      />

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
