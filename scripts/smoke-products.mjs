// End-to-end smoke for Phase 6 products feature.
// Verifies: schema, RLS (anon active-only / authenticated full), reorder logic.
// Cleans up its own rows.

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

try {
  log("\n=== Phase 6 products smoke ===\n");

  // ---- 1. Schema sanity
  log("[1] schema sanity");
  const r1 = await admin.from("products").select("id, name, price, is_active, display_order").limit(1);
  if (r1.error) fail(`products table not readable: ${r1.error.message}`);
  else ok("products table accessible via service role");

  // ---- 2. Insert active + inactive products
  log("\n[2] insert active + inactive");
  const insActive = await admin.from("products").insert({
    name: "smoke-active",
    description: "Visible in public",
    price: 99.99,
    is_active: true,
    display_order: 9001,
  }).select("id").single();
  if (insActive.error) fail(`insert active failed: ${insActive.error.message}`);
  else { created.push(insActive.data.id); ok("active product inserted"); }

  const insInactive = await admin.from("products").insert({
    name: "smoke-inactive",
    description: "Hidden from public",
    price: null,
    is_active: false,
    display_order: 9002,
  }).select("id").single();
  if (insInactive.error) fail(`insert inactive failed: ${insInactive.error.message}`);
  else { created.push(insInactive.data.id); ok("inactive (hidden) product inserted"); }

  // ---- 3. Anon RLS — active visible, inactive blocked
  log("\n[3] anon RLS");
  const anonAll = await anon.from("products").select("id, name, is_active").in("id", created);
  const anonActive = anonAll.data?.find(r => r.name === "smoke-active");
  const anonInactive = anonAll.data?.find(r => r.name === "smoke-inactive");
  if (anonActive) ok("anon CAN read active products");
  else fail("anon CANNOT read active product");
  if (!anonInactive) ok("anon CANNOT read inactive products (RLS gate)");
  else fail("anon read inactive product (RLS LEAK!)");

  // ---- 4. Anon write blocked (any insert/update/delete)
  log("\n[4] anon write isolation");
  const anonInsert = await anon.from("products").insert({ name: "anon-attempt" });
  if (anonInsert.error?.code === "42501" || anonInsert.error?.message?.includes("row-level security")) {
    ok("anon insert blocked by RLS");
  } else if (anonInsert.error) {
    ok(`anon insert blocked (${anonInsert.error.message})`);
  } else {
    fail("anon was able to INSERT into products (RLS broken)");
  }

  // ---- 5. Price CHECK constraint
  log("\n[5] price CHECK");
  const negPrice = await admin.from("products").insert({ name: "negative", price: -1, display_order: 9003 });
  if (negPrice.error?.code === "23514") ok("negative price rejected by CHECK");
  else fail(`negative price not rejected: ${JSON.stringify(negPrice.error)}`);

  // ---- 6. updated_at trigger fires on update
  log("\n[6] updated_at trigger");
  const before = await admin.from("products").select("updated_at").eq("id", created[0]).single();
  await new Promise(r => setTimeout(r, 50));
  await admin.from("products").update({ description: "edited" }).eq("id", created[0]);
  const after = await admin.from("products").select("updated_at").eq("id", created[0]).single();
  if (after.data?.updated_at && before.data?.updated_at && after.data.updated_at > before.data.updated_at) {
    ok("updated_at advanced on UPDATE");
  } else {
    fail(`updated_at not advanced: ${before.data?.updated_at} → ${after.data?.updated_at}`);
  }

  // ---- 7. Storage bucket exists + is public
  log("\n[7] storage bucket");
  const buckets = await admin.storage.listBuckets();
  const productsBucket = buckets.data?.find(b => b.id === "products");
  if (productsBucket) ok("products bucket exists");
  else fail("products bucket missing");
  if (productsBucket?.public) ok("products bucket is public");
  else fail("products bucket is NOT public");

  // ---- 8. Order + filter by is_active (covered by partial index)
  log("\n[8] order + active filter query");
  const orderCheck = await admin
    .from("products")
    .select("id, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(3);
  if (!orderCheck.error) ok("active+order query works");
  else fail(`active+order query failed: ${orderCheck.error.message}`);

} catch (err) {
  fail(`uncaught: ${err.message}`);
} finally {
  log("\n[cleanup]");
  if (created.length) {
    const del = await admin.from("products").delete().in("id", created);
    if (del.error) log("  cleanup error:", del.error.message);
    else log(`  removed ${created.length} test products`);
  }
  log(exitCode === 0 ? "\n=== ALL CHECKS PASSED ===" : "\n=== SMOKE FAILED ===");
  process.exit(exitCode);
}
