// End-to-end smoke for Phase 5 approval workflow.
// Covers RPC paths only (admin actions are exercised via direct DB writes
// that mirror what approveBooking / denyBooking do). Cleans up its own
// test rows.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon  = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const created = [];
let exitCode = 0;
const log = (...a) => console.log(...a);
const ok  = (msg) => log(`  PASS  ${msg}`);
const fail = (msg) => { exitCode = 1; log(`  FAIL  ${msg}`); };

function snapToGrid(offsetHours) {
  const t = Date.now() + offsetHours * 3600_000;
  const ms = 15 * 60 * 1000;
  return new Date(Math.ceil(t / ms) * ms);
}

async function makeBooking({ slotOffsetHours, status, alt = false, svc }) {
  const slotStart = snapToGrid(slotOffsetHours);
  const slotEnd = new Date(slotStart.getTime() + svc.duration_minutes * 60_000);
  const ins = await admin.from("bookings").insert({
    full_name: `smoke phase5 ${slotOffsetHours}h ${status}${alt ? " alt" : ""}`,
    phone: "+972500000055",
    email: null,
    service_id: svc.id,
    slot_start: slotStart.toISOString(),
    slot_end: slotEnd.toISOString(),
    status,
    alt_offered_at: alt ? new Date().toISOString() : null,
  }).select("id, manage_token, status, alt_offered_at").single();
  if (ins.error) throw new Error(`booking insert failed: ${ins.error.message}`);
  created.push(ins.data.id);
  return ins.data;
}

try {
  log("\n=== Phase 5 approval workflow smoke ===\n");

  const svcRes = await admin.from("services").select("id,name,duration_minutes").order("display_order").limit(1).single();
  if (svcRes.error) throw new Error(svcRes.error.message);
  const svc = svcRes.data;

  // ---- 1. schema sanity
  log("[1] schema sanity");
  const colCheck = await admin.from("bookings").select("alt_offered_at").limit(1);
  if (colCheck.error) fail(`alt_offered_at column missing: ${colCheck.error.message}`);
  else ok("bookings.alt_offered_at column exists");

  const insPending = await admin.from("bookings").insert({
    full_name: "smoke phase5 status check",
    phone: "+972500000055",
    service_id: svc.id,
    slot_start: snapToGrid(72).toISOString(),
    slot_end: new Date(snapToGrid(72).getTime() + svc.duration_minutes * 60_000).toISOString(),
    status: "pending",
  }).select("id").single();
  if (insPending.error) fail(`insert with status=pending failed: ${insPending.error.message}`);
  else { ok("status='pending' accepted by CHECK"); created.push(insPending.data.id); }

  // Notification template check
  const insTpl = await admin.from("notifications").insert({
    booking_id: insPending.data.id,
    channel: "sms",
    template: "booking_pending",
    recipient: "+972500000055",
    locale: "he",
    payload: { _smoke: true },
    scheduled_for: new Date().toISOString(),
  }).select("id").single();
  if (insTpl.error) fail(`booking_pending template not in CHECK: ${insTpl.error.message}`);
  else ok("notifications template 'booking_pending' accepted");

  // ---- 2. customer_confirm_alternative_by_token: not_found
  log("\n[2] confirm-alt: not_found");
  const r2 = await anon.rpc("customer_confirm_alternative_by_token", {
    p_token: "00000000-0000-4000-8000-000000000000",
    p_decision: "accept",
  }).maybeSingle();
  if (r2.data?.status === "not_found") ok("unknown token → not_found");
  else fail(`expected not_found, got ${JSON.stringify(r2.data)}`);

  // ---- 3. confirm-alt: not_pending (status confirmed, no alt offered)
  log("\n[3] confirm-alt: not_pending (booking is confirmed)");
  const b3 = await makeBooking({ slotOffsetHours: 96, status: "confirmed", svc });
  const r3 = await anon.rpc("customer_confirm_alternative_by_token", {
    p_token: b3.manage_token,
    p_decision: "accept",
  }).maybeSingle();
  if (r3.data?.status === "not_pending") ok("confirmed booking → not_pending");
  else fail(`expected not_pending, got ${JSON.stringify(r3.data)}`);

  // ---- 4. confirm-alt: not_pending (status pending but alt_offered_at NULL)
  log("\n[4] confirm-alt: not_pending (fresh pending, no alt)");
  const b4 = await makeBooking({ slotOffsetHours: 100, status: "pending", svc });
  const r4 = await anon.rpc("customer_confirm_alternative_by_token", {
    p_token: b4.manage_token,
    p_decision: "accept",
  }).maybeSingle();
  if (r4.data?.status === "not_pending") ok("pending without alt_offered_at → not_pending");
  else fail(`expected not_pending, got ${JSON.stringify(r4.data)}`);

  // ---- 5. confirm-alt: accept happy path
  log("\n[5] confirm-alt: accept");
  const b5 = await makeBooking({ slotOffsetHours: 110, status: "pending", alt: true, svc });
  const r5 = await anon.rpc("customer_confirm_alternative_by_token", {
    p_token: b5.manage_token,
    p_decision: "accept",
  }).maybeSingle();
  if (r5.data?.status === "ok") ok("alternative-offered + accept → ok");
  else fail(`expected ok, got ${JSON.stringify(r5.data)} err=${r5.error?.message}`);
  // Verify state: status=confirmed, alt_offered_at cleared
  const after5 = await admin.from("bookings").select("status, alt_offered_at").eq("id", b5.id).single();
  if (after5.data?.status === "confirmed" && after5.data.alt_offered_at === null) {
    ok("status flipped to confirmed and alt_offered_at cleared");
  } else {
    fail(`state wrong: ${JSON.stringify(after5.data)}`);
  }

  // ---- 6. confirm-alt: cancel
  log("\n[6] confirm-alt: cancel");
  const b6 = await makeBooking({ slotOffsetHours: 130, status: "pending", alt: true, svc });
  const r6 = await anon.rpc("customer_confirm_alternative_by_token", {
    p_token: b6.manage_token,
    p_decision: "cancel",
  }).maybeSingle();
  if (r6.data?.status === "ok") ok("alternative-offered + cancel → ok");
  else fail(`expected ok, got ${JSON.stringify(r6.data)}`);
  const after6 = await admin.from("bookings").select("status, alt_offered_at").eq("id", b6.id).single();
  if (after6.data?.status === "cancelled" && after6.data.alt_offered_at === null) {
    ok("status flipped to cancelled and alt_offered_at cleared");
  } else {
    fail(`state wrong: ${JSON.stringify(after6.data)}`);
  }

  // ---- 7. confirm-alt: too_late (alt-offered slot < 24h out)
  log("\n[7] confirm-alt: too_late");
  const b7 = await makeBooking({ slotOffsetHours: 12, status: "pending", alt: true, svc });
  const r7 = await anon.rpc("customer_confirm_alternative_by_token", {
    p_token: b7.manage_token,
    p_decision: "accept",
  }).maybeSingle();
  if (r7.data?.status === "too_late") ok("alt slot 12h out → too_late");
  else fail(`expected too_late, got ${JSON.stringify(r7.data)}`);

  // ---- 8. confirm-alt: invalid decision string
  log("\n[8] confirm-alt: invalid decision");
  const b8 = await makeBooking({ slotOffsetHours: 200, status: "pending", alt: true, svc });
  const r8 = await anon.rpc("customer_confirm_alternative_by_token", {
    p_token: b8.manage_token,
    p_decision: "wat",
  }).maybeSingle();
  if (r8.data?.status === "not_pending") ok("invalid decision string → not_pending (safe default)");
  else fail(`expected not_pending, got ${JSON.stringify(r8.data)}`);

  // ---- 9. get_booking_by_token returns alt_offered_at
  log("\n[9] get_booking_by_token includes alt_offered_at");
  const r9 = await anon.rpc("get_booking_by_token", { p_token: b8.manage_token }).maybeSingle();
  if (r9.data && "alt_offered_at" in r9.data && r9.data.alt_offered_at !== null) {
    ok("alt_offered_at present in get_booking_by_token result");
  } else {
    fail(`alt_offered_at missing or null: ${JSON.stringify(r9.data)}`);
  }
  if (r9.data?.status === "pending") ok("status='pending' returned");
  else fail(`status wrong: ${r9.data?.status}`);

  // ---- 10. GIST: pending row blocks another pending in same slot
  log("\n[10] GIST exclusion still gates pending overlaps");
  const b10a = await makeBooking({ slotOffsetHours: 220, status: "pending", svc });
  const colliding = await admin.from("bookings").insert({
    full_name: "smoke phase5 collision",
    phone: "+972500000055",
    service_id: svc.id,
    slot_start: b10a.slot_start ?? snapToGrid(220).toISOString(),
    slot_end: new Date((new Date(b10a.slot_start ?? snapToGrid(220).toISOString())).getTime() + svc.duration_minutes * 60_000).toISOString(),
    status: "pending",
  });
  if (colliding.error?.code === "23P01") ok("two pending bookings in same slot rejected (GIST)");
  else fail(`expected 23P01, got ${colliding.error?.code} ${colliding.error?.message}`);
  if (colliding.data) created.push(...colliding.data.map(r => r.id));

  // ---- 11. GIST: denied row does NOT block (released back into the schedule)
  log("\n[11] GIST: denied row releases its slot");
  const b11 = await makeBooking({ slotOffsetHours: 250, status: "denied", svc });
  const insAfterDeny = await admin.from("bookings").insert({
    full_name: "smoke phase5 reuses denied slot",
    phone: "+972500000055",
    service_id: svc.id,
    slot_start: snapToGrid(250).toISOString(),
    slot_end: new Date(snapToGrid(250).getTime() + svc.duration_minutes * 60_000).toISOString(),
    status: "pending",
  }).select("id").single();
  if (insAfterDeny.error) {
    fail(`denied did not release slot: ${insAfterDeny.error.message}`);
  } else {
    ok("denied row freed the slot for re-booking");
    created.push(insAfterDeny.data.id);
  }
  // sanity reference
  void b11;

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
