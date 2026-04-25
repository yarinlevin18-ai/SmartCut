import { formatInTimeZone } from "date-fns-tz";
import type { GcalEventSummary } from "@/lib/gcal";

const JERUSALEM_TZ = "Asia/Jerusalem";

interface CalendarViewProps {
  events: GcalEventSummary[] | null;
  /** Calendar id for the iframe src — the user's email when primary calendar is connected. */
  calendarId: string | null;
  /** Falsy if the integration isn't configured. Caller decides whether to render at all. */
  connected: boolean;
}

/**
 * Two-tier Google Calendar surface inside the dashboard:
 *   1. EMBEDDED IFRAME (top) — the real Google Calendar UI showing ALL events
 *      from ALL the user's calendars. Only works when the viewer is signed
 *      into Google with the connected account in the same browser session
 *      (which is true for the studio owner's normal admin workflow).
 *   2. UPCOMING-EVENTS LIST (below) — fetched server-side via the Calendar
 *      API. Acts as fallback (e.g. if iframe is blocked / signed out) plus
 *      gives a compact "next 7 days" summary regardless.
 */
export function CalendarView({ events, calendarId, connected }: CalendarViewProps) {
  if (!connected) return null;

  return (
    <div className="mb-12 space-y-6">
      <Embed calendarId={calendarId} />
      <Upcoming events={events} />
    </div>
  );
}

// ---- iframe section ----

function Embed({ calendarId }: { calendarId: string | null }) {
  if (!calendarId) {
    return (
      <Shell title="היומן שלך · Your Calendar">
        <p
          className="font-body text-white/55 px-6 md:px-8 py-8 text-center"
          style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
        >
          לא הצלחנו לזהות את כתובת היומן. נסה לנתק ולחבר מחדש את החשבון.
        </p>
      </Shell>
    );
  }

  // Build the embed URL. We pass minimal chrome flags so the iframe focuses
  // on the calendar grid: hide title bar, print button, calendar list, and
  // tabs the user can't act on inside an iframe.
  const params = new URLSearchParams({
    src: calendarId,
    ctz: JERUSALEM_TZ,
    mode: "WEEK",
    showTitle: "0",
    showPrint: "0",
    showCalendars: "0",
    showTabs: "1",
    showDate: "1",
    showNav: "1",
    bgcolor: "%230d0d0d",
  });
  const embedUrl = `https://calendar.google.com/calendar/embed?${params.toString()}`;

  return (
    <Shell
      title="היומן שלך · Your Calendar"
      subtitle="כל האירועים מכל היומנים שלך — מוטמע ישירות מ-Google."
    >
      <div
        className="px-3 md:px-4 pb-4"
        style={{ background: "#0d0d0d" }}
      >
        <iframe
          src={embedUrl}
          // 720 keeps a full week visible without scroll on most desktops.
          // Mobile gets aspect-ratio 4/5 fallback further down via CSS.
          style={{
            border: 0,
            width: "100%",
            height: 720,
            background: "#0d0d0d",
            colorScheme: "normal",
          }}
          frameBorder={0}
          scrolling="no"
          title="Google Calendar embed"
        />
        <p
          className="font-body text-white/35 mt-3 text-center"
          style={{ fontSize: 11, fontWeight: 300, lineHeight: 1.7 }}
        >
          אם היומן לא נטען, ודא שאתה מחובר ל-Google בדפדפן עם החשבון{" "}
          <span dir="ltr" className="text-white/55">
            {calendarId}
          </span>
          .
        </p>
      </div>
    </Shell>
  );
}

// ---- upcoming list section (compact) ----

function Upcoming({ events }: { events: GcalEventSummary[] | null }) {
  if (events === null) {
    return (
      <Shell title="הימים הקרובים · Next 7 days">
        <p
          className="font-body text-white/55 px-6 md:px-8 py-8 text-center"
          style={{ fontSize: 13, fontWeight: 300 }}
        >
          לא הצלחנו לטעון את רשימת האירועים.
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
          const dateForLabel = new Date(`${dateKey}T12:00:00Z`);
          const weekday = formatInTimeZone(dateForLabel, JERUSALEM_TZ, "EEEE");
          const dayMonth = formatInTimeZone(dateForLabel, JERUSALEM_TZ, "dd/MM");
          const isToday = dateKey === todayKey;
          const isTomorrow = dateKey === tomorrowKey;
          const dayTag = isToday ? "היום" : isTomorrow ? "מחר" : weekday;

          return (
            <li key={dateKey} className="px-5 md:px-7 py-5">
              <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                <span
                  className="font-display text-white"
                  style={{ fontSize: 17, lineHeight: 1.1 }}
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
  const start = isAllDay ? null : formatInTimeZone(event.start, JERUSALEM_TZ, "HH:mm");
  const end = isAllDay ? null : formatInTimeZone(event.end, JERUSALEM_TZ, "HH:mm");

  return (
    <li
      className="flex items-start gap-4 p-3"
      style={{
        background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="shrink-0 flex flex-col items-center justify-center"
        style={{
          minWidth: 64,
          padding: "6px 10px",
          background: isAllDay ? "rgba(201,168,76,0.04)" : "rgba(201,168,76,0.06)",
          border: "1px solid rgba(201,168,76,0.18)",
        }}
      >
        {isAllDay ? (
          <span
            className="font-label uppercase text-white/55"
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em" }}
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

// ---- shared shell ----

function Shell({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div
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
          {subtitle && (
            <p
              className="font-body text-white/45 mt-1"
              style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.6 }}
            >
              {subtitle}
            </p>
          )}
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
