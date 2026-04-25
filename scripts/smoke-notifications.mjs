import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// 0. Verify table + index exist
const tableCheck = await admin.from("notifications").select("id", { count: "exact", head: true });
if (tableCheck.error) { console.error("notifications table not reachable:", tableCheck.error.message); process.exit(1); }
console.log(`notifications table reachable, current rows=${tableCheck.count}`);

// 1. Pick a service + future slot
const svc = await admin.from("services").select("id,name,duration_minutes").order("display_order").limit(1).single();
if (svc.error) { console.error("service fetch failed:", svc.error.message); process.exit(1); }
const s = svc.data;
console.log(`service: ${s.name} (${s.duration_minutes}min, id=${s.id})`);

// Use a slot 3 days out so the reminder is well in the future
const slotStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
slotStart.setUTCMinutes(0, 0, 0);
slotStart.setUTCHours(8); // 11:00 Asia/Jerusalem during DST
const slotEnd = new Date(slotStart.getTime() + s.duration_minutes * 60_000);

// 2. Create a booking via service role (bypasses RLS, mimics what createBooking writes)
const insRes = await admin.from("bookings").insert({
  full_name: "smoke notifications test",
  phone: "+972500000001",
  email: null,
  service_id: s.id,
  slot_start: slotStart.toISOString(),
  slot_end: slotEnd.toISOString(),
  status: "confirmed",
  preferred_date: slotStart.toISOString().slice(0,10),
  preferred_time: "11:00",
}).select().single();
if (insRes.error) { console.error("booking insert failed:", insRes.error.message); process.exit(1); }
const bookingId = insRes.data.id;
console.log(`booking inserted: id=${bookingId}, slot_start=${slotStart.toISOString()}`);

// 3. Manually call the enqueue path is server-only TS — instead, replicate the inserts directly
//    so we can verify the schema accepts every shape the helper emits.
const reminderAt = new Date(slotStart.getTime() - 24 * 60 * 60 * 1000).toISOString();
const payload = {
  customer_name: "smoke notifications test",
  service_name: s.name,
  duration_minutes: s.duration_minutes,
  slot_start_iso: slotStart.toISOString(),
  slot_start_local_date: "test",
  slot_start_local_time: "11:00",
  slot_start_local_weekday: "test",
};

const enqueueRes = await admin.from("notifications").insert([
  { booking_id: bookingId, channel: "sms", template: "booking_confirmed",     recipient: "+972500000001", locale: "he", payload, scheduled_for: new Date().toISOString() },
  { booking_id: bookingId, channel: "sms", template: "booking_reminder_24h", recipient: "+972500000001", locale: "he", payload, scheduled_for: reminderAt },
]).select();
if (enqueueRes.error) { console.error("enqueue failed:", enqueueRes.error.message); process.exit(1); }
console.log(`enqueued ${enqueueRes.data.length} notifications`);

// 4. Verify the rows landed and look right
const verify = await admin.from("notifications").select("id,template,status,scheduled_for,recipient").eq("booking_id", bookingId).order("scheduled_for");
console.table(verify.data);

// 5. Test cancellation path — set a row's reminder to skipped, mimic enqueueBookingCancelled
const skipRes = await admin
  .from("notifications")
  .update({ status: "skipped", error: "booking_cancelled" })
  .eq("booking_id", bookingId)
  .eq("template", "booking_reminder_24h")
  .eq("status", "queued")
  .select("id");
console.log(`reminder rows skipped: ${skipRes.data?.length ?? 0}`);

// 6. Cleanup
await admin.from("notifications").delete().eq("booking_id", bookingId);
await admin.from("bookings").delete().eq("id", bookingId);
console.log("cleanup: done");
console.log("smoke-notifications: OK");
