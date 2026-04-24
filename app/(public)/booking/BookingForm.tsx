"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createBooking } from "@/lib/actions";
import type { Service } from "@/types";

interface BookingFormProps {
  services: Service[];
  preselectedServiceId?: string | null;
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function BookingForm({
  services,
  preselectedServiceId,
}: BookingFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const today = useMemo(() => todayIso(), []);

  const bookingSchema = useMemo(
    () =>
      z.object({
        full_name: z
          .string({ required_error: "שדה חובה" })
          .trim()
          .min(2, "שם חייב לכלול לפחות 2 תווים"),
        phone: z
          .string({ required_error: "שדה חובה" })
          .trim()
          .min(9, "מספר הטלפון לא תקין")
          .regex(/^[0-9+\-\s()]+$/, "מספר הטלפון לא תקין"),
        service_id: z
          .string({ required_error: "בחירת שירות חובה" })
          .min(1, "בחירת שירות חובה"),
        preferred_date: z
          .string({ required_error: "תאריך חובה" })
          .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
          .refine((value) => value >= today, {
            message: "לא ניתן לבחור תאריך שעבר",
          }),
        preferred_time: z.preprocess(
          (v) => (v == null ? "" : v),
          z.string().min(1, "בחירת שעה חובה"),
        ),
      }),
    [today],
  );

  type BookingFormInputs = z.infer<typeof bookingSchema>;

  const handleInputFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control,
  } = useForm<BookingFormInputs>({
    resolver: zodResolver(bookingSchema),
  });

  const selectedTime = useWatch({ control, name: "preferred_time" });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedServiceId) {
      setValue("service_id", preselectedServiceId);
    }
  }, [preselectedServiceId, setValue]);

  const onSubmit = async (data: BookingFormInputs): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createBooking({
        full_name: data.full_name,
        phone: data.phone,
        service_id: data.service_id,
        preferred_date: data.preferred_date,
        preferred_time: data.preferred_time,
      });

      if (!result.success) {
        setSubmitError(result.error || "משהו השתבש. נסו שוב.");
        return;
      }

      setSuccessModal(true);
      reset();
      setSelectedDay(null);
      setTimeout(() => {
        const wixUrl =
          process.env.NEXT_PUBLIC_WIX_BOOKING_URL ||
          "https://www.carmelis-studio.com/book-online";
        window.open(wixUrl, "_blank");
      }, 1500);
    } catch {
      setSubmitError("משהו השתבש. נסו שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasServices = services.length > 0;

  return (
    <>
      <main className="min-h-screen bg-dark py-20" suppressHydrationWarning>
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
                    defaultValue={preselectedServiceId ?? ""}
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

              {/* Preferred Date */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.22 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  תאריך *
                </label>
                <input
                  type="date"
                  min={today}
                  aria-required="true"
                  {...register("preferred_date")}
                  dir="auto"
                  onFocus={handleInputFocus}
                  className="w-full px-4 py-4 bg-[#141417] border border-white/10 rounded text-white focus:outline-none focus:border-gold-accent/50 focus:ring-1 focus:ring-gold-accent/30 transition-colors"
                />
                {errors.preferred_date?.message && (
                  <p className="text-red-400 text-sm mt-2">
                    {errors.preferred_date.message}
                  </p>
                )}
              </motion.div>

              {/* Time Slots Selection */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  בחירת שעה *
                </label>
                <div className="space-y-3">
                  {/* Days */}
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"].map(
                      (day) => {
                        const isActive = selectedDay === day;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            aria-pressed={isActive}
                            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                              isActive
                                ? "bg-gold-accent text-black border border-gold-accent"
                                : "text-gray-300 bg-[#141417] border border-white/10 hover:border-gold-accent/50"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      },
                    )}
                  </div>

                  {/* Time Slots Grid */}
                  <div className="bg-[#141417] border border-white/10 rounded p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        "09:00",
                        "10:00",
                        "11:00",
                        "14:00",
                        "15:00",
                        "16:00",
                        "17:00",
                        "18:00",
                        "19:00",
                      ].map((time) => {
                        const isActive = selectedTime === time;
                        return (
                          <label
                            key={time}
                            className="flex items-center cursor-pointer"
                          >
                            <input
                              type="radio"
                              {...register("preferred_time")}
                              value={time}
                              className="sr-only"
                            />
                            <span
                              className={`flex-1 px-3 py-2 text-sm text-center rounded border transition-colors ${
                                isActive
                                  ? "bg-gold-accent text-black border-gold-accent"
                                  : "text-gray-300 bg-dark border-white/10 hover:border-gold-accent/50 hover:text-gold-accent"
                              }`}
                            >
                              {time}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  {errors.preferred_time?.message && (
                    <p className="text-red-400 text-sm">
                      {errors.preferred_time.message}
                    </p>
                  )}
                </div>
              </motion.div>

              {submitError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded px-4 py-3 text-red-400 text-sm">
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
          <p className="text-gray-300 mb-4">
            הפרטים נשמרו. עוברים לדף ההזמנה עכשיו...
          </p>
          <p className="text-sm text-gray-500">אם הדף לא נפתח — לחצו כאן</p>
          <Button
            onClick={() => {
              const wixUrl =
                process.env.NEXT_PUBLIC_WIX_BOOKING_URL ||
                "https://www.carmelis-studio.com/book-online";
              window.open(wixUrl, "_blank");
            }}
            className="mt-4 w-full"
          >
            העבירו אותי
          </Button>
        </div>
      </Modal>
    </>
  );
}
