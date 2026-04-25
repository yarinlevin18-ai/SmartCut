import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getBookingByToken } from "@/lib/actions";
import { ManageBookingClient } from "./ManageBookingClient";

const JERUSALEM_TZ = "Asia/Jerusalem";

interface ManagePageProps {
  params: Promise<{ token: string }>;
}

const STATUS_LABEL_HE: Record<string, string> = {
  pending: "ממתין לאישור",
  confirmed: "מאושר",
  cancelled: "בוטל",
  denied: "נדחה",
  completed: "הושלם",
  no_show: "לא הגיע",
};

export default async function ManageBookingPage({ params }: ManagePageProps) {
  const { token } = await params;
  const booking = await getBookingByToken(token);

  if (!booking) notFound();

  const slotDate = booking.slot_start
    ? formatInTimeZone(booking.slot_start, JERUSALEM_TZ, "EEEE dd/MM/yyyy")
    : null;
  const slotTime = booking.slot_start
    ? formatInTimeZone(booking.slot_start, JERUSALEM_TZ, "HH:mm")
    : null;

  const hoursUntil = booking.slot_start
    ? (new Date(booking.slot_start).getTime() - Date.now()) / 3_600_000
    : null;
  const cutoffPassed = hoursUntil !== null && hoursUntil < 24;
  const slotInPast = hoursUntil !== null && hoursUntil <= 0;

  // Phase 5 distinguishers
  const isAlternativeOffered =
    booking.status === "pending" && !!booking.alt_offered_at;
  const isFreshPending =
    booking.status === "pending" && !booking.alt_offered_at;

  // Heading text picks the right tone for each state.
  const heading =
    booking.status === "cancelled"
      ? "התור בוטל"
      : booking.status === "denied"
        ? "הבקשה נדחתה"
        : isAlternativeOffered
          ? "הוצע מועד חלופי"
          : isFreshPending
            ? "הבקשה התקבלה"
            : "התור שלך";

  return (
    <>
      <Navbar />
      <main
        dir="rtl"
        className="min-h-screen flex items-center justify-center px-6 py-24"
        style={{ background: "#0d0d0d" }}
      >
        <div
          className="w-full max-w-xl"
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.2)",
            padding: "40px",
          }}
        >
          <p
            className="font-label uppercase text-gold-accent mb-3"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.36em" }}
          >
            ניהול תור · Manage Booking
          </p>
          <h1
            className="font-display text-white mb-8"
            style={{ fontSize: "clamp(28px, 4vw, 38px)", lineHeight: 1.1 }}
          >
            {heading}
          </h1>

          <dl className="space-y-3 mb-8 font-body text-white/85" style={{ fontSize: 14 }}>
            <Row label="לקוח" value={booking.full_name} />
            <Row label="שירות" value={booking.service_name ?? "—"} />
            {slotDate && (
              <Row
                label={isAlternativeOffered ? "מועד חלופי שהוצע" : "תאריך"}
                value={slotDate}
              />
            )}
            {slotTime && <Row label="שעה" value={slotTime} />}
            <Row label="סטטוס" value={STATUS_LABEL_HE[booking.status] ?? booking.status} />
          </dl>

          <ManageBookingClient
            token={token}
            initialStatus={booking.status}
            cutoffPassed={cutoffPassed}
            slotInPast={slotInPast}
            serviceId={booking.service_id}
            isAlternativeOffered={isAlternativeOffered}
            isFreshPending={isFreshPending}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <dt className="text-white/50" style={{ fontSize: 13 }}>{label}</dt>
      <dd className="font-medium" style={{ fontSize: 14 }}>{value}</dd>
    </div>
  );
}
