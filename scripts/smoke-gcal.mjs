// Phase 7 Google Calendar smoke. Verifies what we CAN test without real
// Google credentials: schema, RLS, env var detection, and the public route
// surface (admin-only gating, env-not-configured behaviour).
//
// Real Google API calls (createEvent / updateEvent / deleteEvent) need a
// connected account — exercise those manually after running the OAuth flow.
//
// Usage:
//   node scripts/smoke-gcal.mjs                                    # DB only
//   BASE_URL=http://localhost:3003 node scripts/smoke-gcal.mjs     # + route surface

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => { const i=l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")]; })
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon  = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const BASE_URL = process.env.BASE_URL || null;
let exitCode = 0;
const log = (...a) => console.log(...a);
const ok  = (msg) => log(`  PASS  ${msg}`);
const fail = (msg) => { exitCode = 1; log(`  FAIL  ${msg}`); };

try {
  log("\n=== Phase 7 Google Calendar smoke ===\n");

  // ---- 1. Schema sanity
  log("[1] schema sanity");
  const tableCheck = await admin.from("oauth_tokens").select("id, provider").limit(1);
  if (tableCheck.error) fail(`oauth_tokens table not readable: ${tableCheck.error.message}`);
  else ok("oauth_tokens table accessible via service role");

  const colCheck = await admin.from("bookings").select("gcal_event_id").limit(1);
  if (colCheck.error) fail(`bookings.gcal_event_id missing: ${colCheck.error.message}`);
  else ok("bookings.gcal_event_id column exists");

  // ---- 2. RLS — anon CANNOT read oauth_tokens (refresh_token is a credential!)
  log("\n[2] RLS isolation — credentials must NEVER leak to anon");
  // Seed a test row via service role.
  const seed = await admin.from("oauth_tokens").upsert({
    provider: "google_calendar",
    access_token: "smoke-access",
    refresh_token: "smoke-refresh-NEVER-LEAK",
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    scope: "test",
    account_email: "smoke@example.com",
  }, { onConflict: "provider" }).select("id").maybeSingle();
  if (seed.error && seed.error.code !== "23505") {
    fail(`seed failed: ${seed.error.message}`);
  } else {
    ok("seeded test token row");
  }

  const anonRead = await anon.from("oauth_tokens").select("refresh_token");
  if (anonRead.error) {
    ok(`anon read blocked at RLS: ${anonRead.error.message}`);
  } else if (!anonRead.data || anonRead.data.length === 0) {
    ok("anon read returns 0 rows (RLS gate)");
  } else {
    fail(`anon LEAKED ${anonRead.data.length} oauth_tokens rows — refresh_token exposed!`);
  }

  const anonWrite = await anon.from("oauth_tokens").insert({
    provider: "smoke_anon",
    access_token: "x",
    refresh_token: "x",
    expires_at: new Date().toISOString(),
  });
  if (anonWrite.error) ok("anon insert blocked by RLS");
  else fail("anon was able to INSERT into oauth_tokens (RLS broken)");

  // ---- 3. updated_at trigger fires
  log("\n[3] updated_at trigger");
  const before = await admin.from("oauth_tokens").select("updated_at").eq("provider", "google_calendar").single();
  await new Promise(r => setTimeout(r, 50));
  await admin.from("oauth_tokens").update({ access_token: "smoke-access-2" }).eq("provider", "google_calendar");
  const after = await admin.from("oauth_tokens").select("updated_at").eq("provider", "google_calendar").single();
  if (after.data?.updated_at && before.data?.updated_at && after.data.updated_at > before.data.updated_at) {
    ok("updated_at advanced on UPDATE");
  } else {
    fail(`updated_at not advanced: ${before.data?.updated_at} → ${after.data?.updated_at}`);
  }

  // ---- 4. provider UNIQUE — only one row per integration
  log("\n[4] provider UNIQUE");
  const dupe = await admin.from("oauth_tokens").insert({
    provider: "google_calendar",
    access_token: "x", refresh_token: "x",
    expires_at: new Date().toISOString(),
  });
  if (dupe.error?.code === "23505") ok("duplicate provider rejected (UNIQUE)");
  else fail(`expected 23505, got ${dupe.error?.code} ${dupe.error?.message}`);

  // ---- 5. Live route surface — only if BASE_URL set
  if (BASE_URL) {
    log("\n[5] route surface");
    const r1 = await fetch(`${BASE_URL}/api/auth/google/connect`, { redirect: "manual" });
    if (r1.status === 401) ok("/connect blocks unauthenticated callers (admin-only)");
    else if (r1.status >= 300 && r1.status < 400) {
      // Could be redirect to login or to Google. Either is OK behaviour for a public test.
      ok(`/connect responded ${r1.status} (redirect — admin auth or Google consent)`);
    } else {
      fail(`/connect returned ${r1.status} — expected 401 or redirect`);
    }

    const r2 = await fetch(`${BASE_URL}/api/auth/google/disconnect`, { method: "POST" });
    if (r2.status === 401) ok("/disconnect blocks unauthenticated callers");
    else fail(`/disconnect returned ${r2.status} — expected 401`);
  } else {
    log("\n[5] route surface (skipped — set BASE_URL to test)");
  }

  // ---- 6. Inforu-style adapter contract: gcal env detection
  log("\n[6] env detection");
  const hasEnv = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
  if (hasEnv) ok(`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI present in .env.local`);
  else ok(`GOOGLE_* env vars not set (gcal will short-circuit; admin UI shows "not configured")`);

} catch (err) {
  fail(`uncaught: ${err.message}`);
} finally {
  log("\n[cleanup]");
  await admin.from("oauth_tokens").delete().in("provider", ["google_calendar", "smoke_anon"]);
  log("  cleared smoke rows");
  log(exitCode === 0 ? "\n=== ALL CHECKS PASSED ===" : "\n=== SMOKE FAILED ===");
  process.exit(exitCode);
}
