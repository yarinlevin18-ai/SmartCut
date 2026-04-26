"use client";

import { useEffect, useState } from "react";

/**
 * Domain notice on the admin dashboard. Sister of TrialBanner.
 *
 * The site is currently on a free vercel.app subdomain — works perfectly,
 * but isn't a real branded URL. This banner tells the barber:
 *   1. What URL his site is on right now (so he can hand it out / share).
 *   2. That a real branded domain (carmelis.co.il etc.) is an upgrade he
 *      can purchase — costs ~₪80–₪400/year depending on TLD plus a tiny
 *      one-time setup fee for DNS.
 *
 * Dismissible per-browser via localStorage. Different storage key from
 * TrialBanner so dismissing one doesn't dismiss the other.
 *
 * When a real domain is wired up, delete the component and its mount in
 * app/(admin)/admin/page.tsx.
 */
const STORAGE_KEY = "carmelis.domain-banner.dismissed.v1";
const PRODUCTION_URL = "https://carmelis-studio.vercel.app";

export function DomainBanner() {
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

  const copyUrl = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(PRODUCTION_URL);
    } catch {
      // clipboard blocked — silent, the visible URL is selectable below
    }
  };

  return (
    <div
      role="status"
      className="relative mb-6 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(74,222,128,0.02) 100%)",
        border: "1px solid rgba(74,222,128,0.35)",
      }}
    >
      <div className="px-5 md:px-7 py-5 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="font-label uppercase"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.36em",
                color: "#4ade80",
              }}
            >
              Domain · כתובת האתר
            </span>
            <span
              aria-hidden
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: "rgba(74,222,128,0.6)" }}
            />
            <span
              className="font-label uppercase text-white/55"
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.28em",
              }}
            >
              Live
            </span>
          </div>

          <p
            className="font-body text-white/85 leading-relaxed"
            style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}
          >
            האתר שלך משודר בכתובת:
          </p>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <a
              href={PRODUCTION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-white hover:text-gold-accent transition-colors"
              style={{
                fontSize: 18,
                lineHeight: 1.1,
                letterSpacing: "0.01em",
                wordBreak: "break-all",
              }}
              dir="ltr"
            >
              {PRODUCTION_URL.replace("https://", "")}
            </a>
            <button
              type="button"
              onClick={copyUrl}
              className="font-label uppercase hover:bg-white/5 transition-colors"
              style={{
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.7)",
                background: "transparent",
                fontSize: 9,
                fontWeight: 600,
                padding: "5px 10px",
                letterSpacing: "0.22em",
              }}
              aria-label="העתק כתובת"
            >
              העתק
            </button>
          </div>

          <p
            className="font-body text-white/65 mt-3 leading-relaxed"
            style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
          >
            <span className="text-white/85 font-medium">שדרוג לדומיין משלך:</span>{" "}
            כתובת מותגת כמו{" "}
            <span dir="ltr" className="text-gold-accent">
              carmelis.co.il
            </span>{" "}
            או{" "}
            <span dir="ltr" className="text-gold-accent">
              carmelisstudio.com
            </span>{" "}
            היא תוספת בתשלום (כ-₪80–₪400 לשנה לפי הסיומת + הקמה חד-פעמית). פנה
            אלינו כשתרצה לרכוש.
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
