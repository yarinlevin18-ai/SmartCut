import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import type { Booking, BookingStatus } from "@/types";

const JERUSALEM_TZ = "Asia/Jerusalem";

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "ממתין לאישור",
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

interface TodayScheduleProps {
  bookings: Booking[];
}

/**
 * Server component: today's bookings (Asia/Jerusalem date), sorted by
 * slot_start. Filters out cancelled / denied / completed by default — admin
 * cares about what's *happening* today, not the audit trail.
 */
export function TodaySchedule({ bookings }: TodayScheduleProps) {
  const todayStr = formatInTimeZone(new Date(), JERUSALEM_TZ, "yyyy-MM-dd");
  const todays = bookings
    .filter((b) => {
      if (!b.slot_start) return false;
      if (b.status === "cancelled" || b.status === "denied") return false;
      const dateStr = formatInTimeZone(b.slot_start, JERUSALEM_TZ, "yyyy-MM-dd");
      return dateStr === todayStr;
    })
    .sort((a, b) => {
      const at = new Date(a.slot_start ?? 0).getTime();
      const bt = new Date(b.slot_start ?? 0).getTime();
      return at - bt;
    });

  // Pretty Hebrew weekday + date for the header.
  const headerDate = formatInTimeZone(new Date(), JERUSALEM_TZ, "EEEE, dd/MM/yyyy");
  const pendingCount = todays.filter((b) => b.status === "pending").length;

  return (
    <div
      className="mb-12"
      style={{
        background: "#080808",
        border: "1px solid rgba(201,168,76,0.15)",
      }}
    >
      {/* Header */}
      <div
        className="px-6 md:px-8 py-6 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p
            className="font-label uppercase text-gold-accent mb-2"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.32em" }}
          >
            Today · היום
          </p>
          <h2
            className="font-display text-white"
            style={{ fontSize: 26, lineHeight: 1.1 }}
          >
            {headerDate}
          </h2>
          <p
            className="font-body text-white/45 mt-1"
            style={{ fontSize: 12, fontWeight: 300 }}
          >
            {todays.length === 0
              ? "אין תורים היום"
              : `${todays.length} תורים${pendingCount > 0 ? ` · ${pendingCount} ממתינים לאישור` : ""}`}
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
          כל התורים ←
        </Link>
      </div>

      {/* Body */}
      {todays.length === 0 ? (
        <div className="py-16 text-center">
          <p
            className="font-body text-white/40"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            אין תורים מתוזמנים להיום.
          </p>
          <p
            className="font-body text-white/30 mt-2"
            style={{ fontSize: 12, fontWeight: 300 }}
          >
            תורים חדשים שיתקבלו דרך האתר יופיעו כאן.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {todays.map((booking) => (
            <ScheduleRow key={booking.id} booking={booking} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ScheduleRow({ booking }: { booking: Booking }) {
  const time = booking.slot_start
    ? formatInTimeZone(booking.slot_start, JERUSALEM_TZ, "HH:mm")
    : "—";
  const isPast =
    booking.slot_start && new Date(booking.slot_start).getTime() < Date.now();
  const phoneE164 = booking.phone;

  return (
    <li
      className="p-5 md:p-6 flex items-center gap-5 flex-wrap"
      style={{ opacity: isPast ? 0.45 : 1 }}
    >
      {/* Time */}
      <div
        className="shrink-0 flex flex-col items-center justify-center"
        style={{
          minWidth: 64,
          padding: "10px 12px",
          background: "rgba(201,168,76,0.05)",
          border: "1px solid rgba(201,168,76,0.25)",
        }}
      >
        <div
          className="font-display text-gold-accent"
          style={{ fontSize: 22, lineHeight: 1, letterSpacing: "0.02em" }}
          dir="ltr"
        >
          {time}
        </div>
      </div>

      {/* Customer + service */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-display text-white truncate"
            style={{ fontSize: 18, lineHeight: 1.2 }}
          >
            {booking.full_name}
          </span>
          {/* Status pill */}
          <span
            className="font-label uppercase shrink-0"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.22em",
              padding: "3px 8px",
              border: `1px solid ${STATUS_COLOR[booking.status]}40`,
              color: STATUS_COLOR[booking.status],
              background: `${STATUS_COLOR[booking.status]}10`,
            }}
          >
            {booking.status === "pending" && booking.alt_offered_at
              ? "מוצע מועד חלופי"
              : STATUS_LABEL[booking.status]}
          </span>
        </div>
        <div
          className="flex items-center gap-3 mt-1.5 flex-wrap font-body"
          style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}
        >
          {booking.service?.name && (
            <span
              className="font-label uppercase text-gold-accent/70"
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.2em",
              }}
            >
              {booking.service.name}
            </span>
          )}
          {booking.notes && (
            <>
              <span className="text-white/20">·</span>
              <span className="truncate" title={booking.notes}>
                {booking.notes}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`tel:${phoneE164}`}
          className="font-label uppercase transition-all hover:bg-gold-accent hover:text-black"
          style={{
            border: "1px solid rgba(201,168,76,0.4)",
            color: "#c9a84c",
            background: "transparent",
            fontSize: 10,
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: 0,
            letterSpacing: "0.24em",
            textDecoration: "none",
          }}
        >
          התקשר
        </a>
        <Link
          href="/admin/bookings"
          className="font-label uppercase transition-all hover:bg-white/5"
          style={{
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.7)",
            background: "transparent",
            fontSize: 10,
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: 0,
            letterSpacing: "0.24em",
            textDecoration: "none",
          }}
        >
          {booking.status === "pending" ? "אשר/דחה" : "ערוך"}
        </Link>
      </div>
    </li>
  );
}
