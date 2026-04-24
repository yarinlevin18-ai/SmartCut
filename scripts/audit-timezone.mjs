import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);
const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const svc = await supa.from("services").select("id,name,duration_minutes").order("display_order").limit(1);
const s = svc.data[0];

// Today is 2026-04-25, so March 2026 is past (filtered out). Test future transitions:
// DST end: Sun 2026-10-25 (clocks fall back, UTC+3 → UTC+2)
// DST start 2027: Fri 2027-03-26 (clocks spring forward, UTC+2 → UTC+3)
const dates = [
  { d: "2026-04-26", label: "baseline Sun DST active (UTC+3)" },
  { d: "2026-10-24", label: "Sat before DST end (closed)" },
  { d: "2026-10-25", label: "DST end Sun (UTC+2 after 02:00)" },
  { d: "2026-10-26", label: "Mon after DST end (UTC+2)" },
  { d: "2027-03-25", label: "Thu before DST start 2027 (UTC+2)" },
  { d: "2027-03-26", label: "DST start Fri 2027 (UTC+3 after 02:00, 09-14 cfg)" },
  { d: "2027-03-28", label: "Sun after DST start 2027 (UTC+3)" },
];

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });

for (const { d, label } of dates) {
  const { data, error } = await supa.rpc("get_available_slots", { p_service_id: s.id, p_date: d });
  if (error) { console.log(`${d} ${label}: ERROR ${error.message}`); continue; }
  const times = (data ?? []).map(r => fmt.format(new Date(r.slot_start)));
  console.log(`${d} ${label}: ${times.length} slots, first=${times[0] ?? "—"}, last=${times.at(-1) ?? "—"}`);
}
