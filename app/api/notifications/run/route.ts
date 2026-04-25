import { NextResponse } from "next/server";
import { runNotificationsWorker } from "@/lib/sms/worker";

// Drains the notifications queue. Hit from cron (Vercel Cron / Supabase
// Scheduled Functions / external cron) or manually for ad-hoc runs.
//
// AUTH:
//   - Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
//     when CRON_SECRET is set in the project's env. Vercel reserves this var.
//   - Manual triggers send `Authorization: Bearer ${NOTIFICATIONS_WORKER_SECRET}`.
//
// Either secret is accepted. Both can be set; only one is required. Vercel
// also sends GET requests for cron — accept GET so the cron header check
// fires before the worker runs.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

async function handle(req: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const workerSecret = process.env.NOTIFICATIONS_WORKER_SECRET;
  if (!cronSecret && !workerSecret) {
    return NextResponse.json(
      { error: "no_auth_secret_configured" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  const ok =
    (cronSecret && auth === `Bearer ${cronSecret}`) ||
    (workerSecret && auth === `Bearer ${workerSecret}`);
  if (!ok) return unauthorized();

  try {
    const result = await runNotificationsWorker();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
