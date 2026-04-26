"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTimeZone } from "date-fns-tz";
import type { Customer, BookingStatus } from "@/types";

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
  no_show: "#f87171",
};

interface CustomersClientProps {
  initialCustomers: Customer[];
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Search across name, phone (raw and digits-only), and email. Phone search
  // strips non-digits on both sides so "0524" matches "+972-52-455-..." etc.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialCustomers;
    const digits = q.replace(/\D/g, "");
    return initialCustomers.filter((c) => {
      const name = c.name.toLowerCase();
      const phoneDigits = c.phone.replace(/\D/g, "");
      const email = (c.email ?? "").toLowerCase();
      if (name.includes(q)) return true;
      if (email.includes(q)) return true;
      if (digits && phoneDigits.includes(digits)) return true;
      return false;
    });
  }, [query, initialCustomers]);

  const totalRevenue = useMemo(
    () => initialCustomers.reduce((sum, c) => sum + c.total_spend, 0),
    [initialCustomers],
  );

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
          Customers · לקוחות
        </p>
        <h1
          className="font-display text-white mb-2"
          style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.05 }}
        >
          לקוחות
        </h1>
        <p
          className="font-body text-white/55"
          style={{ fontSize: 14, fontWeight: 300 }}
        >
          {initialCustomers.length} לקוחות · ₪{totalRevenue.toLocaleString("he-IL")} סך הכנסות
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון או אימייל…"
          className="w-full px-4 py-3 font-body text-white placeholder:text-white/30"
          style={{
            background: "#0d0d0d",
            border: "1px solid rgba(255,255,255,0.12)",
            fontSize: 14,
          }}
        />
      </div>

      {initialCustomers.length === 0 ? (
        <EmptyState
          message="אין לקוחות עדיין"
          sub="הלקוחות יופיעו כאן אוטומטית ברגע שתתקבל ההזמנה הראשונה."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          message="לא נמצאו תוצאות"
          sub={`אין לקוח התואם ל"${query}"`}
        />
      ) : (
        <div
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.12)",
          }}
        >
          <ul className="divide-y divide-white/5">
            {filtered.map((c) => {
              const isExpanded = expanded === c.phone_key;
              return (
                <li key={c.phone_key}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(isExpanded ? null : c.phone_key)
                    }
                    className="w-full text-right p-5 md:p-6 flex items-center gap-5 hover:bg-white/[0.02] transition-colors"
                    aria-expanded={isExpanded}
                  >
                    {/* Visit count badge */}
                    <div
                      className="shrink-0 flex flex-col items-center justify-center w-14 h-14"
                      style={{
                        background: c.completed_visits > 0 ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.03)",
                        border: c.completed_visits > 0 ? "1px solid rgba(201,168,76,0.4)" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span
                        className="font-display"
                        style={{
                          fontSize: 20,
                          lineHeight: 1,
                          color: c.completed_visits > 0 ? "#c9a84c" : "rgba(255,255,255,0.6)",
                        }}
                        dir="ltr"
                      >
                        {c.total_visits}
                      </span>
                      <span
                        className="font-label uppercase mt-0.5"
                        style={{
                          fontSize: 8,
                          fontWeight: 600,
                          letterSpacing: "0.2em",
                          color: "rgba(255,255,255,0.45)",
                        }}
                      >
                        תורים
                      </span>
                    </div>

                    {/* Name + contact */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-display text-white truncate"
                        style={{ fontSize: 18, lineHeight: 1.15 }}
                      >
                        {c.name}
                      </div>
                      <div
                        className="font-body text-white/55 mt-1 truncate"
                        style={{ fontSize: 12, fontWeight: 300 }}
                        dir="ltr"
                      >
                        {c.phone}
                        {c.email && (
                          <>
                            <span className="mx-2 text-white/20">·</span>
                            {c.email}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Last visit + spend */}
                    <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
                      {c.last_visit && (
                        <span
                          className="font-label uppercase text-white/55"
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.22em",
                          }}
                        >
                          אחרון:{" "}
                          {formatInTimeZone(c.last_visit, JERUSALEM_TZ, "dd/MM/yy")}
                        </span>
                      )}
                      {c.total_spend > 0 && (
                        <span
                          className="font-display text-gold-accent"
                          style={{ fontSize: 14, lineHeight: 1 }}
                          dir="ltr"
                        >
                          ₪{c.total_spend.toLocaleString("he-IL")}
                        </span>
                      )}
                    </div>

                    <span
                      aria-hidden
                      className="shrink-0 text-white/30"
                      style={{
                        fontSize: 12,
                        transition: "transform 200ms",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0)",
                      }}
                    >
                      ›
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                        style={{ background: "rgba(0,0,0,0.4)" }}
                      >
                        <div className="px-6 md:px-8 py-5 space-y-4">
                          {/* Quick actions */}
                          <div className="flex flex-wrap gap-2">
                            {c.phone && (
                              <a
                                href={`tel:${c.phone.replace(/\s/g, "")}`}
                                className="font-label uppercase hover:bg-gold-accent hover:text-black transition-colors"
                                style={{
                                  border: "1px solid rgba(201,168,76,0.45)",
                                  color: "#c9a84c",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "8px 14px",
                                  letterSpacing: "0.24em",
                                }}
                              >
                                התקשר
                              </a>
                            )}
                            {c.phone && (
                              <a
                                href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-label uppercase hover:bg-white/5 transition-colors"
                                style={{
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  color: "rgba(255,255,255,0.85)",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "8px 14px",
                                  letterSpacing: "0.24em",
                                }}
                              >
                                WhatsApp
                              </a>
                            )}
                            {c.email && (
                              <a
                                href={`mailto:${c.email}`}
                                className="font-label uppercase hover:bg-white/5 transition-colors"
                                style={{
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  color: "rgba(255,255,255,0.85)",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "8px 14px",
                                  letterSpacing: "0.24em",
                                }}
                              >
                                אימייל
                              </a>
                            )}
                          </div>

                          {/* Services they've used */}
                          {c.services.length > 0 && (
                            <div>
                              <div
                                className="font-label uppercase text-gold-accent mb-2"
                                style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  letterSpacing: "0.32em",
                                }}
                              >
                                שירותים
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {c.services.map((s) => (
                                  <span
                                    key={s}
                                    className="font-body text-white/85"
                                    style={{
                                      background: "rgba(255,255,255,0.04)",
                                      border: "1px solid rgba(255,255,255,0.12)",
                                      fontSize: 11,
                                      padding: "4px 10px",
                                    }}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Booking history */}
                          <div>
                            <div
                              className="font-label uppercase text-gold-accent mb-2"
                              style={{
                                fontSize: 9,
                                fontWeight: 600,
                                letterSpacing: "0.32em",
                              }}
                            >
                              היסטוריית תורים ({c.bookings.length})
                            </div>
                            <ul className="divide-y divide-white/5">
                              {c.bookings.map((b) => {
                                const when = b.slot_start
                                  ? formatInTimeZone(
                                      b.slot_start,
                                      JERUSALEM_TZ,
                                      "dd/MM/yyyy HH:mm",
                                    )
                                  : b.preferred_date
                                    ? `${b.preferred_date} ${b.preferred_time ?? ""}`.trim()
                                    : "—";
                                return (
                                  <li
                                    key={b.id}
                                    className="py-2.5 flex items-center justify-between gap-3 flex-wrap"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span
                                        className="font-display text-white shrink-0"
                                        style={{ fontSize: 13, lineHeight: 1 }}
                                        dir="ltr"
                                      >
                                        {when}
                                      </span>
                                      {b.service?.name && (
                                        <span
                                          className="font-body text-white/55 truncate"
                                          style={{ fontSize: 12, fontWeight: 300 }}
                                        >
                                          · {b.service.name}
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className="font-label uppercase shrink-0"
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: "0.22em",
                                        color: STATUS_COLOR[b.status],
                                      }}
                                    >
                                      {STATUS_LABEL[b.status]}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
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
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div
      className="p-12 text-center"
      style={{
        background: "#080808",
        border: "1px solid rgba(201,168,76,0.12)",
      }}
    >
      <p
        className="font-body text-white/70 mb-2"
        style={{ fontSize: 15, fontWeight: 400 }}
      >
        {message}
      </p>
      <p
        className="font-body text-white/40"
        style={{ fontSize: 12, fontWeight: 300 }}
      >
        {sub}
      </p>
    </div>
  );
}
