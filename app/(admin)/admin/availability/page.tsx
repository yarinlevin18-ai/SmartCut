"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  getAvailabilityConfig,
  updateAvailabilityConfig,
  getBlockedDates,
  addBlockedDate,
  removeBlockedDate,
} from "@/lib/actions";
import type { AvailabilityConfigRow, BlockedDate } from "@/types";

const WEEKDAY_LABELS: Record<number, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
  5: "שישי",
  6: "שבת",
};

const WEEKDAY_EN: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const DEFAULT_ROW = (
  weekday: AvailabilityConfigRow["weekday"]
): AvailabilityConfigRow => ({
  barber_id: null,
  weekday,
  open_time: "09:00",
  close_time: "19:00",
  break_start: null,
  break_end: null,
  is_closed: false,
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function validateRow(row: AvailabilityConfigRow): string | null {
  if (row.is_closed) return null;
  if (!TIME_RE.test(row.open_time) || !TIME_RE.test(row.close_time)) {
    return "פורמט שעה לא חוקי";
  }
  if (timeToMinutes(row.open_time) >= timeToMinutes(row.close_time)) {
    return "שעת סגירה חייבת להיות אחרי שעת פתיחה";
  }
  const hasStart = !!row.break_start;
  const hasEnd = !!row.break_end;
  if (hasStart !== hasEnd) {
    return "יש להזין גם תחילת הפסקה וגם סיום";
  }
  if (hasStart && hasEnd) {
    if (
      !TIME_RE.test(row.break_start as string) ||
      !TIME_RE.test(row.break_end as string)
    ) {
      return "פורמט הפסקה לא חוקי";
    }
    if (
      timeToMinutes(row.break_start as string) >=
      timeToMinutes(row.break_end as string)
    ) {
      return "סיום הפסקה חייב להיות אחרי תחילתה";
    }
  }
  return null;
}

const inputClass =
  "px-3 py-2 bg-[#141417] border border-white/10 rounded text-white focus:outline-none focus:border-gold-accent/50 focus:ring-1 focus:ring-gold-accent/30 transition-colors font-body";

const labelClass = "font-label uppercase text-white/45";

const sectionBoxStyle = {
  background: "#080808",
  border: "1px solid rgba(201,168,76,0.12)",
};

const primaryBtn =
  "font-label uppercase transition-all duration-200 hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed";

const primaryBtnStyle = {
  border: "1px solid #c9a84c",
  color: "#000",
  background: "#c9a84c",
  fontSize: 11,
  fontWeight: 700,
  padding: "10px 28px",
  borderRadius: 0,
  letterSpacing: "0.28em",
} as const;

const secondaryBtn =
  "font-label uppercase transition-all hover:bg-gold-accent hover:text-black";

const secondaryBtnStyle = {
  border: "1px solid rgba(201,168,76,0.35)",
  color: "#c9a84c",
  background: "transparent",
  fontSize: 10,
  fontWeight: 600,
  padding: "8px 16px",
  borderRadius: 0,
  letterSpacing: "0.28em",
} as const;

const dangerBtn =
  "font-label uppercase transition-all hover:bg-red-500/10 hover:text-red-300";

const dangerBtnStyle = {
  border: "1px solid rgba(239,68,68,0.3)",
  color: "rgba(239,68,68,0.85)",
  background: "transparent",
  fontSize: 10,
  fontWeight: 600,
  padding: "8px 16px",
  borderRadius: 0,
  letterSpacing: "0.28em",
} as const;

type SaveStatus = "idle" | "saving" | "success" | "error";

export default function AvailabilityPage() {
  const [rows, setRows] = useState<AvailabilityConfigRow[]>([]);
  const [originalRows, setOriginalRows] = useState<AvailabilityConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleStatus, setScheduleStatus] = useState<SaveStatus>("idle");
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [addStatus, setAddStatus] = useState<SaveStatus>("idle");
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    void loadAll();
  }, []);

  const loadAll = async (): Promise<void> => {
    const [cfgRes, blockedRes] = await Promise.all([
      getAvailabilityConfig(),
      getBlockedDates(),
    ]);

    let cfg: AvailabilityConfigRow[] = [];
    if (cfgRes.success && cfgRes.data) {
      cfg = cfgRes.data;
    }
    const byWeekday = new Map<number, AvailabilityConfigRow>();
    cfg.forEach((r) => byWeekday.set(r.weekday, r));
    const filled: AvailabilityConfigRow[] = (
      [0, 1, 2, 3, 4, 5, 6] as const
    ).map((w) => byWeekday.get(w) ?? DEFAULT_ROW(w));
    setRows(filled);
    setOriginalRows(filled);

    if (blockedRes.success && blockedRes.data) {
      setBlocked(blockedRes.data);
    }

    setLoading(false);
  };

  const rowErrors = useMemo(() => rows.map((r) => validateRow(r)), [rows]);
  const hasErrors = rowErrors.some((e) => e !== null);

  const isDirty = useMemo(() => {
    if (rows.length !== originalRows.length) return true;
    return rows.some((r, i) => {
      const o = originalRows[i];
      if (!o) return true;
      return (
        r.is_closed !== o.is_closed ||
        r.open_time !== o.open_time ||
        r.close_time !== o.close_time ||
        (r.break_start ?? "") !== (o.break_start ?? "") ||
        (r.break_end ?? "") !== (o.break_end ?? "")
      );
    });
  }, [rows, originalRows]);

  const updateRow = (
    weekday: number,
    patch: Partial<AvailabilityConfigRow>
  ): void => {
    setRows((prev) =>
      prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r))
    );
    if (scheduleStatus === "success") setScheduleStatus("idle");
  };

  const handleSaveSchedule = async (): Promise<void> => {
    setScheduleError(null);
    if (hasErrors) {
      setScheduleStatus("error");
      setScheduleError("יש שגיאות בטופס — אנא תקן לפני שמירה");
      return;
    }
    setScheduleStatus("saving");
    const res = await updateAvailabilityConfig(rows);
    if (!res.success) {
      setScheduleStatus("error");
      setScheduleError(res.error || "שמירה נכשלה");
      return;
    }
    if (res.data) {
      setRows(res.data);
      setOriginalRows(res.data);
    } else {
      setOriginalRows(rows);
    }
    setScheduleStatus("success");
    setTimeout(() => {
      setScheduleStatus((s) => (s === "success" ? "idle" : s));
    }, 2500);
  };

  const handleAddBlocked = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAddError(null);
    if (!newDate) {
      setAddError("יש לבחור תאריך");
      setAddStatus("error");
      return;
    }
    setAddStatus("saving");
    const res = await addBlockedDate(newDate, newReason || undefined);
    if (!res.success) {
      setAddStatus("error");
      setAddError(res.error || "הוספה נכשלה");
      return;
    }
    if (res.data) {
      const inserted = res.data;
      setBlocked((prev) =>
        [...prev, inserted].sort((a, b) => a.date.localeCompare(b.date))
      );
    }
    setNewDate("");
    setNewReason("");
    setAddStatus("success");
    setTimeout(() => {
      setAddStatus((s) => (s === "success" ? "idle" : s));
    }, 2000);
  };

  const handleRemoveBlocked = async (date: string): Promise<void> => {
    const res = await removeBlockedDate(date);
    setConfirmDelete(null);
    if (!res.success) {
      alert("מחיקה נכשלה: " + res.error);
      return;
    }
    setBlocked((prev) => prev.filter((b) => b.date !== date));
  };

  const formatDateHe = (iso: string): string => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  if (loading) {
    return (
      <div
        className="py-16 text-center font-body text-white/40"
        style={{ fontSize: 13 }}
      >
        טוען זמינות…
      </div>
    );
  }

  return (
    <div className="max-w-5xl" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10"
      >
        <p
          className="font-label uppercase text-gold-accent mb-3"
          style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.36em" }}
        >
          Availability · זמינות
        </p>
        <h1
          className="font-display text-white mb-2"
          style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.05 }}
        >
          ניהול זמינות
        </h1>
        <p
          className="font-body text-white/55"
          style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}
        >
          עריכת לוח שעות שבועי וחסימת תאריכים חד-פעמיים (חופשות, חגים).
        </p>
      </motion.div>

      {/* Section A: Weekly schedule */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="mb-12"
        style={sectionBoxStyle}
      >
        <div
          className="px-6 md:px-7 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2
            className="font-display text-white"
            style={{ fontSize: 22, lineHeight: 1.2 }}
          >
            לוח שעות שבועי
          </h2>
          <p
            className="font-body text-white/50 mt-1"
            style={{ fontSize: 12, fontWeight: 300 }}
          >
            ימים ושעות פתיחה. הפסקה אופציונלית.
          </p>
        </div>

        <ul className="divide-y divide-white/5">
          {rows.map((row, idx) => {
            const error = rowErrors[idx];
            return (
              <li key={row.weekday} className="px-4 md:px-7 py-5">
                {/* Mobile: vertical stack — day header on its own row, then
                    the inputs as a single column so the labels (with their
                    heavy letter-spacing) get the full container width and
                    don't visually merge into each other. Desktop keeps the
                    horizontal flow. */}
                <div className="flex flex-col md:flex-row md:items-start gap-3 md:gap-5">
                  {/* Day header + closed-toggle on one line on mobile */}
                  <div className="flex items-center justify-between gap-3 md:flex-col md:items-start md:w-32 md:shrink-0">
                    <div>
                      <div
                        className="font-display text-white"
                        style={{ fontSize: 18 }}
                      >
                        {WEEKDAY_LABELS[row.weekday]}
                      </div>
                      <div
                        className={labelClass}
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: "0.32em",
                        }}
                        dir="ltr"
                      >
                        {WEEKDAY_EN[row.weekday]}
                      </div>
                    </div>

                    <label
                      className="flex items-center gap-2 shrink-0 cursor-pointer select-none md:mt-1"
                    >
                      <input
                        type="checkbox"
                        checked={row.is_closed}
                        onChange={(e) =>
                          updateRow(row.weekday, { is_closed: e.target.checked })
                        }
                        className="accent-gold-accent w-4 h-4"
                      />
                      <span
                        className="font-body text-white/80"
                        style={{ fontSize: 13 }}
                      >
                        סגור
                      </span>
                    </label>
                  </div>

                  {!row.is_closed && (
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={labelClass}
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.28em",
                          }}
                        >
                          פתיחה
                        </span>
                        <input
                          type="time"
                          value={row.open_time}
                          onChange={(e) =>
                            updateRow(row.weekday, {
                              open_time: e.target.value,
                            })
                          }
                          className={inputClass}
                          style={{ fontSize: 13 }}
                          dir="ltr"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span
                          className={labelClass}
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.28em",
                          }}
                        >
                          סגירה
                        </span>
                        <input
                          type="time"
                          value={row.close_time}
                          onChange={(e) =>
                            updateRow(row.weekday, {
                              close_time: e.target.value,
                            })
                          }
                          className={inputClass}
                          style={{ fontSize: 13 }}
                          dir="ltr"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span
                          className={labelClass}
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.28em",
                          }}
                        >
                          תחילת הפסקה
                        </span>
                        <input
                          type="time"
                          value={row.break_start ?? ""}
                          onChange={(e) =>
                            updateRow(row.weekday, {
                              break_start: e.target.value || null,
                            })
                          }
                          className={inputClass}
                          style={{ fontSize: 13 }}
                          dir="ltr"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span
                          className={labelClass}
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.28em",
                          }}
                        >
                          סיום הפסקה
                        </span>
                        <input
                          type="time"
                          value={row.break_end ?? ""}
                          onChange={(e) =>
                            updateRow(row.weekday, {
                              break_end: e.target.value || null,
                            })
                          }
                          className={inputClass}
                          style={{ fontSize: 13 }}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}

                  {row.is_closed && (
                    <div
                      className="flex-1 font-body text-white/35 italic mt-2"
                      style={{ fontSize: 13 }}
                    >
                      היום סגור — אין תורים זמינים
                    </div>
                  )}
                </div>

                {error && (
                  <div
                    className="mt-3 font-body"
                    style={{
                      fontSize: 12,
                      fontWeight: 300,
                      color: "rgba(239,68,68,0.9)",
                    }}
                    role="alert"
                  >
                    {error}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div
          className="px-6 md:px-7 py-5 flex items-center justify-between gap-3 flex-wrap"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="min-h-[20px] flex items-center">
            {scheduleStatus === "success" && (
              <span
                className="font-label uppercase text-gold-accent flex items-center gap-2"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.28em",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                לוח השעות נשמר
              </span>
            )}
            {scheduleStatus === "error" && scheduleError && (
              <span
                className="font-body"
                style={{
                  fontSize: 12,
                  fontWeight: 300,
                  color: "rgba(239,68,68,0.9)",
                }}
                role="alert"
              >
                {scheduleError}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveSchedule}
            disabled={!isDirty || hasErrors || scheduleStatus === "saving"}
            className={primaryBtn}
            style={primaryBtnStyle}
          >
            {scheduleStatus === "saving" ? "שומר..." : "שמור"}
          </button>
        </div>
      </motion.section>

      {/* Section B: Blocked dates */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        style={sectionBoxStyle}
      >
        <div
          className="px-6 md:px-7 py-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2
            className="font-display text-white"
            style={{ fontSize: 22, lineHeight: 1.2 }}
          >
            תאריכים חסומים
          </h2>
          <p
            className="font-body text-white/50 mt-1"
            style={{ fontSize: 12, fontWeight: 300 }}
          >
            סגירות חד-פעמיות — חגים, ימי מחלה, חופשות.
          </p>
        </div>

        <form
          onSubmit={handleAddBlocked}
          className="px-5 md:px-7 py-5 grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 items-end"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="blocked-date"
              className={labelClass}
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.28em",
              }}
            >
              תאריך
            </label>
            <input
              id="blocked-date"
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                if (addStatus !== "idle") setAddStatus("idle");
                setAddError(null);
              }}
              className={inputClass}
              style={{ fontSize: 13 }}
              dir="ltr"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="blocked-reason"
              className={labelClass}
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.28em",
              }}
            >
              סיבה (אופציונלי)
            </label>
            <input
              id="blocked-reason"
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className={inputClass}
              style={{ fontSize: 13 }}
              placeholder="למשל: ראש השנה"
            />
          </div>

          <button
            type="submit"
            disabled={!newDate || addStatus === "saving"}
            className={primaryBtn}
            style={primaryBtnStyle}
          >
            {addStatus === "saving" ? "מוסיף..." : "הוסף"}
          </button>
        </form>

        {addStatus === "error" && addError && (
          <div
            className="px-6 md:px-7 pb-4 font-body"
            style={{
              fontSize: 12,
              fontWeight: 300,
              color: "rgba(239,68,68,0.9)",
            }}
            role="alert"
          >
            {addError}
          </div>
        )}
        {addStatus === "success" && (
          <div
            className="px-6 md:px-7 pb-4 font-label uppercase text-gold-accent"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.28em",
            }}
          >
            התאריך נחסם
          </div>
        )}

        {blocked.length === 0 ? (
          <div
            className="px-6 md:px-7 py-10 text-center font-body text-white/40"
            style={{ fontSize: 13, fontWeight: 300 }}
          >
            אין תאריכים חסומים
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {blocked.map((b) => (
              <li
                key={b.date}
                className="px-5 md:px-7 py-4 flex items-center gap-5 hover:bg-white/[0.02] transition-colors flex-wrap"
              >
                <div className="shrink-0 min-w-[140px]">
                  <div
                    className="font-display text-white"
                    style={{ fontSize: 16 }}
                  >
                    {formatDateHe(b.date)}
                  </div>
                  <div
                    className={labelClass}
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.28em",
                    }}
                    dir="ltr"
                  >
                    {b.date}
                  </div>
                </div>

                <div
                  className="flex-1 min-w-0 font-body text-white/65"
                  style={{ fontSize: 13, fontWeight: 300 }}
                >
                  {b.reason || (
                    <span className="text-white/30 italic">ללא סיבה</span>
                  )}
                </div>

                <div className="shrink-0">
                  {confirmDelete === b.date ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className={secondaryBtn}
                        style={secondaryBtnStyle}
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlocked(b.date)}
                        className="font-label uppercase transition-all hover:opacity-90"
                        style={{
                          border: "1px solid rgb(239,68,68)",
                          color: "#fff",
                          background: "rgb(220,38,38)",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "8px 16px",
                          borderRadius: 0,
                          letterSpacing: "0.28em",
                        }}
                      >
                        אשר מחיקה
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(b.date)}
                      aria-label="מחק תאריך חסום"
                      className={dangerBtn}
                      style={dangerBtnStyle}
                    >
                      מחק
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </div>
  );
}
