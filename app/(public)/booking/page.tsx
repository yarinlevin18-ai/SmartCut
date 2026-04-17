"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { getServices, createBooking } from "@/lib/actions";
import { Service, BookingFormData } from "@/types";

const bookingSchema = z.object({
  full_name: z.string().min(2, "שם חייב לכלול לפחות 2 תווים"),
  phone: z.string().min(9, "מספר הטלפון לא תקין"),
  service_id: z.string().min(1, "בחירת שירות חובה"),
  preferred_time: z.string().min(1, "בחירת שעה חובה"),
});

type BookingFormInputs = z.infer<typeof bookingSchema>;

export default function BookingPage() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Scroll input into view with delay to account for mobile keyboard
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
  } = useForm<BookingFormInputs>({
    resolver: zodResolver(bookingSchema),
  });

  useEffect(() => {
    getServices().then((result) => {
      if (result.success) {
        setServices(result.data || []);
      }
      setLoading(false);

      const serviceId = searchParams.get("service");
      if (serviceId) {
        setValue("service_id", serviceId);
      }
    });
  }, [searchParams, setValue]);

  const onSubmit = async (data: BookingFormInputs): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const bookingData: BookingFormData = {
        full_name: data.full_name,
        phone: data.phone,
        service_id: data.service_id,
        preferred_time: data.preferred_time,
      };

      const result = await createBooking(bookingData);
      if (result.success) {
        setSuccessModal(true);
        reset();

        setTimeout(() => {
          const wixUrl = process.env.NEXT_PUBLIC_WIX_BOOKING_URL || "https://www.carmelis-studio.com/book-online";
          window.open(wixUrl, "_blank");
        }, 2000);
      } else {
        setSubmitError("משהו השתבש. נסו שוב.");
      }
    } catch (error) {
      setSubmitError("משהו השתבש. נסו שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-dark py-20">
          <div className="text-center text-gold-accent">טוען...</div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
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

            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Full Name */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Input
                  label="שם מלא"
                  placeholder="ישראל ישראלי"
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
                  label="טלפון"
                  placeholder="050-000-0000"
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
                <select
                  {...register("service_id")}
                  dir="auto"
                  className="w-full px-4 py-4 bg-[#141417] border border-white/10 rounded text-white focus:outline-none focus:border-gold-accent/50 focus:ring-1 focus:ring-gold-accent/30 transition-colors"
                >
                  <option value="">— בחרו שירות —</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - ₪{service.price}
                    </option>
                  ))}
                </select>
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
                    {["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"].map((day) => (
                      <button
                        key={day}
                        type="button"
                        className="px-3 py-2 text-sm font-medium text-gray-300 bg-[#141417] border border-white/10 rounded hover:border-gold-accent/50 transition-colors"
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  {/* Time Slots Grid */}
                  <div className="bg-[#141417] border border-white/10 rounded p-4">
                    <div className="grid grid-cols-3 gap-2">
                      {["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"].map((time) => (
                        <label key={time} className="flex items-center cursor-pointer group">
                          <input
                            type="radio"
                            {...register("preferred_time")}
                            value={time}
                            className="hidden"
                          />
                          <span className="flex-1 px-3 py-2 text-sm text-center text-gray-300 bg-dark rounded border border-white/10 group-hover:border-gold-accent/50 group-hover:text-gold-accent transition-colors">
                            {time}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {errors.preferred_time?.message && (
                    <p className="text-red-400 text-sm">{errors.preferred_time.message}</p>
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "שולח..." : "קבע תור"}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </main>
      <Footer />

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
          <p className="text-sm text-gray-500">
            אם הדף לא נפתח — לחצו כאן
          </p>
          <Button
            onClick={() => {
              const wixUrl = process.env.NEXT_PUBLIC_WIX_BOOKING_URL || "https://www.carmelis-studio.com/book-online";
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
