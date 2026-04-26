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
    // Match the surrounding footer-link style (font-body, fontSize 13,
    // fontWeight 300) so this control reads as one of the legal links
    // rather than a misplaced label-cap chip.
    return (
      <button
        type="button"
        onClick={openCookiePreferences}
        className="font-body text-white/70 hover:text-gold-accent transition-colors text-start"
        style={{
          fontSize: 13,
          fontWeight: 300,
          background: "transparent",
          padding: 0,
          border: 0,
          cursor: "pointer",
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
