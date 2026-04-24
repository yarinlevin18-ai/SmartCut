import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8")
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const svc = await admin.from("services").select("id,name,duration_minutes").order("display_order").limit(1);
const s = svc.data[0];

const slotStart = "2026-04-28T06:00:00+00:00";
const slotEnd = new Date(new Date(slotStart).getTime() + s.duration_minutes*60000).toISOString();

await admin.from("bookings").delete().eq("slot_start", slotStart);

const ins1 = await admin.from("bookings").insert({
  full_name: "Conflict Test 1", phone: "+972501234567", email: null,
  service_id: s.id, slot_start: slotStart, slot_end: slotEnd, status: "confirmed"
}).select().single();
console.log("first insert:", ins1.error ? `FAIL: ${ins1.error.message} (${ins1.error.code})` : "OK");

const ins2 = await admin.from("bookings").insert({
  full_name: "Conflict Test 2", phone: "+972509999999", email: null,
  service_id: s.id, slot_start: slotStart, slot_end: slotEnd, status: "confirmed"
}).select().single();
console.log("second insert (should fail 23P01):", ins2.error ? `${ins2.error.code}: ${ins2.error.message}` : "UNEXPECTED SUCCESS");

const overlapStart = "2026-04-28T06:15:00+00:00";
const overlapEnd = new Date(new Date(overlapStart).getTime() + s.duration_minutes*60000).toISOString();
const ins3 = await admin.from("bookings").insert({
  full_name: "Overlap Test", phone: "+972508888888", email: null,
  service_id: s.id, slot_start: overlapStart, slot_end: overlapEnd, status: "confirmed"
}).select().single();
console.log("overlap insert 15min later (should fail 23P01):", ins3.error ? `${ins3.error.code}: ${ins3.error.message}` : "UNEXPECTED SUCCESS");

await admin.from("bookings").delete().eq("slot_start", slotStart);
console.log("cleanup: done");
