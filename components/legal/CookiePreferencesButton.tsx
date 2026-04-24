"use client";

import { openCookiePreferences } from "./CookieConsent";

interface CookiePreferencesButtonProps {
  label?: string;
  variant?: "outlined" | "link";
}

export function CookiePreferencesButton({
  label = "נהל העדפות Cookie",
  variant = "outlined",
}: CookiePreferencesButtonProps) {
  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={openCookiePreferences}
        className="font-label uppercase text-white/60 hover:text-gold-accent transition-colors"
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.28em",
          background: "transparent",
          padding: 0,
          border: 0,
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="my-4">
      <button
        type="button"
        onClick={openCookiePreferences}
        className="font-label uppercase transition-all duration-200 hover:bg-gold-accent hover:text-black"
        style={{
          border: "1px solid #c9a84c",
          color: "#c9a84c",
          fontSize: 11,
          fontWeight: 600,
          padding: "12px 28px",
          borderRadius: 0,
          background: "transparent",
          letterSpacing: "0.24em",
        }}
      >
        {label}
      </button>
    </div>
  );
}
