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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = "admin@local.test";
const passwords = ["1234", "admin1234"];

for (const password of passwords) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) {
    console.log(JSON.stringify({ created: true, email, password, userId: data.user.id }, null, 2));
    process.exit(0);
  }
  if (error.message.includes("already been registered") || error.message.includes("already exists")) {
    const list = await admin.auth.admin.listUsers();
    const existing = list.data?.users.find((u) => u.email === email);
    if (existing) {
      const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, { password });
      if (!updErr) {
        console.log(JSON.stringify({ updated: true, email, password, userId: existing.id }, null, 2));
        process.exit(0);
      }
      console.log("update failed with", password, ":", updErr.message);
      continue;
    }
  }
  console.log("create failed with", password, ":", error.message);
}
console.error("All password attempts failed.");
process.exit(1);
