"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { createBooking } from "@/lib/actions";
import type { Service } from "@/types";

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
  const [pickerNonce, setPickerNonce] = useState(0);

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
          setPickerNonce((n) => n + 1);
        } else if (err === "SLOT_IN_PAST") {
          setSubmitError("הזמן שנבחר עבר, בחר זמן אחר");
          setValue("slot_start", "");
          setPickerNonce((n) => n + 1);
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
      setPickerNonce((n) => n + 1);
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

              {/* Calendar + slot grid */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.22 }}
                className="space-y-6"
              >
                <SlotPicker
                  key={pickerNonce}
                  serviceId={serviceId || null}
                  value={slotStart || null}
                  onChange={(iso) =>
                    setValue("slot_start", iso ?? "", { shouldValidate: true })
                  }
                />
                {errors.slot_start?.message && (
                  <p className="text-red-400 text-sm">
                    {errors.slot_start.message}
                  </p>
                )}
              </motion.div>

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
