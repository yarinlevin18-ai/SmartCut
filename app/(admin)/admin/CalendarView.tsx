import { formatInTimeZone } from "date-fns-tz";
import type { GcalEventSummary } from "@/lib/gcal";

const JERUSALEM_TZ = "Asia/Jerusalem";

interface CalendarViewProps {
  events: GcalEventSummary[] | null;
  /** Falsy if the integration isn't configured — caller decides whether to render at all. */
  connected: boolean;
}

/**
 * "Next 7 days" Google Calendar view, grouped by date. Reads from the
 * Google Calendar API (not our DB) so it includes the barber's external
 * events (haircuts at someone else's place, vacation blocks, dentist…)
 * alongside the SmartCut bookings we mirrored over.
 *
 * Rendered as a server component — events are fetched server-side at
 * /admin pageload and passed in.
 */
export function CalendarView({ events, connected }: CalendarViewProps) {
  if (!connected) {
    // Caller already shows the "Connect" UI in GcalPanel — don't duplicate here.
    return null;
  }

  if (events === null) {
    // API error / token expired / network failure.
    return (
      <Shell title="הימים הקרובים · Next 7 days">
        <p
          className="font-body text-white/55 px-6 md:px-8 py-8 text-center"
          style={{ fontSize: 13, fontWeight: 300 }}
        >
          לא הצלחנו לטעון את היומן כרגע. נסה לרענן או לחבר מחדש את החשבון.
        </p>
      </Shell>
    );
  }

  if (events.length === 0) {
    return (
      <Shell title="הימים הקרובים · Next 7 days">
        <div className="px-6 md:px-8 py-12 text-center">
          <p
            className="font-body text-white/45"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            אין אירועים מתוזמנים בשבוע הקרוב.
          </p>
          <p
            className="font-body text-white/30 mt-2"
            style={{ fontSize: 12, fontWeight: 300 }}
          >
            תורים שיאושרו דרך המערכת יופיעו כאן אוטומטית.
          </p>
        </div>
      </Shell>
    );
  }

  // Group by Asia/Jerusalem date.
  const groups = new Map<string, GcalEventSummary[]>();
  for (const e of events) {
    const key = formatInTimeZone(e.start, JERUSALEM_TZ, "yyyy-MM-dd");
    const existing = groups.get(key);
    if (existing) existing.push(e);
    else groups.set(key, [e]);
  }
  const dates = Array.from(groups.keys()).sort();

  const todayKey = formatInTimeZone(new Date(), JERUSALEM_TZ, "yyyy-MM-dd");
  const tomorrowKey = formatInTimeZone(
    new Date(Date.now() + 24 * 3600_000),
    JERUSALEM_TZ,
    "yyyy-MM-dd",
  );

  return (
    <Shell title="הימים הקרובים · Next 7 days" count={events.length}>
      <ul className="divide-y divide-white/5">
        {dates.map((dateKey) => {
          const dayEvents = groups.get(dateKey) ?? [];
          // Use UTC noon of that date so DST edges don't drift the parsed value.
          const dateForLabel = new Date(`${dateKey}T12:00:00Z`);
          const weekday = formatInTimeZone(dateForLabel, JERUSALEM_TZ, "EEEE");
          const dayMonth = formatInTimeZone(dateForLabel, JERUSALEM_TZ, "dd/MM");
          const isToday = dateKey === todayKey;
          const isTomorrow = dateKey === tomorrowKey;
          const dayTag = isToday
            ? "היום"
            : isTomorrow
              ? "מחר"
              : weekday;

          return (
            <li key={dateKey} className="px-5 md:px-7 py-5">
              <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                <span
                  className="font-display text-white"
                  style={{ fontSize: 18, lineHeight: 1.1 }}
                >
                  {dayTag}
                </span>
                <span
                  className="font-label uppercase text-white/45"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.24em",
                  }}
                  dir="ltr"
                >
                  {dayMonth}
                </span>
                {isToday && (
                  <span
                    className="font-label uppercase shrink-0"
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.22em",
                      padding: "2px 7px",
                      border: "1px solid rgba(201,168,76,0.4)",
                      color: "#c9a84c",
                      background: "rgba(201,168,76,0.08)",
                    }}
                  >
                    היום
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {dayEvents.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

function EventRow({ event }: { event: GcalEventSummary }) {
  const isAllDay = event.isAllDay;
  const start = isAllDay
    ? null
    : formatInTimeZone(event.start, JERUSALEM_TZ, "HH:mm");
  const end = isAllDay
    ? null
    : formatInTimeZone(event.end, JERUSALEM_TZ, "HH:mm");

  return (
    <li
      className="flex items-start gap-4 p-3"
      style={{
        background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Time block */}
      <div
        className="shrink-0 flex flex-col items-center justify-center"
        style={{
          minWidth: 64,
          padding: "6px 10px",
          background: isAllDay
            ? "rgba(201,168,76,0.04)"
            : "rgba(201,168,76,0.06)",
          border: "1px solid rgba(201,168,76,0.18)",
        }}
      >
        {isAllDay ? (
          <span
            className="font-label uppercase text-white/55"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
            }}
          >
            יום שלם
          </span>
        ) : (
          <>
            <span
              className="font-display text-gold-accent"
              style={{ fontSize: 16, lineHeight: 1, letterSpacing: "0.02em" }}
              dir="ltr"
            >
              {start}
            </span>
            <span
              className="font-body text-white/35 mt-0.5"
              style={{ fontSize: 10, lineHeight: 1 }}
              dir="ltr"
            >
              ↓ {end}
            </span>
          </>
        )}
      </div>

      {/* Event body */}
      <div className="flex-1 min-w-0">
        <div
          className="font-body text-white/90 truncate"
          style={{ fontSize: 14, fontWeight: 500 }}
          title={event.summary}
        >
          {event.summary}
        </div>
        {event.location && (
          <div
            className="font-body text-white/40 truncate mt-1"
            style={{ fontSize: 11, fontWeight: 300 }}
            title={event.location}
          >
            📍 {event.location}
          </div>
        )}
      </div>

      {event.htmlLink && (
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 font-label uppercase text-white/45 hover:text-gold-accent transition-colors self-center"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.24em" }}
          aria-label="פתח ב-Google Calendar"
        >
          ↗
        </a>
      )}
    </li>
  );
}

function Shell({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-12"
      style={{
        background: "#080808",
        border: "1px solid rgba(201,168,76,0.15)",
      }}
    >
      <div
        className="px-6 md:px-8 py-5 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <p
            className="font-label uppercase text-gold-accent mb-1"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.32em" }}
          >
            Google Calendar
          </p>
          <h2
            className="font-display text-white"
            style={{ fontSize: 22, lineHeight: 1.1 }}
          >
            {title}
          </h2>
        </div>
        {count !== undefined && count > 0 && (
          <span
            className="font-label uppercase text-white/45 shrink-0"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.24em" }}
          >
            {count} אירועים
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
