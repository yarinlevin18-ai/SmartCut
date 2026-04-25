"use client";

import { useState, useTransition } from "react";
import { cancelBookingByToken, type CancelByTokenStatus } from "@/lib/actions";

interface ManageBookingClientProps {
  token: string;
  initialStatus: "confirmed" | "cancelled" | "completed" | "no_show";
  cutoffPassed: boolean;
  slotInPast: boolean;
}

const STATUS_MESSAGES: Record<CancelByTokenStatus, string> = {
  ok: "התור בוטל בהצלחה. תקבל הודעת SMS לאישור.",
  not_found: "תור לא נמצא.",
  already_cancelled: "התור כבר בוטל.",
  too_late: "לא ניתן לבטל פחות מ-24 שעות לפני המועד. צור קשר עם המספרה.",
  slot_in_past: "המועד כבר עבר.",
};

export function ManageBookingClient({
  token,
  initialStatus,
  cutoffPassed,
  slotInPast,
}: ManageBookingClientProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CancelByTokenStatus | null>(null);
  const [confirming, setConfirming] = useState(false);

  const cancelled = initialStatus === "cancelled" || result === "ok" || result === "already_cancelled";

  if (cancelled) {
    return (
      <div
        className="p-4 font-body"
        style={{
          background: "rgba(74,222,128,0.06)",
          border: "1px solid rgba(74,222,128,0.3)",
          color: "#86efac",
          fontSize: 13,
        }}
      >
        {result === "ok" ? STATUS_MESSAGES.ok : "התור בוטל. אם תרצה לקבוע מועד חדש, חזור לאתר."}
      </div>
    );
  }

  if (slotInPast) {
    return (
      <div
        className="p-4 font-body text-white/60"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: 13,
        }}
      >
        {STATUS_MESSAGES.slot_in_past}
      </div>
    );
  }

  if (cutoffPassed) {
    return (
      <div
        className="p-4 font-body"
        style={{
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.3)",
          color: "#fca5a5",
          fontSize: 13,
        }}
      >
        {STATUS_MESSAGES.too_late}
      </div>
    );
  }

  const handleCancel = () => {
    startTransition(async () => {
      const res = await cancelBookingByToken(token);
      setResult(res.status);
      setConfirming(false);
    });
  };

  if (result) {
    return (
      <div
        className="p-4 font-body"
        style={{
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.3)",
          color: "#fca5a5",
          fontSize: 13,
        }}
      >
        {STATUS_MESSAGES[result]}
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="w-full font-label uppercase transition-all duration-200 hover:bg-red-500/10"
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
    );
  }

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
          onClick={() => setConfirming(false)}
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
