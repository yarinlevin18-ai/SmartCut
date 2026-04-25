import { NextResponse } from "next/server";
import { createServerAdmin } from "@/lib/supabase";
import { buildICS, type ICSEvent } from "@/lib/ics";

// Public iCalendar feed for the barber's confirmed (and recently cancelled) bookings.
// Token-gated via env `BARBER_CALENDAR_TOKEN`. Subscribe URL:
//   https://carmelis.co.il/api/calendar/<BARBER_CALENDAR_TOKEN>
// Paste into Google Calendar's "Add by URL" or Apple Calendar's "New Calendar Subscription".

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHOP_NAME = "Carmelis Studio";
const PROD_ID = "-//Carmelis Studio//Bookings Calendar//EN";

// Rolling window: include cancellations from the last 30 days so client tombstones
// stay accurate (a fresh sync seeing a vanished UID would otherwise leave a stale event).
const WINDOW_DAYS = 30;

type BookingRow = {
  id: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
  slot_start: string | null;
  slot_end: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  services: { name: string } | { name: string }[] | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ barberToken: string }> }
) {
  const { barberToken } = await params;
  const expected = process.env.BARBER_CALENDAR_TOKEN;
  if (!expected) {
    // Don't 500 — that leaks "the env is misconfigured" to scrapers.
    return new NextResponse("Not found", { status: 404 });
  }
  if (barberToken !== expected) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createServerAdmin();
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("bookings")
    .select("id, full_name, phone, notes, slot_start, slot_end, status, services(name)")
    .gte("slot_start", since)
    .not("slot_start", "is", null)
    .in("status", ["confirmed", "cancelled"])
    .order("slot_start", { ascending: true });

  if (error) {
    return new NextResponse("upstream error", { status: 500 });
  }

  const events: ICSEvent[] = [];
  for (const raw of (data ?? []) as BookingRow[]) {
    if (!raw.slot_start || !raw.slot_end) continue;
    const svc = Array.isArray(raw.services) ? raw.services[0] : raw.services;
    const serviceName = svc?.name ?? "Service";
    const summary = `${raw.full_name} — ${serviceName}`;
    const descParts: string[] = [];
    if (raw.phone) descParts.push(`Phone: ${raw.phone}`);
    if (raw.notes) descParts.push(`Notes: ${raw.notes}`);
    events.push({
      uid: `${raw.id}@carmelis.co.il`,
      dtstart: raw.slot_start,
      dtend: raw.slot_end,
      summary,
      description: descParts.join("\n") || undefined,
      location: SHOP_NAME,
      status: raw.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
    });
  }

  const body = buildICS({
    prodId: PROD_ID,
    calName: `${SHOP_NAME} — Bookings`,
    timezone: "Asia/Jerusalem",
    events,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": 'inline; filename="carmelis-bookings.ics"',
    },
  });
}
