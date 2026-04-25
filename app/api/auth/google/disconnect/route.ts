import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revokeAndDisconnect } from "@/lib/gcal";

// POST /api/auth/google/disconnect
//
// Admin-only. Revokes the refresh token at Google + wipes the local
// oauth_tokens row. From this point, calendar mirrors stop firing — but
// existing bookings keep their stored gcal_event_id so a future reconnect
// could resync if we want.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await revokeAndDisconnect();
  return NextResponse.json(result);
}
