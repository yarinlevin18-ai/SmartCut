"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import { approveBooking } from "@/lib/actions";
import type { Booking } from "@/types";

const JERUSALEM_TZ = "Asia/Jerusalem";

interface PendingRequestsProps {
  bookings: Booking[];
}

/**
 * Top-of-dashboard panel for pending booking requests. These are bookings
 * that need an admin decision (approve / deny / offer alternative) — keeping
 * them separate from the "what's scheduled" views (TodaySchedule +
 * BookingsCalendar) so the action items don't get lost in the noise.
 *
 * Quick approve happens inline (no modal). Deny + alternative-offer route to
 * /admin/bookings where the deny modal + slot picker live.
 */
export function PendingRequests({ bookings: initial }: PendingRequestsProps) {
  // Local state so quick-approve removes the row immediately without a full
  // page reload. Re-syncs on Refresh action below.
  const [bookings, setBookings] = useState<Booking[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = bookings.filter((b) => b.status === "pending");

  // Don't render an empty section — when there's nothing to act on, the
  // dashboard goes straight from the greeting to TodaySchedule. Less noise.
  if (pending.length === 0) return null;

  // Sort: alternative-offered bookings drop to the bottom (the customer is
  // expected to act, not the admin). Fresh-pending sorted by created_at desc
  // so newest requests are most visible.
  const ordered = [...pending].sort((a, b) => {
    const aAlt = a.alt_offered_at ? 1 : 0;
    const bAlt = b.alt_offered_at ? 1 : 0;
    if (aAlt !== bAlt) return aAlt - bAlt;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
  const freshCount = ordered.filter((b) => !b.alt_offered_at).length;

  const handleApprove = (id: string): void => {
    setError(null);
    setActingId(id);
    startTransition(async () => {
      const r = await approveBooking(id);
      if (r.success) {
        setBookings((cur) => cur.filter((b) => b.id !== id));
      } else {
        setError(
          r.error === "SLOT_TAKEN"
            ? "המשבצת תפוסה. בדוק את שאר התורים."
            : (r.error ?? "האישור נכשל"),
        );
      }
      setActingId(null);
    });
  };

  return (
    <div
      className="mb-12"
      style={{
        background:
          "linear-gradient(180deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0) 100%), #080808",
        border: "1px solid rgba(201,168,76,0.4)",
      }}
    >
      <div
        className="px-6 md:px-8 py-5 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: "1px solid rgba(201,168,76,0.18)" }}
      >
        <div>
          <p
            className="font-label uppercase text-gold-accent mb-2"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.32em" }}
          >
            Pending requests · בקשות חדשות
          </p>
          <h2
            className="font-display text-white"
            style={{ fontSize: 24, lineHeight: 1.1 }}
          >
            {freshCount > 0
              ? `${freshCount} בקשות ממתינות לאישור`
              : "בקשות ממתינות לתשובת הלקוח"}
          </h2>
        </div>
        <span
          className="font-label uppercase shrink-0"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.24em",
            color: "#c9a84c",
            background: "rgba(201,168,76,0.1)",
            border: "1px solid rgba(201,168,76,0.4)",
            padding: "6px 14px",
          }}
        >
          {pending.length} סה&quot;כ
        </span>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              role="alert"
              className="px-6 md:px-8 py-3 font-body cursor-pointer"
              onClick={() => setError(null)}
              style={{
                background: "rgba(248,113,113,0.08)",
                borderBottom: "1px solid rgba(248,113,113,0.3)",
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="divide-y divide-white/5">
        {ordered.map((booking) => (
          <PendingRow
            key={booking.id}
            booking={booking}
            isActing={actingId === booking.id && isPending}
            onApprove={() => handleApprove(booking.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function PendingRow({
  booking,
  isActing,
  onApprove,
}: {
  booking: Booking;
  isActing: boolean;
  onApprove: () => void;
}) {
  const slotLabel = booking.slot_start
    ? formatInTimeZone(booking.slot_start, JERUSALEM_TZ, "EEEE dd/MM · HH:mm")
    : booking.preferred_date
      ? `${booking.preferred_date} ${booking.preferred_time ?? ""}`.trim()
      : "—";
  const isAltOffered = !!booking.alt_offered_at;
  const submittedAt = formatInTimeZone(
    booking.created_at,
    JERUSALEM_TZ,
    "dd/MM HH:mm",
  );

  return (
    <li className="px-5 md:px-7 py-5 flex items-start gap-4 flex-wrap">
      {/* Customer + slot details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-display text-white"
            style={{ fontSize: 18, lineHeight: 1.2 }}
          >
            {booking.full_name}
          </span>
          <span
            className="font-label uppercase shrink-0"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.22em",
              padding: "3px 8px",
              border: `1px solid ${isAltOffered ? "rgba(255,255,255,0.18)" : "rgba(201,168,76,0.5)"}`,
              color: isAltOffered ? "rgba(255,255,255,0.5)" : "#c9a84c",
              background: isAltOffered
                ? "rgba(255,255,255,0.04)"
                : "rgba(201,168,76,0.1)",
            }}
          >
            {isAltOffered ? "מחכה לתשובת הלקוח" : "ממתין לאישורך"}
          </span>
        </div>

        <div
          className="flex items-center gap-3 mt-2 flex-wrap font-body"
          style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.7)" }}
        >
          <span className="font-display text-gold-accent" style={{ fontSize: 15 }}>
            {slotLabel}
          </span>
          {booking.service?.name && (
            <>
              <span className="text-white/20">·</span>
              <span
                className="font-label uppercase text-gold-accent/80"
                style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.2em" }}
              >
                {booking.service.name}
              </span>
            </>
          )}
          <span className="text-white/20">·</span>
          <span dir="ltr" style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            {booking.phone}
          </span>
        </div>

        {booking.notes && (
          <p
            className="font-body text-white/55 mt-2"
            style={{
              fontSize: 12,
              fontWeight: 300,
              lineHeight: 1.6,
              maxWidth: 600,
            }}
          >
            {booking.notes}
          </p>
        )}

        <p
          className="font-label uppercase text-white/30 mt-2"
          style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.24em" }}
        >
          התקבל ב-{submittedAt}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {!isAltOffered && (
          <button
            type="button"
            onClick={onApprove}
            disabled={isActing}
            className="font-label uppercase transition-all hover:bg-gold-accent hover:text-black disabled:opacity-50"
            style={{
              border: "1px solid #c9a84c",
              color: "#c9a84c",
              background: "rgba(201,168,76,0.05)",
              fontSize: 11,
              fontWeight: 700,
              padding: "10px 22px",
              borderRadius: 0,
              letterSpacing: "0.28em",
            }}
          >
            {isActing ? "מאשר…" : "אשר"}
          </button>
        )}
        <Link
          href="/admin/bookings"
          className="font-label uppercase transition-all hover:bg-white/5"
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.8)",
            background: "transparent",
            fontSize: 11,
            fontWeight: 600,
            padding: "10px 18px",
            borderRadius: 0,
            letterSpacing: "0.28em",
            textDecoration: "none",
          }}
        >
          {isAltOffered ? "פרטים" : "פרטים / דחה"}
        </Link>
      </div>
    </li>
  );
}
