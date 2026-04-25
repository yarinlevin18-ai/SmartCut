import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import type { Booking, BookingStatus } from "@/types";

const JERUSALEM_TZ = "Asia/Jerusalem";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "ממתין",
  confirmed: "מאושר",
  cancelled: "בוטל",
  denied: "נדחה",
  completed: "הושלם",
  no_show: "לא הגיע",
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: "#c9a84c",
  confirmed: "#4ade80",
  cancelled: "#7a7a80",
  denied: "#f87171",
  completed: "#52525b",
  no_show: "#52525b",
};

interface BookingsCalendarProps {
  bookings: Booking[];
  /** How many days ahead to show, starting from today (Asia/Jerusalem). Default 7. */
  days?: number;
}

/**
 * Week-grid view of OUR bookings (Supabase-backed). This is the calendar the
 * barber sees on the dashboard. Approved bookings additionally mirror to the
 * barber's Google Calendar via Phase 7 — but the barber's Google Calendar
 * lives in their phone / Google Calendar app, NOT inside this dashboard.
 *
 * Server component. Filters to confirmed + pending bookings inside the
 * window, sorted chronologically per day. Cancelled / denied / completed
 * are hidden — admin cares about what's coming up, not the audit trail.
 */
export function BookingsCalendar({ bookings, days = 7 }: BookingsCalendarProps) {
  // Build the day windows. Each entry is the YYYY-MM-DD string in
  // Asia/Jerusalem so we can group bookings reliably across DST edges.
  const todayStr = formatInTimeZone(new Date(), JERUSALEM_TZ, "yyyy-MM-dd");
  const dayKeys = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i);
    return formatInTimeZone(d, JERUSALEM_TZ, "yyyy-MM-dd");
  });

  // Group bookings by Asia/Jerusalem date. Calendar view shows the
  // confirmed schedule only — pending requests live in the PendingRequests
  // panel above the dashboard, where they can be acted on with quick
  // approve / deny.
  const byDay = new Map<string, Booking[]>();
  for (const b of bookings) {
    if (!b.slot_start) continue;
    if (b.status !== "confirmed") continue;
    const key = formatInTimeZone(b.slot_start, JERUSALEM_TZ, "yyyy-MM-dd");
    if (!dayKeys.includes(key)) continue;
    const list = byDay.get(key) ?? [];
    list.push(b);
    byDay.set(key, list);
  }
  for (const [k, list] of byDay) {
    list.sort(
      (a, b) =>
        new Date(a.slot_start ?? 0).getTime() -
        new Date(b.slot_start ?? 0).getTime(),
    );
    byDay.set(k, list);
  }

  const totalCount = Array.from(byDay.values()).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  // Pretty header summarizing the window.
  const startLabel = formatInTimeZone(
    new Date(`${dayKeys[0]}T12:00:00Z`),
    JERUSALEM_TZ,
    "dd/MM",
  );
  const endLabel = formatInTimeZone(
    new Date(`${dayKeys[dayKeys.length - 1]}T12:00:00Z`),
    JERUSALEM_TZ,
    "dd/MM",
  );

  return (
    <div
      className="mb-12"
      style={{
        background: "#080808",
        border: "1px solid rgba(201,168,76,0.15)",
      }}
    >
      <div
        className="px-6 md:px-8 py-6 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p
            className="font-label uppercase text-gold-accent mb-2"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.32em" }}
          >
            Bookings · יומן תורים
          </p>
          <h2
            className="font-display text-white"
            style={{ fontSize: 24, lineHeight: 1.1 }}
          >
            השבוע הקרוב
          </h2>
          <p
            className="font-body text-white/45 mt-1"
            style={{ fontSize: 12, fontWeight: 300 }}
            dir="ltr"
          >
            {startLabel} – {endLabel}
            <span className="mx-2 text-white/20">·</span>
            <span dir="rtl">
              {totalCount === 0
                ? "אין תורים השבוע"
                : `${totalCount} תורים`}
            </span>
          </p>
        </div>
        <Link
          href="/admin/bookings"
          className="font-label uppercase text-white/55 hover:text-gold-accent transition-colors shrink-0"
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.28em",
            border: "1px solid rgba(201,168,76,0.3)",
            padding: "10px 18px",
            borderRadius: 0,
          }}
        >
          ניהול ←
        </Link>
      </div>

      {/* Grid: 7 day columns side-by-side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-px" style={{ background: "rgba(255,255,255,0.04)" }}>
        {dayKeys.map((key) => {
          const dayBookings = byDay.get(key) ?? [];
          const isToday = key === todayStr;
          // Use UTC noon to dodge DST transition ambiguity when parsing the
          // YYYY-MM-DD back into a Date.
          const dateForLabel = new Date(`${key}T12:00:00Z`);
          const weekday = formatInTimeZone(dateForLabel, JERUSALEM_TZ, "EEEE");
          const dayNum = formatInTimeZone(dateForLabel, JERUSALEM_TZ, "dd/MM");
          // Saturday is closed at the studio (matches availability_config).
          const isClosed = formatInTimeZone(dateForLabel, JERUSALEM_TZ, "i") === "6";

          return (
            <div
              key={key}
              className="flex flex-col"
              style={{
                background: isToday ? "rgba(201,168,76,0.04)" : "#080808",
                minHeight: 220,
              }}
            >
              {/* Day header */}
              <div
                className="px-3 py-3 text-center"
                style={{
                  borderBottom: isToday
                    ? "2px solid #c9a84c"
                    : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="font-label uppercase"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.24em",
                    color: isToday ? "#c9a84c" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {weekday}
                </div>
                <div
                  className="font-display mt-1"
                  style={{
                    fontSize: 18,
                    lineHeight: 1,
                    color: isToday ? "#c9a84c" : "rgba(255,255,255,0.85)",
                  }}
                  dir="ltr"
                >
                  {dayNum}
                </div>
                {isToday && (
                  <div
                    className="font-label uppercase mt-1"
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      color: "#c9a84c",
                    }}
                  >
                    היום
                  </div>
                )}
              </div>

              {/* Bookings list */}
              <div className="flex-1 p-2 space-y-2">
                {dayBookings.length === 0 ? (
                  <div
                    className="py-6 text-center font-body"
                    style={{
                      fontSize: 11,
                      fontWeight: 300,
                      color: "rgba(255,255,255,0.25)",
                    }}
                  >
                    {isClosed ? "סגור" : "—"}
                  </div>
                ) : (
                  dayBookings.map((b) => <BookingChip key={b.id} booking={b} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingChip({ booking }: { booking: Booking }) {
  const time = booking.slot_start
    ? formatInTimeZone(booking.slot_start, JERUSALEM_TZ, "HH:mm")
    : "—";
  const isPast =
    booking.slot_start && new Date(booking.slot_start).getTime() < Date.now();
  const showAltPill = booking.status === "pending" && booking.alt_offered_at;
  const statusLabel = showAltPill ? "חלופי" : STATUS_LABEL[booking.status];
  const statusColor = STATUS_COLOR[booking.status];

  return (
    <Link
      href="/admin/bookings"
      className="block transition-colors hover:bg-white/5"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${statusColor}30`,
        // Status accent on the leading edge — gold/green/etc strip is the
        // fastest at-a-glance status indicator at this density.
        borderInlineStart: `3px solid ${statusColor}`,
        padding: "8px 10px",
        opacity: isPast ? 0.5 : 1,
        textDecoration: "none",
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="font-display text-gold-accent shrink-0"
          style={{ fontSize: 14, lineHeight: 1, letterSpacing: "0.02em" }}
          dir="ltr"
        >
          {time}
        </span>
        <span
          className="font-label uppercase shrink-0"
          style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div
        className="font-body text-white/85 mt-1 truncate"
        style={{ fontSize: 12, fontWeight: 500 }}
        title={booking.full_name}
      >
        {booking.full_name}
      </div>
      {booking.service?.name && (
        <div
          className="font-body text-white/40 mt-0.5 truncate"
          style={{ fontSize: 11, fontWeight: 300 }}
        >
          {booking.service.name}
        </div>
      )}
    </Link>
  );
}
