"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelBookingByToken,
  rescheduleBookingByToken,
  type CancelByTokenStatus,
  type RescheduleByTokenStatus,
} from "@/lib/actions";
import { SlotPicker } from "@/components/booking/SlotPicker";

type Mode = "view" | "reschedule";

interface ManageBookingClientProps {
  token: string;
  initialStatus: "confirmed" | "cancelled" | "completed" | "no_show";
  cutoffPassed: boolean;
  slotInPast: boolean;
  /** Service id needed by SlotPicker to fetch slots. Null for legacy free-text rows. */
  serviceId: string | null;
}

const CANCEL_MESSAGES: Record<CancelByTokenStatus, string> = {
  ok: "התור בוטל בהצלחה. תקבל הודעת SMS לאישור.",
  not_found: "תור לא נמצא.",
  already_cancelled: "התור כבר בוטל.",
  too_late: "לא ניתן לבטל פחות מ-24 שעות לפני המועד. צור קשר עם המספרה.",
  slot_in_past: "המועד כבר עבר.",
};

const RESCHEDULE_MESSAGES: Record<RescheduleByTokenStatus, string> = {
  ok: "המועד שונה בהצלחה. תקבל הודעת SMS לאישור.",
  not_found: "תור לא נמצא.",
  already_cancelled: "התור בוטל ולא ניתן לשנות אותו.",
  slot_in_past: "המועד הקיים כבר עבר.",
  too_late: "לא ניתן לשנות פחות מ-24 שעות לפני המועד. צור קשר עם המספרה.",
  new_slot_in_past: "המועד החדש שנבחר עבר כבר.",
  new_slot_too_soon: "המועד החדש קרוב מדי (פחות מ-24 שעות מעכשיו).",
  invalid_slot: "המועד שנבחר לא תקין.",
  slot_unavailable: "המשבצת תפוסה. בחר מועד אחר.",
};

export function ManageBookingClient({
  token,
  initialStatus,
  cutoffPassed,
  slotInPast,
  serviceId,
}: ManageBookingClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("view");

  const [cancelResult, setCancelResult] = useState<CancelByTokenStatus | null>(null);
  const [rescheduleResult, setRescheduleResult] = useState<RescheduleByTokenStatus | null>(null);

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);

  const cancelled =
    initialStatus === "cancelled" ||
    cancelResult === "ok" ||
    cancelResult === "already_cancelled";

  const successPanel = (msg: string) => (
    <div
      className="p-4 font-body"
      style={{
        background: "rgba(74,222,128,0.06)",
        border: "1px solid rgba(74,222,128,0.3)",
        color: "#86efac",
        fontSize: 13,
      }}
    >
      {msg}
    </div>
  );

  const errorPanel = (msg: string) => (
    <div
      className="p-4 font-body"
      style={{
        background: "rgba(248,113,113,0.06)",
        border: "1px solid rgba(248,113,113,0.3)",
        color: "#fca5a5",
        fontSize: 13,
      }}
    >
      {msg}
    </div>
  );

  const mutedPanel = (msg: string) => (
    <div
      className="p-4 font-body text-white/60"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.1)",
        fontSize: 13,
      }}
    >
      {msg}
    </div>
  );

  // ---------------- terminal/blocking states ----------------
  if (cancelled) {
    return successPanel(
      cancelResult === "ok"
        ? CANCEL_MESSAGES.ok
        : "התור בוטל. אם תרצה לקבוע מועד חדש, חזור לאתר.",
    );
  }

  if (slotInPast) {
    return mutedPanel(CANCEL_MESSAGES.slot_in_past);
  }

  if (cutoffPassed) {
    return errorPanel(CANCEL_MESSAGES.too_late);
  }

  // After a successful reschedule, show success panel + a "refresh" prompt.
  if (rescheduleResult === "ok") {
    return (
      <div className="space-y-3">
        {successPanel(RESCHEDULE_MESSAGES.ok)}
        <button
          onClick={() => router.refresh()}
          className="w-full font-label uppercase transition-all duration-200 hover:bg-white/5"
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.85)",
            background: "transparent",
            fontSize: 11,
            fontWeight: 600,
            padding: "12px 16px",
            borderRadius: 0,
            letterSpacing: "0.28em",
          }}
        >
          רענן · Refresh
        </button>
      </div>
    );
  }

  // Cancel terminal-error states (anything other than ok/already_cancelled).
  if (cancelResult) {
    return errorPanel(CANCEL_MESSAGES[cancelResult]);
  }

  // ---------------- reschedule mode ----------------
  if (mode === "reschedule") {
    const handleReschedule = () => {
      if (!pickedSlot) return;
      startTransition(async () => {
        const res = await rescheduleBookingByToken(token, pickedSlot);
        setRescheduleResult(res.status);
      });
    };

    return (
      <div className="space-y-4" dir="rtl">
        <p className="font-body text-white/70" style={{ fontSize: 13 }}>
          בחר תאריך ומועד חדש. ניתן לשנות עד 24 שעות לפני המועד הקיים, והמועד החדש חייב להיות לפחות 24 שעות מעכשיו.
        </p>

        <div className="space-y-6">
          <SlotPicker
            serviceId={serviceId}
            value={pickedSlot}
            onChange={setPickedSlot}
          />
        </div>

        {rescheduleResult && errorPanel(RESCHEDULE_MESSAGES[rescheduleResult])}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleReschedule}
            disabled={isPending || !pickedSlot}
            className="flex-1 font-label uppercase transition-all duration-200 hover:bg-gold-accent hover:text-black disabled:opacity-40"
            style={{
              border: "1px solid rgba(201,168,76,0.6)",
              color: "#c9a84c",
              background: "rgba(201,168,76,0.05)",
              fontSize: 12,
              fontWeight: 600,
              padding: "14px 20px",
              borderRadius: 0,
              letterSpacing: "0.28em",
            }}
          >
            {isPending ? "שומר…" : "שמור · Save"}
          </button>
          <button
            onClick={() => {
              setMode("view");
              setPickedSlot(null);
              setRescheduleResult(null);
            }}
            disabled={isPending}
            className="flex-1 font-label uppercase transition-all duration-200 hover:bg-white/5 disabled:opacity-50"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
              background: "transparent",
              fontSize: 12,
              fontWeight: 600,
              padding: "14px 20px",
              borderRadius: 0,
              letterSpacing: "0.28em",
            }}
          >
            חזור · Back
          </button>
        </div>
      </div>
    );
  }

  // ---------------- cancel confirmation ----------------
  if (confirmingCancel) {
    const handleCancel = () => {
      startTransition(async () => {
        const res = await cancelBookingByToken(token);
        setCancelResult(res.status);
        setConfirmingCancel(false);
      });
    };

    return (
      <div className="space-y-3">
        <p className="font-body text-white/75" style={{ fontSize: 13 }}>
          בטוח שברצונך לבטל את התור? פעולה זו אינה הפיכה.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1 font-label uppercase transition-all duration-200 hover:bg-red-500/15 disabled:opacity-50"
            style={{
              border: "1px solid rgba(248,113,113,0.6)",
              color: "#fca5a5",
              background: "rgba(248,113,113,0.05)",
              fontSize: 12,
              fontWeight: 600,
              padding: "14px 20px",
              borderRadius: 0,
              letterSpacing: "0.28em",
            }}
          >
            {isPending ? "מבטל…" : "כן, בטל"}
          </button>
          <button
            onClick={() => setConfirmingCancel(false)}
            disabled={isPending}
            className="flex-1 font-label uppercase transition-all duration-200 hover:bg-white/5 disabled:opacity-50"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
              background: "transparent",
              fontSize: 12,
              fontWeight: 600,
              padding: "14px 20px",
              borderRadius: 0,
              letterSpacing: "0.28em",
            }}
          >
            לא, השאר
          </button>
        </div>
      </div>
    );
  }

  // ---------------- default view: two action buttons ----------------
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={() => setMode("reschedule")}
        disabled={!serviceId}
        className="flex-1 font-label uppercase transition-all duration-200 hover:bg-gold-accent hover:text-black disabled:opacity-40"
        style={{
          border: "1px solid rgba(201,168,76,0.5)",
          color: "#c9a84c",
          background: "transparent",
          fontSize: 12,
          fontWeight: 600,
          padding: "14px 20px",
          borderRadius: 0,
          letterSpacing: "0.28em",
        }}
      >
        שנה מועד · Reschedule
      </button>
      <button
        onClick={() => setConfirmingCancel(true)}
        className="flex-1 font-label uppercase transition-all duration-200 hover:bg-red-500/10"
        style={{
          border: "1px solid rgba(248,113,113,0.5)",
          color: "#fca5a5",
          background: "transparent",
          fontSize: 12,
          fontWeight: 600,
          padding: "14px 20px",
          borderRadius: 0,
          letterSpacing: "0.28em",
        }}
      >
        ביטול תור · Cancel
      </button>
    </div>
  );
}
