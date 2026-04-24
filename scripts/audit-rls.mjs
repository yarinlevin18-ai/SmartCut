import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8")
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const checks = [];

// Classify outcomes precisely:
//  - "ok"            : no error; data is present (or insert succeeded)
//  - "empty"         : no error; zero rows returned (RLS silent filter OR table empty)
//  - "blocked"       : RLS/permission error (42501 or policy/permission message)
//  - "error:<code>"  : other Postgres error (FK, check, etc.) — not RLS-related
function classify(data, error) {
  if (error) {
    if (error.code === "42501" || /permission|policy|row-level security/i.test(error.message)) return "blocked";
    return `error:${error.code || error.message}`;
  }
  if (Array.isArray(data)) return data.length > 0 ? "ok" : "empty";
  return data ? "ok" : "empty";
}

async function test(label, fn, accept /* array of acceptable classifications */) {
  const { data, error } = await fn();
  const got = classify(data, error);
  const pass = accept.includes(got);
  checks.push({ label, accept: accept.join("|"), got, pass });
}

// Preload a real service_id + duration via service role (required for anon insert test).
const svcAdmin = await admin.from("services").select("id,duration_minutes").order("display_order").limit(1);
if (svcAdmin.error || !svcAdmin.data?.[0]) { console.error("No services available:", svcAdmin.error); process.exit(1); }
const svc = svcAdmin.data[0];

// Confirm bookings table actually has rows (so "empty" under anon means RLS filtered).
const bookingCount = await admin.from("bookings").select("id", { count: "exact", head: true });
const hasBookingRows = (bookingCount.count ?? 0) > 0;

// 1. Public reads that SHOULD succeed
await test("anon SELECT services",           () => anon.from("services").select("*").limit(1),           ["ok"]);
await test("anon SELECT availability_config", () => anon.from("availability_config").select("*").limit(1), ["ok"]);
await test("anon SELECT blocked_dates",      () => anon.from("blocked_dates").select("*").limit(1),      ["ok","empty"]); // legitimately empty

// 2. Reads that SHOULD be denied (RLS returns empty silently)
await test(
  `anon SELECT bookings (table has ${bookingCount.count} rows, RLS should hide all)`,
  () => anon.from("bookings").select("*").limit(1),
  hasBookingRows ? ["empty"] : ["empty","ok"]
);

// 3. Writes that SHOULD be blocked
await test("anon INSERT availability_config", () => anon.from("availability_config").insert({ weekday: 0, open_time: "09:00", close_time: "10:00", is_closed: false }), ["blocked"]);
await test("anon INSERT blocked_dates",       () => anon.from("blocked_dates").insert({ date: "2099-01-01" }), ["blocked"]);

// 4. Writes that SHOULD succeed (public booking form path)
//    Do NOT .select() after insert — anon lacks SELECT on bookings so the returning step would 42501.
const slotStart = new Date("2099-01-01T08:00:00Z").toISOString();
const slotEnd   = new Date(new Date(slotStart).getTime() + svc.duration_minutes * 60000).toISOString();
await test(
  "anon INSERT bookings (form submit path)",
  () => anon.from("bookings").insert({
    full_name: "rls_audit",
    phone: "+972500000000",
    service_id: svc.id,
    slot_start: slotStart,
    slot_end: slotEnd,
    status: "confirmed",
  }),
  ["ok","empty"] // no error, no returning → "empty"
);

// 5. RPC should work for anon
await test("anon RPC get_available_slots",
  () => anon.rpc("get_available_slots", { p_service_id: svc.id, p_date: "2026-04-26" }),
  ["ok","empty"]
);

// Cleanup: remove audit rows
await admin.from("bookings").delete().eq("full_name", "rls_audit");

console.table(checks);
const fails = checks.filter(c => !c.pass);
if (fails.length > 0) { console.error("FAILED CHECKS:", fails); process.exit(1); }
console.log("all rls checks passed");
