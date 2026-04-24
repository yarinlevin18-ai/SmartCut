import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
const envText = fs.readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: delErr } = await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (delErr) {
  console.error("delete failed:", delErr.message);
  process.exit(1);
}

const wixServices = [
  { name: "Beard", description: "עיצוב זקן", price: 50, duration_minutes: 30, display_order: 1 },
  { name: "Classic", description: "עיצוב שיער", price: 90, duration_minutes: 30, display_order: 2 },
  { name: "Premium", description: "עיצוב שיער & קיצוץ זקן", price: 110, duration_minutes: 45, display_order: 3 },
  { name: "Luxury", description: "עיצוב שיער & עיצוב זקן & שעווה", price: 130, duration_minutes: 60, display_order: 4 },
];

const { data, error: insErr } = await supabase
  .from("services")
  .insert(wixServices)
  .select();

if (insErr) {
  console.error("insert failed:", insErr.message);
  process.exit(1);
}

console.log(JSON.stringify({ replaced: data.length, services: data.map((s) => ({ id: s.id, name: s.name, price: s.price })) }, null, 2));
process.exit(0);
