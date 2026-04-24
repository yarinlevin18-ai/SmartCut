"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const STORAGE_KEY = "carmelis:cookie-consent:v1";
const OPEN_EVENT = "carmelis:open-cookie-preferences";

type Category = "necessary" | "analytics" | "marketing";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const DEFAULT_DENY: Consent = {
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: "",
};

function readStoredConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: String(parsed.updatedAt ?? ""),
    };
  } catch {
    return null;
  }
}

function writeConsent(consent: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    /* storage unavailable — silently ignore */
  }
}

export function CookieConsent() {
  const shouldReduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [draft, setDraft] = useState<Consent>(DEFAULT_DENY);

  useEffect(() => {
    setMounted(true);
    const stored = readStoredConsent();
    if (!stored) {
      setShowBanner(true);
    } else {
      setDraft(stored);
    }
  }, []);

  useEffect(() => {
    function handleOpen() {
      const stored = readStoredConsent();
      setDraft(stored ?? DEFAULT_DENY);
      setShowPrefs(true);
      setShowBanner(false);
    }
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_EVENT, handleOpen);
  }, []);

  const persist = useCallback((next: Consent) => {
    const withStamp: Consent = { ...next, updatedAt: new Date().toISOString() };
    writeConsent(withStamp);
    setDraft(withStamp);
    setShowBanner(false);
    setShowPrefs(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist({ necessary: true, analytics: true, marketing: true, updatedAt: "" });
  }, [persist]);

  const rejectAll = useCallback(() => {
    persist({ ...DEFAULT_DENY });
  }, [persist]);

  const saveSelection = useCallback(() => {
    persist(draft);
  }, [draft, persist]);

  const toggle = useCallback((category: Exclude<Category, "necessary">) => {
    setDraft((d) => ({ ...d, [category]: !d[category] }));
  }, []);

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            role="region"
            aria-label="הודעת קובצי Cookie"
            initial={shouldReduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={shouldReduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 z-[100] mx-auto max-w-3xl"
          >
            <div
              className="bg-black/95 backdrop-blur-md text-white p-6 md:p-7"
              style={{ border: "1px solid rgba(201,168,76,0.25)" }}
            >
              <div className="flex flex-col gap-5">
                <div>
                  <p
                    className="font-label uppercase text-gold-accent mb-2"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.32em",
                    }}
                  >
                    Cookies · פרטיות
                  </p>
                  <p
                    className="font-body text-white/80"
                    style={{
                      fontSize: 14,
                      fontWeight: 300,
                      lineHeight: 1.75,
                    }}
                  >
                    אנו משתמשים בקובצי Cookie כדי להפעיל את האתר ולשפר את חוויית
                    הגלישה. תוכלו לקבל את כולם, לדחות את הלא-חיוניים או להגדיר
                    העדפה מותאמת. לפרטים ראו{" "}
                    <Link
                      href="/cookies"
                      className="underline underline-offset-4 hover:text-gold-accent transition-colors"
                    >
                      מדיניות קובצי ה-Cookie
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="font-label uppercase transition-all duration-200 hover:bg-gold-light"
                    style={{
                      background: "#c9a84c",
                      color: "#0d0d0d",
                      border: "1px solid #c9a84c",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "12px 28px",
                      letterSpacing: "0.24em",
                    }}
                  >
                    קבל הכל
                  </button>
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="font-label uppercase transition-all duration-200 hover:bg-white/10"
                    style={{
                      background: "transparent",
                      color: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(255,255,255,0.3)",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "12px 28px",
                      letterSpacing: "0.24em",
                    }}
                  >
                    דחה הכל
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(readStoredConsent() ?? DEFAULT_DENY);
                      setShowPrefs(true);
                      setShowBanner(false);
                    }}
                    className="font-label uppercase text-white/70 hover:text-gold-accent transition-colors underline-offset-4 hover:underline"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.2em",
                      padding: "12px 4px",
                      background: "transparent",
                    }}
                  >
                    התאם העדפה
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrefs && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="העדפות קובצי Cookie"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8"
          >
            <button
              type="button"
              aria-label="סגור"
              onClick={() => setShowPrefs(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={shouldReduce ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={shouldReduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative bg-black text-white w-full max-w-lg max-h-[85vh] overflow-y-auto p-7 md:p-8"
              style={{ border: "1px solid rgba(201,168,76,0.25)" }}
            >
              <p
                className="font-label uppercase text-gold-accent mb-3"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.32em",
                }}
              >
                Preferences
              </p>
              <h2
                className="font-display text-white mb-6"
                style={{ fontSize: 28, lineHeight: 1.1 }}
              >
                העדפות קובצי Cookie
              </h2>

              <div className="space-y-5 mb-7">
                <PreferenceRow
                  title="חיוניים"
                  subtitle="Strictly Necessary"
                  description="נדרשים לתפקוד בסיסי של האתר ולשמירה על העדפותיכם. אי-אפשר לכבות אותם."
                  checked
                  disabled
                  onChange={() => {
                    /* noop */
                  }}
                />
                <PreferenceRow
                  title="ניתוח וביצועים"
                  subtitle="Analytics"
                  description="מסייעים לנו להבין כיצד גולשים משתמשים באתר. המידע מצטבר ואנונימי."
                  checked={draft.analytics}
                  onChange={() => toggle("analytics")}
                />
                <PreferenceRow
                  title="שיווק"
                  subtitle="Marketing"
                  description="משמשים להתאמת פרסומות ותוכן מחוץ לאתר. כבויים כברירת מחדל."
                  checked={draft.marketing}
                  onChange={() => toggle("marketing")}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={saveSelection}
                  className="font-label uppercase transition-all duration-200 hover:bg-gold-light flex-1"
                  style={{
                    background: "#c9a84c",
                    color: "#0d0d0d",
                    border: "1px solid #c9a84c",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "12px 20px",
                    letterSpacing: "0.24em",
                  }}
                >
                  שמור בחירה
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="font-label uppercase transition-all duration-200 hover:bg-white/10 flex-1"
                  style={{
                    background: "transparent",
                    color: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "12px 20px",
                    letterSpacing: "0.24em",
                  }}
                >
                  קבל הכל
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface PreferenceRowProps {
  title: string;
  subtitle: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function PreferenceRow({
  title,
  subtitle,
  description,
  checked,
  disabled,
  onChange,
}: PreferenceRowProps) {
  return (
    <label
      className={`flex items-start gap-4 cursor-pointer ${
        disabled ? "opacity-70 cursor-not-allowed" : ""
      }`}
    >
      <span className="relative flex-shrink-0 mt-1">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
        />
        <span
          aria-hidden
          className="block w-10 h-5 rounded-full transition-colors"
          style={{
            background: checked ? "#c9a84c" : "rgba(255,255,255,0.15)",
          }}
        />
        <span
          aria-hidden
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{
            right: checked ? "2px" : "22px",
          }}
        />
      </span>
      <span className="flex-1">
        <span className="flex items-baseline gap-2 flex-wrap">
          <span
            className="font-display text-white"
            style={{ fontSize: 17, lineHeight: 1.2 }}
          >
            {title}
          </span>
          <span
            className="font-label uppercase text-white/40"
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.24em",
            }}
          >
            {subtitle}
          </span>
        </span>
        <span
          className="block font-body text-white/60 mt-1"
          style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
        >
          {description}
        </span>
      </span>
    </label>
  );
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}
