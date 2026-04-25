"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  getNotifications,
  markNotificationSent,
  skipNotification,
  retryNotification,
  type NotificationWithBooking,
} from "@/lib/actions";
import { renderSmsBody } from "@/lib/sms/templates";
import type { NotificationStatus, NotificationTemplate } from "@/types";

type StatusFilter = NotificationStatus | "all";

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string; en: string }> = [
  { value: "all",      label: "הכל",       en: "All" },
  { value: "queued",   label: "בהמתנה",    en: "Queued" },
  { value: "sending",  label: "בשליחה",    en: "Sending" },
  { value: "sent",     label: "נשלח",      en: "Sent" },
  { value: "failed",   label: "נכשל",      en: "Failed" },
  { value: "skipped",  label: "דולג",      en: "Skipped" },
];

const TEMPLATE_LABELS: Record<NotificationTemplate, string> = {
  booking_confirmed: "אישור תור",
  booking_reminder_24h: "תזכורת 24 שעות",
  booking_cancelled: "ביטול תור",
  booking_rescheduled: "שינוי מועד",
  booking_pending: "בקשת תור התקבלה",
  booking_approved: "תור אושר",
  booking_denied: "תור נדחה",
  booking_alternative_offered: "מועד חלופי הוצע",
};

const STATUS_COLOR: Record<NotificationStatus, string> = {
  queued: "#7a7a80",
  sending: "#c9a84c",
  sent: "#4ade80",
  failed: "#f87171",
  skipped: "#52525b",
};

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sinceDays, setSinceDays] = useState<number>(7);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getNotifications({ status: statusFilter, sinceDays });
    setRows(result.success && result.data ? result.data : []);
    setLoading(false);
  }, [statusFilter, sinceDays]);

  useEffect(() => {
    load();
  }, [load]);

  const fmtDateTime = (s: string) =>
    new Intl.DateTimeFormat("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(s));

  const handleCopy = async (id: string, body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleAction = (
    id: string,
    fn: (id: string) => Promise<{ success: boolean }>
  ) => {
    startTransition(async () => {
      const res = await fn(id);
      if (res.success) await load();
    });
  };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <p
          className="font-label uppercase text-gold-accent mb-3"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.36em" }}
        >
          Notifications · התראות
        </p>
        <h1
          className="font-display text-white mb-2"
          style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.05 }}
        >
          תור שליחה
        </h1>
        <p
          className="font-body text-white/55"
          style={{ fontSize: 14, fontWeight: 300 }}
        >
          {rows.length} התראות בטווח ה-{sinceDays} ימים האחרונים
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className="font-label uppercase transition-colors"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.24em",
                  padding: "8px 14px",
                  border: `1px solid ${active ? "#c9a84c" : "rgba(201,168,76,0.2)"}`,
                  background: active ? "rgba(201,168,76,0.12)" : "transparent",
                  color: active ? "#c9a84c" : "rgba(255,255,255,0.6)",
                  borderRadius: 0,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <select
          value={sinceDays}
          onChange={(e) => setSinceDays(Number(e.target.value))}
          className="font-body text-white"
          style={{
            background: "#0d0d0d",
            border: "1px solid rgba(201,168,76,0.2)",
            padding: "8px 12px",
            fontSize: 13,
            borderRadius: 0,
          }}
        >
          <option value={1}>24 שעות</option>
          <option value={7}>7 ימים</option>
          <option value={30}>30 ימים</option>
          <option value={90}>90 ימים</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center font-body text-white/40" style={{ fontSize: 13 }}>טוען…</div>
      ) : rows.length === 0 ? (
        <div
          className="p-12 text-center font-body text-white/40"
          style={{
            background: "#080808",
            border: "1px solid rgba(201,168,76,0.12)",
            fontSize: 13,
          }}
        >
          אין התראות בטווח הנבחר
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((n, idx) => {
            const isExpanded = expanded === n.id;
            const body = renderSmsBody(n.template, n.payload ?? {});
            const customerName = n.bookings?.full_name ?? "—";
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                style={{
                  background: "#080808",
                  border: "1px solid rgba(201,168,76,0.12)",
                }}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : n.id)}
                  className="w-full text-right p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Status dot */}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: STATUS_COLOR[n.status],
                      flexShrink: 0,
                    }}
                    title={n.status}
                  />
                  {/* Template */}
                  <div className="font-body text-white" style={{ fontSize: 13, fontWeight: 500, minWidth: 110 }}>
                    {TEMPLATE_LABELS[n.template]}
                  </div>
                  {/* Customer */}
                  <div className="font-body text-white/70" style={{ fontSize: 13, minWidth: 140 }}>
                    {customerName}
                  </div>
                  {/* Recipient */}
                  <div className="font-body text-white/55" style={{ fontSize: 12 }} dir="ltr">
                    {n.recipient}
                  </div>
                  {/* Spacer */}
                  <div className="flex-1" />
                  {/* Scheduled */}
                  <div className="font-label uppercase text-white/40" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
                    {fmtDateTime(n.scheduled_for)}
                  </div>
                  {/* Status label */}
                  <div
                    className="font-label uppercase"
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.28em",
                      color: STATUS_COLOR[n.status],
                      minWidth: 60,
                      textAlign: "left",
                    }}
                  >
                    {n.status}
                  </div>
                </button>

                {isExpanded && (
                  <div
                    className="px-4 pb-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    {/* Rendered body */}
                    <div className="mt-3 mb-2 font-label uppercase text-white/40" style={{ fontSize: 9, letterSpacing: "0.32em" }}>
                      גוף ההודעה
                    </div>
                    <div
                      className="p-3 font-body text-white/85"
                      style={{
                        background: "#0d0d0d",
                        border: "1px solid rgba(255,255,255,0.06)",
                        fontSize: 13,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                      }}
                    >
                      {body}
                    </div>

                    {/* Error if any */}
                    {n.error && (
                      <div className="mt-3 p-3 font-body" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", fontSize: 12, color: "#fca5a5" }}>
                        {n.error}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 font-body text-white/60" style={{ fontSize: 11 }}>
                      <div><span className="text-white/40">attempts:</span> {n.attempts}</div>
                      <div><span className="text-white/40">provider:</span> {n.provider ?? "—"}</div>
                      <div><span className="text-white/40">sent_at:</span> {n.sent_at ? fmtDateTime(n.sent_at) : "—"}</div>
                      <div><span className="text-white/40">created:</span> {fmtDateTime(n.created_at)}</div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopy(n.id, body)}
                        className="font-label uppercase transition-colors"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: "0.24em",
                          padding: "8px 14px",
                          border: "1px solid rgba(201,168,76,0.4)",
                          background: copiedId === n.id ? "rgba(74,222,128,0.12)" : "transparent",
                          color: copiedId === n.id ? "#4ade80" : "#c9a84c",
                          borderRadius: 0,
                        }}
                      >
                        {copiedId === n.id ? "הועתק" : "העתק טקסט"}
                      </button>
                      {(n.status === "queued" || n.status === "sending" || n.status === "failed") && (
                        <button
                          onClick={() => handleAction(n.id, markNotificationSent)}
                          className="font-label uppercase transition-colors"
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.24em",
                            padding: "8px 14px",
                            border: "1px solid rgba(74,222,128,0.4)",
                            background: "transparent",
                            color: "#4ade80",
                            borderRadius: 0,
                          }}
                        >
                          סמן כנשלח
                        </button>
                      )}
                      {(n.status === "queued" || n.status === "failed") && (
                        <button
                          onClick={() => handleAction(n.id, skipNotification)}
                          className="font-label uppercase transition-colors"
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.24em",
                            padding: "8px 14px",
                            border: "1px solid rgba(255,255,255,0.2)",
                            background: "transparent",
                            color: "rgba(255,255,255,0.7)",
                            borderRadius: 0,
                          }}
                        >
                          דלג
                        </button>
                      )}
                      {(n.status === "failed" || n.status === "skipped") && (
                        <button
                          onClick={() => handleAction(n.id, retryNotification)}
                          className="font-label uppercase transition-colors"
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: "0.24em",
                            padding: "8px 14px",
                            border: "1px solid rgba(201,168,76,0.4)",
                            background: "transparent",
                            color: "#c9a84c",
                            borderRadius: 0,
                          }}
                        >
                          נסה שוב
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
