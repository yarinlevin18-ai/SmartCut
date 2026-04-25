// One-shot: insert 3 demo notifications so /admin/notifications has visible rows.
// Pass `--clean` to delete the demo rows instead.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const TAG = "demo-seed";

if (process.argv.includes("--clean")) {
  const r = await admin.from("notifications").delete().eq("error", TAG);
  console.log("cleaned demo rows:", r.error ? r.error.message : "ok");
  // also clean any with the tag in payload
  const r2 = await admin.from("notifications").delete().contains("payload", { _tag: TAG });
  console.log("cleaned by payload tag:", r2.error ? r2.error.message : "ok");
  process.exit(0);
}

const svc = await admin.from("services").select("id,name,duration_minutes").order("display_order").limit(1).single();
const slotStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
const payloadBase = (name) => ({
  _tag: TAG,
  customer_name: name,
  service_name: svc.data.name,
  duration_minutes: svc.data.duration_minutes,
  slot_start_iso: slotStart.toISOString(),
  slot_start_local_date: "27/04/2026",
  slot_start_local_time: "11:00",
  slot_start_local_weekday: "יום שני",
});

const rows = [
  { booking_id: null, channel: "sms", template: "booking_confirmed",     recipient: "+972501111111", locale: "he", payload: payloadBase("יוסי כהן"),   scheduled_for: new Date().toISOString(),                              status: "queued" },
  { booking_id: null, channel: "sms", template: "booking_reminder_24h", recipient: "+972502222222", locale: "he", payload: payloadBase("דנה לוי"),    scheduled_for: new Date(Date.now() + 60_000).toISOString(),           status: "queued" },
  { booking_id: null, channel: "sms", template: "booking_cancelled",    recipient: "+972503333333", locale: "he", payload: payloadBase("רון אברהם"), scheduled_for: new Date(Date.now() - 3600_000).toISOString(),         status: "sent",   sent_at: new Date(Date.now() - 1800_000).toISOString(), provider: "manual" },
];
const ins = await admin.from("notifications").insert(rows).select("id");
console.log("seeded:", ins.error ? ins.error.message : `${ins.data.length} rows`);
