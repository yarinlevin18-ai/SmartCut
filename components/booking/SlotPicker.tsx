"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { he } from "date-fns/locale/he";
import { formatInTimeZone } from "date-fns-tz";
import { motion } from "framer-motion";
import { getAvailableSlots } from "@/lib/actions";

const JERUSALEM_TZ = "Asia/Jerusalem";

export interface SlotPickerProps {
  /** Service id to fetch slots for. When null, picker is idle. */
  serviceId: string | null;
  /** Current selected slot ISO; null when nothing chosen. */
  value: string | null;
  /** Fires whenever selection changes. Null on date/service change. */
  onChange: (iso: string | null) => void;
  /** Hebrew label above the calendar; default "תאריך *". */
  dateLabel?: string;
  /** Hebrew label above the slot grid; default "בחירת שעה *". */
  timeLabel?: string;
  /** Optional initial date — useful when prefilling for reschedule. */
  initialDate?: Date;
}

export function SlotPicker({
  serviceId,
  value,
  onChange,
  dateLabel = "תאריך *",
  timeLabel = "בחירת שעה *",
  initialDate,
}: SlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Stale-request guard key.
  const refetchKey = useMemo(() => {
    if (!serviceId || !selectedDate) return null;
    const dateStr = formatInTimeZone(selectedDate, JERUSALEM_TZ, "yyyy-MM-dd");
    return `${serviceId}|${dateStr}`;
  }, [serviceId, selectedDate]);

  const fetchSlots = useCallback(
    async (svcId: string, date: Date, signal: { cancelled: boolean }) => {
      setSlotsLoading(true);
      setSlotsError(null);
      const dateStr = formatInTimeZone(date, JERUSALEM_TZ, "yyyy-MM-dd");
      const result = await getAvailableSlots(svcId, dateStr);
      if (signal.cancelled) return;
      if (!result.success) {
        setSlots([]);
        setSlotsError(result.error || "לא הצלחנו לטעון משבצות זמינות");
      } else {
        setSlots(result.data ?? []);
      }
      setSlotsLoading(false);
    },
    [],
  );

  useEffect(() => {
    onChange(null);
    if (!serviceId || !selectedDate) {
      setSlots([]);
      setSlotsError(null);
      setSlotsLoading(false);
      return;
    }
    const signal = { cancelled: false };
    fetchSlots(serviceId, selectedDate, signal);
    return () => {
      signal.cancelled = true;
    };
    // refetchKey covers serviceId + selectedDate; onChange identity doesn't matter for the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchKey, fetchSlots]);

  const showSlotsPanel = Boolean(serviceId && selectedDate);

  return (
    <>
      {/* DayPicker v9 dark + RTL theming. Scoped to the .booking-rdp wrapper. */}
      <style>{`
        .booking-rdp .rdp-root {
          --rdp-accent-color: #c9a84c;
          --rdp-accent-background-color: transparent;
          --rdp-day-height: 2.5rem;
          --rdp-day-width: 2.5rem;
          color: white;
        }
        .booking-rdp .rdp-month_caption,
        .booking-rdp .rdp-caption_label,
        .booking-rdp .rdp-weekday,
        .booking-rdp .rdp-head_cell,
        .booking-rdp .rdp-nav_button,
        .booking-rdp .rdp-button_previous,
        .booking-rdp .rdp-button_next {
          color: white;
        }
        .booking-rdp .rdp-day_button {
          color: white;
        }
        .booking-rdp .rdp-day_button:hover:not([disabled]) {
          background-color: rgba(201, 168, 76, 0.15);
        }
        .booking-rdp .rdp-selected .rdp-day_button,
        .booking-rdp .rdp-day_selected .rdp-day_button {
          background-color: #c9a84c !important;
          color: #0d0d0d !important;
        }
        .booking-rdp .rdp-disabled {
          opacity: 0.25;
        }
        .booking-rdp .rdp-today:not(.rdp-selected) .rdp-day_button {
          color: #e2c97e;
          font-weight: 700;
        }
        .booking-rdp .rdp-chevron {
          fill: white;
        }
      `}</style>

      {/* Calendar */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{dateLabel}</label>
        <div className="booking-rdp bg-[#141417] border border-white/10 rounded p-3 flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            dir="rtl"
            locale={he}
            disabled={[{ before: new Date() }, { dayOfWeek: [6] }]}
            weekStartsOn={0}
          />
        </div>
      </div>

      {/* Slot grid */}
      {showSlotsPanel && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <label className="block text-sm font-medium text-gray-300 mb-4">{timeLabel}</label>
          <div className="bg-[#141417] border border-white/10 rounded p-4">
            {slotsLoading ? (
              <div className="text-center text-gray-400 py-6 text-sm">טוען...</div>
            ) : slotsError ? (
              <div className="text-center text-red-400 py-6 text-sm">{slotsError}</div>
            ) : slots.length === 0 ? (
              <div className="text-center text-gray-400 py-6 text-sm">
                אין משבצות זמינות ביום זה — נסו תאריך אחר.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((iso) => {
                  const label = formatInTimeZone(iso, JERUSALEM_TZ, "HH:mm");
                  const isActive = value === iso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => onChange(iso)}
                      aria-pressed={isActive}
                      className={`px-3 py-2 text-sm text-center rounded border transition-colors ${
                        isActive
                          ? "bg-gold-accent text-black border-gold-accent"
                          : "text-gray-300 bg-dark border-white/10 hover:border-gold-accent/50 hover:text-gold-accent"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
}
