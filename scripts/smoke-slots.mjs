import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8")
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);

const supa = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const svc = await supa.from("services").select("id,name,duration_minutes").order("display_order").limit(1);
if (svc.error || !svc.data?.[0]) { console.error("service fetch failed:", svc.error); process.exit(1); }
const s = svc.data[0];

const dateStr = process.argv[2] || "2026-04-26"; // default: known Sunday

const { data, error } = await supa.rpc("get_available_slots", { p_service_id: s.id, p_date: dateStr });
console.log(JSON.stringify({ service: s.name, duration: s.duration_minutes, date: dateStr, error, slotCount: data?.length, firstFew: data?.slice(0,5), lastFew: data?.slice(-3) }, null, 2));
