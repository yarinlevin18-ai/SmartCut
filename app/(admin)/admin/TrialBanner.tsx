"use client";

import { useEffect, useState } from "react";

/**
 * Trial-period notice shown at the top of the admin dashboard.
 *
 * Communicates two things to the studio owner:
 *   1. The system is in a free-trial month — billing kicks in afterwards.
 *   2. SMS / WhatsApp notifications are a paid add-on, NOT part of the
 *      base package. They have to opt in explicitly.
 *
 * Dismissible per-browser via localStorage. The barber sees it on their
 * first few visits, dismisses it once they've internalised the terms,
 * and it stays gone until cache is cleared. Remove the entire component
 * (and its mount in app/(admin)/admin/page.tsx) when the trial period
 * ends and billing is active — there's no remote kill switch.
 */
const STORAGE_KEY = "carmelis.trial-banner.dismissed.v1";

export function TrialBanner() {
  const [hidden, setHidden] = useState(true); // start hidden to avoid SSR flash

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  const dismiss = (): void => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage blocked — fall through, banner stays for the session.
    }
    setHidden(true);
  };

  return (
    <div
      role="status"
      className="relative mb-8 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)",
        border: "1px solid rgba(201,168,76,0.45)",
      }}
    >
      <div className="px-5 md:px-7 py-5 md:py-6 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="font-label uppercase text-gold-accent"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.36em",
              }}
            >
              Trial · תקופת ניסיון
            </span>
            <span
              aria-hidden
              className="inline-block w-1 h-1 rounded-full bg-gold-accent/60"
            />
            <span
              className="font-label uppercase text-white/55"
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.28em",
              }}
            >
              Free Month
            </span>
          </div>

          <p
            className="font-body text-white/85 leading-relaxed"
            style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}
          >
            המערכת כרגע בחודש{" "}
            <span className="text-gold-accent font-medium">ניסיון חינם</span>.
            לאחר מכן יתחיל החיוב החודשי לפי החבילה שנבחרה.
          </p>

          <p
            className="font-body text-white/65 mt-3 leading-relaxed"
            style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
          >
            <span className="text-white/85 font-medium">חשוב לדעת:</span>{" "}
            ההתראות האוטומטיות ללקוחות (SMS / וואטסאפ — אישור הזמנה,
            תזכורות, ביטולים) הן{" "}
            <span className="text-gold-accent">תוספת בתשלום נפרד</span> שאינה
            כלולה בחבילה הבסיסית. ללא ההתראות, יידוע הלקוחות נעשה ידנית.
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="הסתר הודעה"
          className="shrink-0 font-label uppercase hover:bg-white/5 transition-colors"
          style={{
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.7)",
            background: "transparent",
            fontSize: 9,
            fontWeight: 600,
            padding: "8px 14px",
            letterSpacing: "0.24em",
          }}
        >
          הבנתי
        </button>
      </div>
    </div>
  );
}
