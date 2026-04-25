"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshProps {
  /** Polling interval in ms. Default 30s. */
  intervalMs?: number;
}

/**
 * Silently re-fetches the dashboard's server data on a fixed interval so
 * new pending bookings appear without the admin having to hit refresh.
 *
 * Implementation notes:
 * - Calls router.refresh() — Next 14 RSC re-runs the server component tree
 *   in place. No full-page reload, no layout flash, no scroll jump.
 * - Pauses while document.hidden (tab backgrounded). Re-syncs immediately
 *   when the tab becomes visible again so the admin sees state from the
 *   moment they returned, not from N seconds ago.
 * - Renders a tiny indicator strip — admin gets visual confirmation the
 *   page is auto-syncing without it being noisy.
 */
export function AutoRefresh({ intervalMs = 30_000 }: AutoRefreshProps) {
  const router = useRouter();
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = (): void => {
      // Don't waste roundtrips while the tab is hidden — but on resume,
      // the visibilitychange handler runs an immediate sync.
      if (document.hidden) return;
      router.refresh();
      setLastSyncedAt(Date.now());
    };

    const start = (): void => {
      if (timerRef.current) return;
      timerRef.current = setInterval(tick, intervalMs);
    };
    const stop = (): void => {
      if (!timerRef.current) return;
      clearInterval(timerRef.current);
      timerRef.current = null;
    };

    const onVisibility = (): void => {
      if (document.hidden) {
        stop();
      } else {
        // Sync the moment the tab comes back, then resume the cadence.
        router.refresh();
        setLastSyncedAt(Date.now());
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);

  return <SyncIndicator lastSyncedAt={lastSyncedAt} intervalMs={intervalMs} />;
}

/**
 * Subtle "last synced X seconds ago" line. Updates every second so the
 * admin can see at a glance that auto-refresh is working.
 */
function SyncIndicator({
  lastSyncedAt,
  intervalMs,
}: {
  lastSyncedAt: number;
  intervalMs: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = Math.max(0, Math.floor((now - lastSyncedAt) / 1000));
  const intervalSec = Math.round(intervalMs / 1000);

  return (
    <div
      className="flex items-center justify-end gap-2 mb-4 font-label uppercase text-white/35"
      style={{
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.28em",
      }}
      aria-live="polite"
    >
      <span
        aria-hidden
        className="inline-block"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#4ade80",
          opacity: 0.7,
          animation: "pulse 2s ease-in-out infinite",
        }}
      />
      <span>
        סונכרן לפני {elapsedSec}s
        <span className="text-white/20"> · רענון אוטומטי כל {intervalSec}s</span>
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
