"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getSiteContent, updateSiteContent } from "@/lib/actions";

type ContentKey =
  | "hero_tagline"
  | "about_text"
  | "address"
  | "phone"
  | "hours";

interface ContentField {
  key: ContentKey;
  label: string;
  multiline: boolean;
  dir?: "ltr" | "rtl";
}

const FIELDS: ContentField[] = [
  { key: "hero_tagline", label: "טאגליין דף הבית", multiline: false },
  { key: "about_text", label: "טקסט אודות", multiline: true },
  { key: "address", label: "כתובת", multiline: false },
  { key: "phone", label: "מספר טלפון", multiline: false, dir: "ltr" },
  { key: "hours", label: "שעות פתיחה", multiline: false },
];

type SaveStatus = "idle" | "saving" | "success" | "error";

interface FieldState {
  value: string;
  original: string;
  status: SaveStatus;
  error?: string;
}

export default function ContentPage() {
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<Record<ContentKey, FieldState>>(() => {
    const base = {} as Record<ContentKey, FieldState>;
    FIELDS.forEach((f) => {
      base[f.key] = { value: "", original: "", status: "idle" };
    });
    return base;
  });

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async (): Promise<void> => {
    const results = await Promise.all(
      FIELDS.map(async (f) => {
        const res = await getSiteContent(f.key);
        const value = res.success && res.data ? res.data : "";
        return [f.key, value] as const;
      })
    );

    setFields((prev) => {
      const next = { ...prev };
      results.forEach(([key, value]) => {
        next[key] = { value, original: value, status: "idle" };
      });
      return next;
    });
    setLoading(false);
  };

  const handleChange = (key: ContentKey, value: string): void => {
    setFields((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
        status: prev[key].status === "success" ? "idle" : prev[key].status,
        error: undefined,
      },
    }));
  };

  const handleSave = async (key: ContentKey): Promise<void> => {
    const current = fields[key];
    const trimmed = current.value.trim();
    if (!trimmed || trimmed === current.original.trim()) return;

    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: "saving", error: undefined },
    }));

    const res = await updateSiteContent(key, current.value);

    if (!res.success) {
      setFields((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          status: "error",
          error: res.error || "שמירה נכשלה",
        },
      }));
      return;
    }

    setFields((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        original: prev[key].value,
        status: "success",
      },
    }));

    setTimeout(() => {
      setFields((prev) => {
        if (prev[key].status !== "success") return prev;
        return { ...prev, [key]: { ...prev[key], status: "idle" } };
      });
    }, 2000);
  };

  if (loading) {
    return (
      <div
        className="py-16 text-center font-body text-white/40"
        style={{ fontSize: 13 }}
      >
        טוען תוכן...
      </div>
    );
  }

  return (
    <div className="max-w-4xl" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10"
      >
        <p
          className="font-label uppercase text-gold-accent mb-3"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.36em",
          }}
        >
          Content · תוכן
        </p>
        <h1
          className="font-display text-white mb-2"
          style={{ fontSize: "clamp(32px, 4.5vw, 48px)", lineHeight: 1.05 }}
        >
          תוכן האתר
        </h1>
        <p
          className="font-body text-white/55"
          style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.7 }}
        >
          עריכת טקסטים המוצגים באתר — טאגליין, טקסט אודות, כתובת, טלפון ושעות
          פתיחה.
        </p>
      </motion.div>

      {/* Fields */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="space-y-5"
      >
        {FIELDS.map((field) => {
          const state = fields[field.key];
          const isDirty =
            state.value.trim().length > 0 &&
            state.value.trim() !== state.original.trim();
          const isSaving = state.status === "saving";
          const isSuccess = state.status === "success";
          const isError = state.status === "error";

          const inputClassName =
            "w-full px-4 py-4 bg-[#141417] border border-white/10 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gold-accent/50 focus:ring-1 focus:ring-gold-accent/30 transition-colors";

          return (
            <div
              key={field.key}
              className="p-6 md:p-7"
              style={{
                background: "#080808",
                border: "1px solid rgba(201,168,76,0.12)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
                <label
                  htmlFor={`field-${field.key}`}
                  className="font-label uppercase text-gold-accent"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.32em",
                  }}
                >
                  {field.label}
                </label>
                <span
                  className="font-label uppercase text-white/25"
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: "0.28em",
                  }}
                  dir="ltr"
                >
                  {field.key}
                </span>
              </div>

              {field.multiline ? (
                <textarea
                  id={`field-${field.key}`}
                  rows={10}
                  value={state.value}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  dir={field.dir || "auto"}
                  className={`${inputClassName} resize-y font-body`}
                  style={{
                    minHeight: 220,
                    lineHeight: 1.7,
                    textAlign: "right",
                  }}
                />
              ) : (
                <input
                  id={`field-${field.key}`}
                  type="text"
                  value={state.value}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  dir={field.dir || "auto"}
                  className={inputClassName}
                  style={{
                    textAlign: field.dir === "ltr" ? "left" : "right",
                  }}
                />
              )}

              <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                <div className="min-h-[20px] flex items-center">
                  {isSuccess && (
                    <span
                      className="font-label uppercase text-gold-accent flex items-center gap-2"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.28em",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      נשמר
                    </span>
                  )}
                  {isError && (
                    <span
                      className="font-body"
                      style={{
                        fontSize: 12,
                        fontWeight: 300,
                        color: "rgba(239,68,68,0.9)",
                      }}
                      role="alert"
                    >
                      {state.error}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(field.key)}
                  disabled={!isDirty || isSaving}
                  className="font-label uppercase transition-all duration-200 hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    border: "1px solid #c9a84c",
                    color: "#000",
                    background: "#c9a84c",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "10px 28px",
                    borderRadius: 0,
                    letterSpacing: "0.28em",
                  }}
                >
                  {isSaving ? "שומר..." : "שמור"}
                </button>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
