// End-to-end smoke for Phase 4 .ics calendar feed.
// Spawns a Next dev server isn't necessary — we hit the route via fetch on the
// running dev/prod server. Caller passes BASE_URL (defaults to http://localhost:3001).
//
// Usage:
//   BARBER_CALENDAR_TOKEN=xxx node scripts/smoke-calendar-feed.mjs
//   BASE_URL=http://localhost:3003 BARBER_CALENDAR_TOKEN=xxx node scripts/smoke-calendar-feed.mjs

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const TOKEN = process.env.BARBER_CALENDAR_TOKEN || env.BARBER_CALENDAR_TOKEN;

if (!TOKEN) {
  console.error("ERROR: BARBER_CALENDAR_TOKEN not set in env or .env.local");
  console.error("Add it to .env.local: BARBER_CALENDAR_TOKEN=<any-uuid-or-long-random-string>");
  process.exit(2);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let exitCode = 0;
const log = (...a) => console.log(...a);
const ok  = (msg) => log(`  PASS  ${msg}`);
const fail = (msg) => { exitCode = 1; log(`  FAIL  ${msg}`); };

const created = [];

async function makeBooking({ slotOffsetHours, status = "confirmed", svc }) {
  const slotStart = new Date(Date.now() + slotOffsetHours * 3600_000);
  const slotEnd = new Date(slotStart.getTime() + svc.duration_minutes * 60_000);
  const ins = await admin.from("bookings").insert({
    full_name: `smoke phase4 ${slotOffsetHours}h ${status}`,
    phone: "+972500000099",
    email: "smoke-cal@example.com",
    service_id: svc.id,
    slot_start: slotStart.toISOString(),
    slot_end: slotEnd.toISOString(),
    status,
    notes: "Smoke test; ignore",
  }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  created.push(ins.data.id);
  return ins.data.id;
}

try {
  log("\n=== Phase 4 .ics calendar smoke ===\n");
  log(`base url: ${BASE_URL}`);

  const svcRes = await admin.from("services").select("id,name,duration_minutes").order("display_order").limit(1).single();
  if (svcRes.error) throw new Error(svcRes.error.message);
  const svc = svcRes.data;

  // ----- 1. wrong token → 404
  log("\n[1] wrong token returns 404");
  const r1 = await fetch(`${BASE_URL}/api/calendar/00000000-0000-0000-0000-000000000000`);
  if (r1.status === 404) ok("wrong token → 404");
  else fail(`expected 404, got ${r1.status}`);

  // ----- 2. seed a confirmed future booking
  log("\n[2] seed bookings");
  const idFuture = await makeBooking({ slotOffsetHours: 72, svc });
  const idCancelledRecent = await makeBooking({ slotOffsetHours: -2, status: "cancelled", svc });
  log(`  seeded confirmed=${idFuture} cancelled=${idCancelledRecent}`);

  // ----- 3. correct token → 200, valid ics
  log("\n[3] correct token returns ics");
  const r3 = await fetch(`${BASE_URL}/api/calendar/${TOKEN}`);
  if (r3.status !== 200) {
    fail(`expected 200, got ${r3.status}`);
  } else {
    const ct = r3.headers.get("content-type") || "";
    if (ct.includes("text/calendar")) ok(`Content-Type is text/calendar (${ct})`);
    else fail(`wrong Content-Type: ${ct}`);

    const body = await r3.text();

    if (body.startsWith("BEGIN:VCALENDAR\r\n")) ok("body starts with BEGIN:VCALENDAR + CRLF");
    else fail(`bad opening: ${JSON.stringify(body.slice(0, 30))}`);

    if (body.endsWith("END:VCALENDAR\r\n")) ok("body ends with END:VCALENDAR + CRLF");
    else fail("body does not end correctly");

    if (body.includes(`UID:${idFuture}@carmelis.co.il`)) ok("future confirmed booking present");
    else fail("future booking missing");

    if (body.includes(`UID:${idCancelledRecent}@carmelis.co.il`)) ok("recent cancellation present (tombstone)");
    else fail("cancelled tombstone missing");

    if (/STATUS:CONFIRMED\r\n/.test(body)) ok("CONFIRMED status emitted");
    else fail("no CONFIRMED status");

    if (/STATUS:CANCELLED\r\n/.test(body)) ok("CANCELLED status emitted");
    else fail("no CANCELLED status");

    if (/DTSTART:\d{8}T\d{6}Z\r\n/.test(body)) ok("DTSTART in UTC format");
    else fail("DTSTART format wrong");

    if (body.includes("X-WR-TIMEZONE:Asia/Jerusalem")) ok("X-WR-TIMEZONE hint set");
    else fail("missing X-WR-TIMEZONE");

    // No raw newlines in escaped fields
    const descLine = body.split(/\r\n/).find(l => l.startsWith("DESCRIPTION:"));
    if (descLine && !descLine.includes("\n")) ok("DESCRIPTION newlines escaped");
  }

  // ----- 4. token with garbage chars
  log("\n[4] malformed token");
  const r4 = await fetch(`${BASE_URL}/api/calendar/<script>alert(1)</script>`);
  if (r4.status === 404) ok("xss attempt → 404");
  else fail(`expected 404, got ${r4.status}`);

} catch (err) {
  fail(`uncaught: ${err.message}`);
} finally {
  log("\n[cleanup]");
  if (created.length) {
    await admin.from("notifications").delete().in("booking_id", created);
    const del = await admin.from("bookings").delete().in("id", created);
    if (del.error) log("  cleanup error:", del.error.message);
    else log(`  removed ${created.length} test bookings`);
  }
  log(exitCode === 0 ? "\n=== ALL CHECKS PASSED ===" : "\n=== SMOKE FAILED ===");
  process.exit(exitCode);
}
