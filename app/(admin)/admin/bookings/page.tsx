"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import {
  getBookings,
  deleteBooking,
  approveBooking,
  denyBooking,
} from "@/lib/actions";
import { SlotPicker } from "@/components/booking/SlotPicker";
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
  pending: "#c9a84c", // gold — needs admin attention
  confirmed: "#4ade80",
  cancelled: "#7a7a80",
  denied: "#f87171",
  completed: "#52525b",
  no_show: "#52525b",
};

type DenyModalState =
  | null
  | { booking: Booking; mode: "menu" }
  | { booking: Booking; mode: "alternative"; slot: string | null }
  | { booking: Booking; mode: "reject_confirm" };

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedWix, setCopiedWix] = useState<string | null>(null);
  const [denyTarget, setDenyTarget] = useState<DenyModalState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [, startTransition] = useTransition();

  // Hide cancelled/denied by default — the admin doesn't need them in the
  // day-to-day workflow but we keep them in the DB for audit and let the
  // toggle bring them back into view when needed.
  const isArchived = (b: Booking): boolean =>
    b.status === "cancelled" || b.status === "denied";
  const visibleBookings = showArchived
    ? bookings
    : bookings.filter((b) => !isArchived(b));
  const archivedCount = bookings.filter(isArchived).length;

  const manageUrlFor = (token: string): string => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://smart-cut-gamma.vercel.app";
    return `${origin}/booking/manage/${token}`;
  };

  const copyManageLink = async (token: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(manageUrlFor(token));
      setCopiedToken(token);
      setTimeout(
        () => setCopiedToken((cur) => (cur === token ? null : cur)),
        1500,
      );
    } catch {
      /* ignore */
    }
  };

  // Open the Wix Bookings dashboard in a new tab AND copy the customer's
  // details to clipboard, so the barber can paste them into Wix's "create
  // booking" form to issue a receipt. Manual bridge while we don't have
  // a real Wix API sync (Path A).
  const openInWix = async (booking: Booking): Promise<void> => {
    const slot = booking.slot_start
      ? new Date(booking.slot_start).toLocaleString("he-IL", {
          timeZone: "Asia/Jerusalem",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : booking.preferred_date
        ? `${booking.preferred_date} ${booking.preferred_time ?? ""}`.trim()
        : "—";
    const lines = [
      `שם: ${booking.full_name}`,
      `טלפון: ${booking.phone}`,
      booking.email ? `אימייל: ${booking.email}` : null,
      `שירות: ${booking.service?.name ?? "—"}`,
      `מחיר: ₪${booking.service?.price ?? "—"}`,
      `מועד: ${slot}`,
      booking.notes ? `הערות: ${booking.notes}` : null,
    ].filter(Boolean) as string[];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWix(booking.id);
      setTimeout(
        () => setCopiedWix((cur) => (cur === booking.id ? null : cur)),
        1800,
      );
    } catch {
      /* ignore — popup might be blocked, link still opens */
    }
    // Open a fresh Wix invoice form for the studio's site so the barber can
    // paste the customer details (already on the clipboard) into the right
    // place. WIX_SITE_ID is the Carmeli's Studio site — when this code goes
    // multi-tenant, move to env per tenant.
    const WIX_SITE_ID = "b4b5a3f7-5928-4d90-8152-8e6c034e1b46";
    const newInvoiceUrl = `https://manage.wix.com/dashboard/${WIX_SITE_ID}/wix-invoices/invoice/new?interaction=create-from-invoice_list`;
    window.open(newInvoiceUrl, "_blank", "noopener,noreferrer");
  };

  // A booking is "manageable" by the customer iff status is confirmed AND
  // slot_start is more than 24h out (matches the cancel cutoff in SQL).
  const isManageable = (booking: Booking): boolean => {
    if (booking.status !== "confirmed") return false;
    if (!booking.slot_start) return false;
    const hoursOut =
      (new Date(booking.slot_start).getTime() - Date.now()) / 3_600_000;
    return hoursOut >= 24;
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async (): Promise<void> => {
    const result = await getBookings();
    setBookings(result.success && result.data ? result.data : []);
    setLoading(false);
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const handleDelete = async (id: string): Promise<void> => {
    const result = await deleteBooking(id);
    setConfirmDelete(null);
    if (result.success) {
      setBookings(bookings.filter((b) => b.id !== id));
    }
  };

  const handleApprove = (id: string): void => {
    setActionError(null);
    startTransition(async () => {
      const r = await approveBooking(id);
      if (r.success) {
        await loadBookings();
      } else {
        setActionError(
          r.error === "SLOT_TAKEN"
            ? "המשבצת תפוסה — בדוק תורים אחרים שכבר אושרו לאותו זמן."
            : r.error ?? "הפעולה נכשלה",
        );
      }
    });
  };

  const handleDenyReject = (id: string): void => {
    setActionError(null);
    startTransition(async () => {
      const r = await denyBooking(id, { mode: "reject" });
      if (r.success) {
        setDenyTarget(null);
        await loadBookings();
      } else {
        setActionError(r.error ?? "הפעולה נכשלה");
      }
    });
  };

  const handleDenyAlternative = (id: string, newSlotIso: string): void => {
    setActionError(null);
    startTransition(async () => {
      const r = await denyBooking(id, { mode: "alternative", new_slot_start: newSlotIso });
      if (r.success) {
        setDenyTarget(null);
        await loadBookings();
      } else {
        const msg =
          r.error === "SLOT_TAKEN"
            ? "המשבצת המוצעת תפוסה. בחר זמן אחר."
            : r.error === "NEW_SLOT_TOO_SOON"
              ? "המועד החדש קרוב מדי (פחות מ-24 שעות מעכשיו)."
              : r.error === "INVALID_SLOT"
                ? "המועד שנבחר לא מיושר על רשת 15 דקות."
                : (r.error ?? "הפעולה נכשלה");
        setActionError(msg);
      }
    });
  };

  const fmtSlotLocal = (iso: string): string =>
    formatInTimeZone(iso, JERUSALEM_TZ, "dd/MM/yyyy HH:mm");

  return (
    <div className="max-w-6xl">
      {/* Bookings the admin actually needs to act on, day-to-day. Cancelled
          and denied stay in the DB for audit but clutter the live list — hide
          them by default and offer a toggle to surface them when needed. */}
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className="font-label uppercase text-gold-accent mb-3"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.36em",
            }}
          >
            Bookings · תורים
          </p>
          <h1
            className="font-display text-white mb-2"
            style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.05 }}
          >
            בקשות תור
          </h1>
          <p
            className="font-body text-white/55"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            {visibleBookings.length} פעילות · {archivedCount} בוטלו/נדחו
          </p>
        </div>
        {archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="font-label uppercase transition-colors hover:bg-white/5"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              color: showArchived ? "#c9a84c" : "rgba(255,255,255,0.7)",
              background: "transparent",
              fontSize: 10,
              fontWeight: 600,
              padding: "10px 16px",
              letterSpacing: "0.24em",
            }}
          >
            {showArchived ? "הסתר בוטלו/נדחו" : "הצג בוטלו/נדחו"}
          </button>
        )}
      </div>

      {loading ? (
        <div
          className="py-16 text-center font-body text-white/40"
          style={{ fontSize: 13 }}
        >
          טוען…
        </div>
      ) : visibleBookings.length === 0 ? (
        <div
          className="p-12 text-center"
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.12)",
          }}
        >
          <p
            className="font-body text-white/60"
            style={{ fontSize: 14, fontWeight: 300 }}
          >
            אין בקשות תור עדיין
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.12)",
          }}
        >
          <ul className="divide-y divide-white/5">
            {visibleBookings.map((booking) => {
              const isExpanded = expanded === booking.id;
              return (
                <li key={booking.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(isExpanded ? null : booking.id)
                    }
                    className="w-full text-right p-5 md:p-6 flex items-center gap-5 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Date badge */}
                    <div
                      className="shrink-0 flex flex-col items-center justify-center w-14 h-14"
                      style={{
                        border: "1px solid rgba(201,168,76,0.25)",
                      }}
                    >
                      <div
                        className="font-display text-gold-accent"
                        style={{ fontSize: 18, lineHeight: 1 }}
                      >
                        {new Date(booking.created_at).getDate()}
                      </div>
                      <div
                        className="font-label uppercase text-white/50 mt-1"
                        style={{
                          fontSize: 8,
                          fontWeight: 600,
                          letterSpacing: "0.2em",
                        }}
                      >
                        {new Date(booking.created_at).toLocaleDateString(
                          "he-IL",
                          { month: "short" }
                        )}
                      </div>
                    </div>

                    {/* Name + service */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-display text-white truncate"
                          style={{ fontSize: 18, lineHeight: 1.2 }}
                        >
                          {booking.full_name}
                        </span>
                        {/* Status pill — admin scans the queue at a glance */}
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
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span
                          className="font-body text-white/55"
                          style={{ fontSize: 12, fontWeight: 300 }}
                          dir="ltr"
                        >
                          {booking.phone}
                        </span>
                        {booking.service?.name && (
                          <>
                            <span className="text-white/20">·</span>
                            <span
                              className="font-label uppercase text-gold-accent/80"
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: "0.24em",
                              }}
                            >
                              {booking.service.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Slot (live — reflects reschedule / alternative-offer) */}
                    <div className="shrink-0 hidden sm:flex flex-col items-end">
                      {booking.slot_start ? (
                        <>
                          <div
                            className="font-body text-white/70"
                            style={{ fontSize: 13, fontWeight: 300 }}
                          >
                            {formatInTimeZone(booking.slot_start, JERUSALEM_TZ, "dd/MM/yyyy")}
                          </div>
                          <div
                            className="font-label uppercase text-white/40 mt-1"
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              letterSpacing: "0.24em",
                            }}
                            dir="ltr"
                          >
                            {formatInTimeZone(booking.slot_start, JERUSALEM_TZ, "HH:mm")}
                          </div>
                        </>
                      ) : (
                        <>
                          {booking.preferred_date && (
                            <div
                              className="font-body text-white/70"
                              style={{ fontSize: 13, fontWeight: 300 }}
                            >
                              {formatDate(booking.preferred_date)}
                            </div>
                          )}
                          {booking.preferred_time && (
                            <div
                              className="font-label uppercase text-white/40 mt-1"
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                letterSpacing: "0.24em",
                              }}
                              dir="ltr"
                            >
                              {booking.preferred_time}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Chevron */}
                    <motion.span
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="shrink-0 text-gold-accent/60"
                      aria-hidden
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="expanded"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div
                          className="px-6 pb-6 pt-2 space-y-4"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            {booking.email && (
                              <Field
                                label="Email"
                                value={booking.email}
                                ltr
                              />
                            )}
                            <Field
                              label="Submitted"
                              value={formatDate(booking.created_at)}
                            />
                          </div>

                          {isManageable(booking) && (
                            <div>
                              <div
                                className="font-label uppercase text-gold-accent mb-2"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  letterSpacing: "0.32em",
                                }}
                              >
                                Manage Link · קישור ניהול
                              </div>
                              <div className="flex items-stretch gap-2">
                                <code
                                  className="flex-1 font-body text-white/70 px-3 py-2 truncate select-all"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 300,
                                    background: "rgba(255,255,255,0.02)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    fontFamily:
                                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                                  }}
                                  dir="ltr"
                                  title={manageUrlFor(booking.manage_token)}
                                >
                                  {manageUrlFor(booking.manage_token)}
                                </code>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyManageLink(booking.manage_token);
                                  }}
                                  className="font-label uppercase transition-all"
                                  style={{
                                    border:
                                      copiedToken === booking.manage_token
                                        ? "1px solid rgba(74,222,128,0.5)"
                                        : "1px solid rgba(201,168,76,0.4)",
                                    color:
                                      copiedToken === booking.manage_token
                                        ? "#4ade80"
                                        : "#c9a84c",
                                    background:
                                      copiedToken === booking.manage_token
                                        ? "rgba(74,222,128,0.08)"
                                        : "transparent",
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: "0 16px",
                                    borderRadius: 0,
                                    letterSpacing: "0.24em",
                                    minWidth: 88,
                                  }}
                                >
                                  {copiedToken === booking.manage_token
                                    ? "הועתק"
                                    : "העתק"}
                                </button>
                              </div>
                              <p
                                className="font-body text-white/40 mt-2"
                                style={{
                                  fontSize: 11,
                                  fontWeight: 300,
                                  lineHeight: 1.6,
                                }}
                              >
                                שלח ללקוח (WhatsApp/SMS) — מאפשר ביטול עצמי עד 24 שעות לפני המועד.
                              </p>
                            </div>
                          )}

                          {booking.notes && (
                            <div>
                              <div
                                className="font-label uppercase text-gold-accent mb-2"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  letterSpacing: "0.32em",
                                }}
                              >
                                Notes · הערות
                              </div>
                              <div
                                className="font-body text-white/80 p-4"
                                style={{
                                  fontSize: 13,
                                  fontWeight: 300,
                                  lineHeight: 1.75,
                                  background: "rgba(255,255,255,0.02)",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                }}
                              >
                                {booking.notes}
                              </div>
                            </div>
                          )}

                          {/* Status-driven action row */}
                          <div className="flex gap-2 pt-2 flex-wrap">
                            <a
                              href={`tel:${booking.phone}`}
                              className="font-label uppercase hover:bg-gold-accent hover:text-black transition-all"
                              style={{
                                border: "1px solid rgba(201,168,76,0.4)",
                                color: "#c9a84c",
                                background: "transparent",
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "10px 20px",
                                borderRadius: 0,
                                letterSpacing: "0.28em",
                                display: "inline-block",
                              }}
                            >
                              התקשר
                            </a>

                            {/* Path A Wix bridge: copy details + open Wix dashboard */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInWix(booking);
                              }}
                              className="font-label uppercase transition-all"
                              style={{
                                border:
                                  copiedWix === booking.id
                                    ? "1px solid rgba(74,222,128,0.5)"
                                    : "1px solid rgba(255,255,255,0.18)",
                                color:
                                  copiedWix === booking.id
                                    ? "#4ade80"
                                    : "rgba(255,255,255,0.75)",
                                background:
                                  copiedWix === booking.id
                                    ? "rgba(74,222,128,0.06)"
                                    : "transparent",
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "10px 20px",
                                borderRadius: 0,
                                letterSpacing: "0.28em",
                              }}
                              title="פתח את לוח הבקרה של Wix והעתק את פרטי הלקוח להדבקה"
                            >
                              {copiedWix === booking.id
                                ? "הועתק → Wix"
                                : "פתח ב-Wix ↗"}
                            </button>
                            {booking.email && (
                              <a
                                href={`mailto:${booking.email}`}
                                className="font-label uppercase hover:bg-gold-accent hover:text-black transition-all"
                                style={{
                                  border: "1px solid rgba(201,168,76,0.4)",
                                  color: "#c9a84c",
                                  background: "transparent",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "10px 20px",
                                  borderRadius: 0,
                                  letterSpacing: "0.28em",
                                  display: "inline-block",
                                }}
                              >
                                אימייל
                              </a>
                            )}

                            {/* Pending + no alt offered yet → admin must decide */}
                            {booking.status === "pending" && !booking.alt_offered_at && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(booking.id);
                                  }}
                                  className="font-label uppercase transition-all hover:bg-gold-accent hover:text-black mr-auto"
                                  style={{
                                    border: "1px solid #c9a84c",
                                    color: "#c9a84c",
                                    background: "rgba(201,168,76,0.06)",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "10px 24px",
                                    borderRadius: 0,
                                    letterSpacing: "0.28em",
                                  }}
                                >
                                  אשר · Approve
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionError(null);
                                    setDenyTarget({ booking, mode: "menu" });
                                  }}
                                  className="font-label uppercase transition-all hover:bg-red-500/10"
                                  style={{
                                    border: "1px solid rgba(248,113,113,0.5)",
                                    color: "#fca5a5",
                                    background: "transparent",
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: "10px 24px",
                                    borderRadius: 0,
                                    letterSpacing: "0.28em",
                                  }}
                                >
                                  דחה · Deny
                                </button>
                              </>
                            )}

                            {/* Pending + alt offered → waiting for the customer */}
                            {booking.status === "pending" && booking.alt_offered_at && (
                              <span
                                className="font-body text-white/55 mr-auto self-center"
                                style={{ fontSize: 12, fontWeight: 300 }}
                              >
                                ממתין לתשובת הלקוח · הוצע: {fmtSlotLocal(booking.slot_start ?? booking.alt_offered_at)}
                              </span>
                            )}

                            {/* Confirmed → admin can cancel (existing behavior) */}
                            {booking.status === "confirmed" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDelete(booking.id);
                                }}
                                className="font-label uppercase hover:bg-red-500/10 transition-all mr-auto"
                                style={{
                                  border: "1px solid rgba(239,68,68,0.3)",
                                  color: "rgba(239,68,68,0.85)",
                                  background: "transparent",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "10px 20px",
                                  borderRadius: 0,
                                  letterSpacing: "0.28em",
                                }}
                              >
                                בטל
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {bookings.length > 0 && (
        <div
          className="mt-8 p-5 font-body text-white/60 text-center"
          style={{
            background: "rgba(201,168,76,0.05)",
            border: "1px solid rgba(201,168,76,0.15)",
            fontSize: 12,
            fontWeight: 300,
            lineHeight: 1.7,
            borderRadius: 0,
          }}
        >
          תורים מנוהלים מכאן. להפקת קבלה ב-Wix — &quot;פתח ב-Wix&quot; מעתיק את פרטי הלקוח ופותח את לוח הבקרה.
        </div>
      )}

      {/* Action error toast (Approve / Deny failures) */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] max-w-md w-full px-4"
            role="alert"
          >
            <div
              className="px-4 py-3 font-body text-center cursor-pointer"
              onClick={() => setActionError(null)}
              style={{
                background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.4)",
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              {actionError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deny modal — three states: menu / reject_confirm / alternative */}
      <AnimatePresence>
        {denyTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-6 py-12 overflow-y-auto"
            onClick={() => setDenyTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0a] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              style={{ border: "1px solid rgba(248,113,113,0.3)" }}
              dir="rtl"
            >
              <h3
                className="font-display text-white mb-2"
                style={{ fontSize: 22 }}
              >
                דחיית בקשת תור
              </h3>
              <p
                className="font-body text-white/55 mb-6"
                style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.6 }}
              >
                {denyTarget.booking.full_name} ·{" "}
                {denyTarget.booking.slot_start
                  ? fmtSlotLocal(denyTarget.booking.slot_start)
                  : "—"}
              </p>

              {denyTarget.mode === "menu" && (
                <div className="space-y-3">
                  <p
                    className="font-body text-white/70 mb-4"
                    style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
                  >
                    מה ברצונך לעשות?
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDenyTarget({
                        booking: denyTarget.booking,
                        mode: "alternative",
                        slot: null,
                      })
                    }
                    className="w-full text-right p-4 font-body transition-all hover:bg-gold-accent/5"
                    style={{
                      border: "1px solid rgba(201,168,76,0.4)",
                      color: "#c9a84c",
                      background: "transparent",
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    הצע מועד חלופי
                    <span
                      className="block font-body text-white/45 mt-1"
                      style={{ fontSize: 11, fontWeight: 300 }}
                    >
                      בחר מועד חדש — נשלח ללקוח SMS לאישור או דחייה.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDenyTarget({
                        booking: denyTarget.booking,
                        mode: "reject_confirm",
                      })
                    }
                    className="w-full text-right p-4 font-body transition-all hover:bg-red-500/5"
                    style={{
                      border: "1px solid rgba(248,113,113,0.4)",
                      color: "#fca5a5",
                      background: "transparent",
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    דחה לחלוטין
                    <span
                      className="block font-body text-white/45 mt-1"
                      style={{ fontSize: 11, fontWeight: 300 }}
                    >
                      ללא הצעת מועד חלופי. הלקוח יקבל SMS התנצלות.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDenyTarget(null)}
                    className="w-full mt-2 font-label uppercase transition-all hover:bg-white/5"
                    style={{
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.7)",
                      background: "transparent",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "12px 16px",
                      letterSpacing: "0.24em",
                    }}
                  >
                    חזור
                  </button>
                </div>
              )}

              {denyTarget.mode === "reject_confirm" && (
                <div className="space-y-4">
                  <p
                    className="font-body text-white/70"
                    style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
                  >
                    בטוח? הלקוח יקבל SMS שהבקשה נדחתה. ניתן עדיין להציע לו
                    פנייה ידנית בנפרד.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleDenyReject(denyTarget.booking.id)}
                      className="flex-1 font-label uppercase transition-all hover:opacity-90"
                      style={{
                        border: "1px solid rgb(239,68,68)",
                        color: "#fff",
                        background: "rgb(220,38,38)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "12px 16px",
                        letterSpacing: "0.24em",
                      }}
                    >
                      כן, דחה
                    </button>
                    <button
                      type="button"
                      onClick={() => setDenyTarget(null)}
                      className="flex-1 font-label uppercase transition-all hover:bg-white/5"
                      style={{
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "rgba(255,255,255,0.85)",
                        background: "transparent",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "12px 16px",
                        letterSpacing: "0.24em",
                      }}
                    >
                      לא
                    </button>
                  </div>
                </div>
              )}

              {denyTarget.mode === "alternative" && (
                <div className="space-y-5">
                  <p
                    className="font-body text-white/65"
                    style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.7 }}
                  >
                    בחר מועד חלופי. הלקוח יקבל SMS עם קישור לאישור או דחייה.
                  </p>
                  <SlotPicker
                    serviceId={denyTarget.booking.service_id ?? null}
                    value={denyTarget.slot}
                    onChange={(iso) =>
                      setDenyTarget((cur) =>
                        cur && cur.mode === "alternative"
                          ? { ...cur, slot: iso }
                          : cur,
                      )
                    }
                  />
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={!denyTarget.slot}
                      onClick={() =>
                        denyTarget.slot &&
                        handleDenyAlternative(denyTarget.booking.id, denyTarget.slot)
                      }
                      className="flex-1 font-label uppercase transition-all hover:bg-gold-accent hover:text-black disabled:opacity-40"
                      style={{
                        border: "1px solid #c9a84c",
                        color: "#c9a84c",
                        background: "rgba(201,168,76,0.05)",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "12px 16px",
                        letterSpacing: "0.24em",
                      }}
                    >
                      שלח הצעה
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDenyTarget({ booking: denyTarget.booking, mode: "menu" })
                      }
                      className="flex-1 font-label uppercase transition-all hover:bg-white/5"
                      style={{
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "rgba(255,255,255,0.85)",
                        background: "transparent",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "12px 16px",
                        letterSpacing: "0.24em",
                      }}
                    >
                      חזור
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-6"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a0a0a] p-8 max-w-sm w-full"
              style={{ border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <h3
                className="font-display text-white mb-3"
                style={{ fontSize: 22 }}
              >
                מחיקת בקשה
              </h3>
              <p
                className="font-body text-white/60 mb-6"
                style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
              >
                האם אתה בטוח? פעולה זו בלתי הפיכה.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 font-label uppercase hover:bg-white/5 transition-all"
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.85)",
                    background: "transparent",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "12px 16px",
                    borderRadius: 0,
                    letterSpacing: "0.24em",
                  }}
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="flex-1 font-label uppercase transition-all hover:opacity-90"
                  style={{
                    border: "1px solid rgb(239,68,68)",
                    color: "#fff",
                    background: "rgb(220,38,38)",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "12px 16px",
                    borderRadius: 0,
                    letterSpacing: "0.24em",
                  }}
                >
                  מחק
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <div
        className="font-label uppercase text-gold-accent mb-1.5"
        style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.32em" }}
      >
        {label}
      </div>
      <div
        className="font-body text-white/85"
        style={{ fontSize: 13, fontWeight: 300 }}
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </div>
    </div>
  );
}
