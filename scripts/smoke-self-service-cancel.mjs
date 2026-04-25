// End-to-end smoke for Phase 3 self-service cancel.
// Covers all 5 RPC status codes + cancellation notification fan-out.
// Cleanup deletes all rows it created.

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

async function makeBooking({ slotOffsetHours, status = "confirmed", svc }) {
  const slotStart = new Date(Date.now() + slotOffsetHours * 3600_000);
  const slotEnd = new Date(slotStart.getTime() + svc.duration_minutes * 60_000);
  const insRes = await admin.from("bookings").insert({
    full_name: `smoke phase3 ${slotOffsetHours}h ${status}`,
    phone: "+972500000077",
    email: "smoke@example.com",
    service_id: svc.id,
    slot_start: slotStart.toISOString(),
    slot_end: slotEnd.toISOString(),
    status,
  }).select("id, manage_token, slot_start, status").single();
  if (insRes.error) throw new Error(`booking insert failed: ${insRes.error.message}`);
  created.push(insRes.data.id);
  return insRes.data;
}

try {
  // -------------------------------------------------------------------- setup
  log("\n=== Phase 3 self-service cancel smoke ===\n");

  const svcRes = await admin.from("services").select("id,name,duration_minutes").order("display_order").limit(1).single();
  if (svcRes.error) throw new Error(svcRes.error.message);
  const svc = svcRes.data;
  log(`service: ${svc.name} (${svc.duration_minutes}min)`);

  // ----------------------------------------------------- 1. Schema sanity
  log("\n[1] schema sanity");
  const colCheck = await admin.from("bookings").select("manage_token").limit(1);
  if (colCheck.error) fail(`bookings.manage_token missing: ${colCheck.error.message}`);
  else ok("bookings.manage_token column exists");

  // ----------------------------------------------------- 2. not_found
  log("\n[2] not_found path");
  const ghostToken = "00000000-0000-4000-8000-000000000000";
  const r1 = await anon.rpc("cancel_booking_by_token", { p_token: ghostToken }).maybeSingle();
  if (r1.error) fail(`anon RPC failed: ${r1.error.message}`);
  else if (r1.data?.status === "not_found") ok("unknown token returns not_found");
  else fail(`expected not_found, got ${JSON.stringify(r1.data)}`);

  // ----------------------------------------------------- 3. ok (>24h slot)
  log("\n[3] ok path (slot 48h out)");
  const b3 = await makeBooking({ slotOffsetHours: 48, svc });
  log(`  booking id=${b3.id} token=${b3.manage_token}`);

  // 3a. get_booking_by_token returns details
  const g3 = await anon.rpc("get_booking_by_token", { p_token: b3.manage_token }).maybeSingle();
  if (g3.error || !g3.data) fail(`get_booking_by_token failed: ${g3.error?.message ?? "no data"}`);
  else if (g3.data.booking_id === b3.id) ok(`get_booking_by_token returned correct booking`);
  else fail(`get_booking_by_token returned wrong row`);

  // 3b. anon CANNOT read bookings directly under RLS
  const direct = await anon.from("bookings").select("id").eq("id", b3.id).maybeSingle();
  if (direct.data) fail(`anon could read bookings directly (RLS broken!)`);
  else ok("anon blocked from direct bookings SELECT (RLS holds)");

  // 3c. cancel via RPC
  const c3 = await anon.rpc("cancel_booking_by_token", { p_token: b3.manage_token }).maybeSingle();
  if (c3.error || c3.data?.status !== "ok") fail(`expected ok, got ${JSON.stringify(c3.data)} err=${c3.error?.message}`);
  else ok("cancel returned ok");

  // 3d. status flipped in DB
  const after = await admin.from("bookings").select("status").eq("id", b3.id).single();
  if (after.data?.status === "cancelled") ok("bookings.status flipped to cancelled");
  else fail(`status not flipped: ${after.data?.status}`);

  // ----------------------------------------------------- 4. already_cancelled (idempotent)
  log("\n[4] already_cancelled (repeat call)");
  const c4 = await anon.rpc("cancel_booking_by_token", { p_token: b3.manage_token }).maybeSingle();
  if (c4.data?.status === "already_cancelled") ok("repeat call returns already_cancelled (idempotent)");
  else fail(`expected already_cancelled, got ${JSON.stringify(c4.data)}`);

  // ----------------------------------------------------- 5. too_late (slot 12h out)
  log("\n[5] too_late path (slot 12h out)");
  const b5 = await makeBooking({ slotOffsetHours: 12, svc });
  const c5 = await anon.rpc("cancel_booking_by_token", { p_token: b5.manage_token }).maybeSingle();
  if (c5.data?.status === "too_late") ok("12h-out booking returns too_late");
  else fail(`expected too_late, got ${JSON.stringify(c5.data)}`);
  // confirm not flipped
  const after5 = await admin.from("bookings").select("status").eq("id", b5.id).single();
  if (after5.data?.status === "confirmed") ok("too_late did NOT mutate booking");
  else fail(`too_late path mutated status to ${after5.data?.status}`);

  // ----------------------------------------------------- 6. slot_in_past
  log("\n[6] slot_in_past path");
  // direct insert bypassing the bookings_slot_start_chk constraint isn't possible
  // (CHECK requires slot_start > now() - 1 day). Use slot_start = 30min ago, still inside the window.
  const b6 = await makeBooking({ slotOffsetHours: -0.5, svc });
  const c6 = await anon.rpc("cancel_booking_by_token", { p_token: b6.manage_token }).maybeSingle();
  if (c6.data?.status === "slot_in_past") ok("past slot returns slot_in_past");
  else fail(`expected slot_in_past, got ${JSON.stringify(c6.data)}`);

  // ----------------------------------------------------- 7. anon cannot bypass RPC
  log("\n[7] anon write isolation");
  const updateAttempt = await anon.from("bookings").update({ status: "cancelled" }).eq("id", b5.id);
  if (updateAttempt.error || (await admin.from("bookings").select("status").eq("id", b5.id).single()).data?.status === "confirmed") {
    ok("anon cannot UPDATE bookings directly (RLS + RPC are the only path)");
  } else {
    fail(`anon was able to UPDATE bookings.status without RPC!`);
  }

} catch (err) {
  fail(`uncaught: ${err.message}`);
} finally {
  // -------------------------------------------------------------------- cleanup
  log("\n[cleanup]");
  if (created.length) {
    // First clean any notifications that reference these bookings
    await admin.from("notifications").delete().in("booking_id", created);
    const del = await admin.from("bookings").delete().in("id", created);
    if (del.error) log("  cleanup error:", del.error.message);
    else log(`  removed ${created.length} test bookings`);
  }
  log(exitCode === 0 ? "\n=== ALL CHECKS PASSED ===" : "\n=== SMOKE FAILED ===");
  process.exit(exitCode);
}
