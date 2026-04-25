// Pure-function smoke for SMS template rendering. Verifies:
//   - Phase 2.1: manage URL appended to booking_confirmed + booking_rescheduled
//   - Legacy rows (no manage_url in payload) still render without it
//   - booking_reminder_24h + booking_cancelled deliberately do NOT include URL
//
// Run:  node --experimental-strip-types scripts/smoke-sms-templates.mjs
// (We import the TS source directly so there's no compile step.)

import { renderSmsBody } from "../lib/sms/templates.ts";

let exitCode = 0;
const log = (...a) => console.log(...a);
const ok  = (msg) => log(`  PASS  ${msg}`);
const fail = (msg) => { exitCode = 1; log(`  FAIL  ${msg}`); };

const TOKEN = "deadbeef-1234-4567-8910-abcdefabcdef";
const URL = `https://carmelis.co.il/booking/manage/${TOKEN}`;

const fullPayload = {
  customer_name: "יוסי כהן",
  service_name: "תספורת",
  slot_start_local_date: "27/04/2026",
  slot_start_local_time: "11:00",
  manage_token: TOKEN,
  manage_url: URL,
};

const legacyPayload = {
  customer_name: "דנה לוי",
  service_name: "תספורת",
  slot_start_local_date: "28/04/2026",
  slot_start_local_time: "14:00",
  // No manage_url — pre-Phase-2.1 row.
};

log("\n=== Phase 2.1 SMS template smoke ===\n");

// ---- 1. booking_confirmed includes manage URL when payload carries one
log("[1] booking_confirmed");
{
  const body = renderSmsBody("booking_confirmed", fullPayload);
  if (body.includes(URL)) ok("body contains manage URL");
  else fail(`body missing URL: ${body}`);
  if (body.includes("יוסי")) ok("body greets customer by first name");
  else fail("first-name greeting missing");
  if (body.includes("11:00")) ok("body includes time");
  else fail("time missing");
}

// ---- 2. booking_confirmed legacy (no URL) still renders cleanly
log("\n[2] booking_confirmed legacy");
{
  const body = renderSmsBody("booking_confirmed", legacyPayload);
  if (!body.includes("https://")) ok("legacy body has no URL");
  else fail(`legacy body unexpectedly has URL: ${body}`);
  if (!body.includes("undefined")) ok("no undefined leaks");
  else fail(`undefined leaked into body: ${body}`);
  if (!body.includes("לניהול:")) ok("no orphan 'לניהול:' label without URL");
  else fail("orphan label leaked into legacy body");
}

// ---- 3. booking_rescheduled includes URL
log("\n[3] booking_rescheduled");
{
  const body = renderSmsBody("booking_rescheduled", fullPayload);
  if (body.includes(URL)) ok("body contains manage URL");
  else fail(`body missing URL: ${body}`);
  if (body.includes("עבר")) ok("body uses 'עבר' (rescheduled) language");
  else fail("rescheduled language missing");
}

// ---- 4. booking_reminder_24h does NOT include URL (cutoff already passed)
log("\n[4] booking_reminder_24h excludes URL");
{
  const body = renderSmsBody("booking_reminder_24h", fullPayload);
  if (!body.includes("https://")) ok("reminder has no URL (cutoff passed)");
  else fail(`reminder leaked URL: ${body}`);
  if (body.includes("מחר")) ok("reminder says 'tomorrow'");
  else fail("'מחר' missing from reminder");
}

// ---- 5. booking_cancelled does NOT include URL
log("\n[5] booking_cancelled excludes URL");
{
  const body = renderSmsBody("booking_cancelled", fullPayload);
  if (!body.includes("https://")) ok("cancelled has no URL");
  else fail(`cancelled leaked URL: ${body}`);
}

// ---- 6. Hebrew RTL — body should not contain raw mojibake
log("\n[6] no character corruption");
{
  const body = renderSmsBody("booking_confirmed", fullPayload);
  if (!/[�]/.test(body)) ok("no replacement chars (U+FFFD)");
  else fail(`replacement chars in body: ${body}`);
}

log(exitCode === 0 ? "\n=== ALL CHECKS PASSED ===" : "\n=== SMOKE FAILED ===");
process.exit(exitCode);
