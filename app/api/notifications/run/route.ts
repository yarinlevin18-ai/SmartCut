import { NextResponse } from "next/server";
import { runNotificationsWorker } from "@/lib/sms/worker";

// Hit this endpoint from cron (Supabase Scheduled Functions, Vercel Cron, or
// external cron) to drain the notifications queue. Protect with a shared
// secret so it can't be invoked anonymously.
//   header:  Authorization: Bearer <NOTIFICATIONS_WORKER_SECRET>
// Returns counts of claimed/sent/failed/skipped rows.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATIONS_WORKER_SECRET;
  if (!secret) return NextResponse.json({ error: "worker_secret_not_set" }, { status: 500 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return unauthorized();

  try {
    const result = await runNotificationsWorker();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
