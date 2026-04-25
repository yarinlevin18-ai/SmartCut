"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface GcalPanelProps {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
}

export function GcalPanel({ configured, connected, accountEmail }: GcalPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{
    kind: "ok" | "err";
    msg: string;
  } | null>(null);

  // Show a banner when we land back on /admin?gcal=connected (or =error&reason=…)
  useEffect(() => {
    const gcal = searchParams.get("gcal");
    if (!gcal) return;
    if (gcal === "connected") {
      setFlash({ kind: "ok", msg: "Google Calendar חובר בהצלחה" });
    } else if (gcal === "error") {
      const reason = searchParams.get("reason") ?? "unknown";
      setFlash({ kind: "err", msg: `החיבור נכשל: ${reason}` });
    }
    // Clean the URL so refresh doesn't re-flash.
    const url = new URL(window.location.href);
    url.searchParams.delete("gcal");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams]);

  const handleDisconnect = (): void => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
        if (res.ok) {
          setFlash({ kind: "ok", msg: "החיבור הוסר" });
          router.refresh();
        } else {
          setFlash({ kind: "err", msg: "ניתוק נכשל" });
        }
      } catch {
        setFlash({ kind: "err", msg: "ניתוק נכשל" });
      }
    });
  };

  if (!configured) {
    // Env vars missing — most likely on a fresh deploy where the studio owner
    // hasn't yet set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI.
    return (
      <Panel>
        <Header status="not_configured" />
        <p
          className="font-body text-white/55 mt-3"
          style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
        >
          האינטגרציה לא הוגדרה. דרוש להגדיר GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ו-GOOGLE_REDIRECT_URI במשתני הסביבה.
        </p>
      </Panel>
    );
  }

  return (
    <Panel>
      <Header status={connected ? "connected" : "disconnected"} />

      {flash && (
        <div
          className="mt-4 px-4 py-3 font-body cursor-pointer"
          onClick={() => setFlash(null)}
          style={{
            background:
              flash.kind === "ok"
                ? "rgba(74,222,128,0.08)"
                : "rgba(248,113,113,0.08)",
            border: `1px solid ${flash.kind === "ok" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
            color: flash.kind === "ok" ? "#86efac" : "#fca5a5",
            fontSize: 12,
          }}
        >
          {flash.msg}
        </div>
      )}

      {connected ? (
        <div className="mt-4 space-y-3">
          <div
            className="font-body text-white/65"
            style={{ fontSize: 13, fontWeight: 300 }}
          >
            מחובר לחשבון:{" "}
            <span className="text-gold-accent" dir="ltr">
              {accountEmail ?? "—"}
            </span>
          </div>
          <p
            className="font-body text-white/45"
            style={{ fontSize: 12, fontWeight: 300, lineHeight: 1.7 }}
          >
            כל אישור תור יוצר אירוע ביומן הזה. שינוי מועד מעדכן את האירוע, ביטול מוחק אותו.
          </p>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isPending}
            className="font-label uppercase transition-colors hover:bg-red-500/10 disabled:opacity-50"
            style={{
              border: "1px solid rgba(248,113,113,0.4)",
              color: "#fca5a5",
              background: "transparent",
              fontSize: 10,
              fontWeight: 600,
              padding: "10px 20px",
              letterSpacing: "0.28em",
              borderRadius: 0,
            }}
          >
            {isPending ? "מתנתק…" : "נתק חיבור"}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p
            className="font-body text-white/55"
            style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.7 }}
          >
            לחץ לחיבור חשבון Google כדי שכל אישור תור ייווצר אוטומטית כאירוע ביומן שלך.
          </p>
          <a
            href="/api/auth/google/connect"
            className="inline-block font-label uppercase transition-all hover:bg-gold-accent hover:text-black"
            style={{
              border: "1px solid #c9a84c",
              color: "#c9a84c",
              background: "rgba(201,168,76,0.05)",
              fontSize: 11,
              fontWeight: 700,
              padding: "12px 24px",
              letterSpacing: "0.28em",
              borderRadius: 0,
            }}
          >
            חבר Google Calendar
          </a>
        </div>
      )}
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-8 mb-12"
      style={{
        background: "#080808",
        border: "1px solid rgba(201,168,76,0.12)",
      }}
    >
      {children}
    </div>
  );
}

function Header({ status }: { status: "connected" | "disconnected" | "not_configured" }) {
  const label =
    status === "connected"
      ? "מחובר"
      : status === "disconnected"
        ? "לא מחובר"
        : "לא הוגדר";
  const color =
    status === "connected"
      ? "#4ade80"
      : status === "disconnected"
        ? "#c9a84c"
        : "#7a7a80";
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p
          className="font-label uppercase text-gold-accent mb-2"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.32em" }}
        >
          Google Calendar
        </p>
        <h2 className="font-display text-white" style={{ fontSize: 24 }}>
          סנכרון ליומן
        </h2>
      </div>
      <span
        className="font-label uppercase shrink-0"
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.22em",
          padding: "4px 12px",
          border: `1px solid ${color}40`,
          color,
          background: `${color}10`,
        }}
      >
        {label}
      </span>
    </div>
  );
}
