"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getBookings, deleteBooking } from "@/lib/actions";
import type { Booking } from "@/types";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const manageUrlFor = (token: string): string => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://carmelis.co.il";
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

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-10">
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
          {bookings.length} בקשות שהתקבלו
        </p>
      </div>

      {loading ? (
        <div
          className="py-16 text-center font-body text-white/40"
          style={{ fontSize: 13 }}
        >
          טוען…
        </div>
      ) : bookings.length === 0 ? (
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
            {bookings.map((booking) => {
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
                      <div
                        className="font-display text-white truncate"
                        style={{ fontSize: 18, lineHeight: 1.2 }}
                      >
                        {booking.full_name}
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

                    {/* Preferred time */}
                    <div className="shrink-0 hidden sm:flex flex-col items-end">
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

                          <div className="flex gap-2 pt-2">
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
                              מחק
                            </button>
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
          בקשות נשמרות לצרכי מעקב. לקוחות מועברים ל-Wix Bookings להשלמת ההזמנה.
        </div>
      )}

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
