"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { he } from "date-fns/locale/he";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { getAvailableSlots, createBooking } from "@/lib/actions";
import type { Service } from "@/types";

const JERUSALEM_TZ = "Asia/Jerusalem";

interface BookingFormProps {
  services: Service[];
  preselectedServiceId?: string | null;
}

const bookingSchema = z.object({
  full_name: z
    .string({ required_error: "שדה חובה" })
    .trim()
    .min(2, "שם חייב לכלול לפחות 2 תווים"),
  phone: z
    .string({ required_error: "שדה חובה" })
    .trim()
    .min(9, "מספר הטלפון לא תקין"),
  service_id: z.string().uuid("בחירת שירות חובה"),
  slot_start: z.string().min(1, "בחירת זמן חובה"),
  notes: z.string().optional(),
});

type BookingFormInputs = z.infer<typeof bookingSchema>;

export function BookingForm({
  services,
  preselectedServiceId,
}: BookingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<BookingFormInputs>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service_id: preselectedServiceId ?? "",
      slot_start: "",
    },
  });

  const serviceId = watch("service_id");
  const slotStart = watch("slot_start");

  const handleInputFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Sync preselected service id once on mount.
  useEffect(() => {
    if (preselectedServiceId) {
      setValue("service_id", preselectedServiceId);
    }
  }, [preselectedServiceId, setValue]);

  // Key derived from service + date for stale-request guarding.
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
    setValue("slot_start", "");
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
    // refetchKey already captures both serviceId and selectedDate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchKey, fetchSlots, setValue]);

  const refetchSlots = useCallback(() => {
    if (!serviceId || !selectedDate) return;
    const signal = { cancelled: false };
    fetchSlots(serviceId, selectedDate, signal);
  }, [serviceId, selectedDate, fetchSlots]);

  const onSubmit = async (data: BookingFormInputs): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createBooking({
        full_name: data.full_name,
        phone: data.phone,
        service_id: data.service_id,
        slot_start: data.slot_start,
        notes: data.notes,
      });

      if (!result.success) {
        const err = result.error || "";
        if (err === "SLOT_TAKEN") {
          setSubmitError("המשבצת נתפסה, בחר זמן אחר");
          setValue("slot_start", "");
          refetchSlots();
        } else if (err === "SLOT_IN_PAST") {
          setSubmitError("הזמן שנבחר עבר, בחר זמן אחר");
          setValue("slot_start", "");
          refetchSlots();
        } else if (err === "Invalid phone") {
          setSubmitError("מספר טלפון לא תקין");
        } else {
          setSubmitError(err || "משהו השתבש. נסו שוב.");
        }
        return;
      }

      setSuccessModal(true);
      reset({
        service_id: preselectedServiceId ?? "",
        slot_start: "",
        full_name: "",
        phone: "",
        notes: "",
      });
      setSelectedDate(undefined);
      setSlots([]);
    } catch {
      setSubmitError("משהו השתבש. נסו שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasServices = services.length > 0;
  const showSlotsPanel = Boolean(serviceId && selectedDate);

  return (
    <>
      <main className="min-h-screen bg-dark py-20" suppressHydrationWarning>
        {/* DayPicker v9 dark + RTL theming */}
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

        <div className="max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-5xl text-center text-white mb-4">
              הזמנת תור
            </h1>
            <p className="text-center text-gray-400 mb-12">
              ממלאים פרטים, אנחנו מדאגים לשאר
            </p>

            <form
              ref={formRef}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* Full Name */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Input
                  label="שם מלא *"
                  placeholder="ישראל ישראלי"
                  aria-required="true"
                  {...register("full_name")}
                  dir="auto"
                  onFocus={handleInputFocus}
                  error={errors.full_name?.message}
                />
              </motion.div>

              {/* Phone */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                <Input
                  type="tel"
                  label="טלפון *"
                  placeholder="050-000-0000"
                  aria-required="true"
                  inputMode="tel"
                  {...register("phone")}
                  dir="auto"
                  onFocus={handleInputFocus}
                  error={errors.phone?.message}
                />
              </motion.div>

              {/* Service Selection */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  בחירת שירות *
                </label>
                {hasServices ? (
                  <select
                    {...register("service_id")}
                    dir="auto"
                    aria-required="true"
                    className="w-full px-4 py-4 bg-[#141417] border border-white/10 rounded text-white focus:outline-none focus:border-gold-accent/50 focus:ring-1 focus:ring-gold-accent/30 transition-colors"
                  >
                    <option value="">— בחרו שירות —</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                        {service.price != null ? ` - ₪${service.price}` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-4 py-4 bg-[#141417] border border-white/10 rounded text-gray-400">
                    אין שירותים זמינים כרגע
                  </div>
                )}
                {errors.service_id?.message && (
                  <p className="text-red-400 text-sm mt-2">
                    {errors.service_id.message}
                  </p>
                )}
              </motion.div>

              {/* Calendar */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.22 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  תאריך *
                </label>
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
              </motion.div>

              {/* Slots */}
              {showSlotsPanel && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    בחירת שעה *
                  </label>
                  <div className="bg-[#141417] border border-white/10 rounded p-4">
                    {slotsLoading ? (
                      <div className="text-center text-gray-400 py-6 text-sm">
                        טוען...
                      </div>
                    ) : slotsError ? (
                      <div className="text-center text-red-400 py-6 text-sm">
                        {slotsError}
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="text-center text-gray-400 py-6 text-sm">
                        אין משבצות זמינות ביום זה — נסו תאריך אחר.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map((iso) => {
                          const label = formatInTimeZone(
                            iso,
                            JERUSALEM_TZ,
                            "HH:mm",
                          );
                          const isActive = slotStart === iso;
                          return (
                            <button
                              key={iso}
                              type="button"
                              onClick={() =>
                                setValue("slot_start", iso, {
                                  shouldValidate: true,
                                })
                              }
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
                  {errors.slot_start?.message && (
                    <p className="text-red-400 text-sm mt-2">
                      {errors.slot_start.message}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Notes */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  הערות (לא חובה)
                </label>
                <textarea
                  {...register("notes")}
                  dir="auto"
                  rows={3}
                  onFocus={handleInputFocus}
                  className="w-full px-4 py-4 bg-[#141417] border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gold-accent/50 focus:ring-1 focus:ring-gold-accent/30 transition-colors resize-y"
                  placeholder="משהו שכדאי שנדע מראש?"
                />
              </motion.div>

              {submitError && (
                <div
                  role="alert"
                  className="bg-red-500/10 border border-red-500/20 rounded px-4 py-3 text-red-400 text-sm"
                >
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || !hasServices}
                >
                  {isSubmitting ? "שולח..." : "קבע תור"}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => setSuccessModal(false)}
        title="הצלחנו!"
      >
        <div className="text-center">
          <p className="text-gray-300">נרשמת בהצלחה. ניצור קשר בקרוב.</p>
        </div>
      </Modal>
    </>
  );
}
