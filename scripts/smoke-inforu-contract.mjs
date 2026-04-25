// Probe-style smoke for the Inforu adapter — validates that our assumed v2
// JSON contract still matches reality WITHOUT needing real credentials.
//
// What this verifies (from real-API responses):
//   - capi.inforu.co.il is the live host (api.inforu.co.il is wrong/old)
//   - empty auth → HTTP 401, body has StatusId:-1 + StatusDescription
//   - bad auth  → HTTP 401, body has StatusId:-2 + auth/IP message
//   - response shape includes RequestId field
//
// If Inforu changes their JSON contract (different field names, different
// status codes for these conditions, different host), this smoke breaks
// loudly so we catch the drift before our adapter silently misclassifies.
//
// Usage:
//   node scripts/smoke-inforu-contract.mjs

const ENDPOINT = "https://capi.inforu.co.il/api/v2/SMS/SendSms";
const OLD_ENDPOINT = "https://api.inforu.co.il/api/v2/SMS/SendSms";

let exitCode = 0;
const log = (...a) => console.log(...a);
const ok  = (msg) => log(`  PASS  ${msg}`);
const fail = (msg) => { exitCode = 1; log(`  FAIL  ${msg}`); };

log("\n=== Inforu v2 SMS contract probe ===\n");
log(`endpoint: ${ENDPOINT}`);

// --- 1. Confirm old host is NOT the SMS endpoint
log("\n[1] old host is wrong (regression check)");
try {
  const r = await fetch(OLD_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 404) ok(`old api.inforu.co.il host returns 404 (not the right host)`);
  else if (r.status === 401) fail(`old host responded 401 — adapter URL might be valid after all? Investigate.`);
  else log(`  INFO  old host returned HTTP ${r.status} (not 404, but not 401 either)`);
} catch (err) {
  log(`  INFO  old host fetch failed: ${err.message} — that's fine, it confirms 'wrong host'`);
}

// --- 2. Empty auth → StatusId:-1
log("\n[2] empty auth path");
try {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(8000),
  });
  if (r.status !== 401) fail(`expected HTTP 401 on missing auth, got ${r.status}`);
  else ok(`HTTP 401 on missing auth`);

  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) ok(`Content-Type is application/json`);
  else fail(`Content-Type wrong: ${ct}`);

  const json = await r.json();
  if (typeof json.StatusId === "number" && json.StatusId === -1) ok(`StatusId === -1 on missing auth`);
  else fail(`expected StatusId:-1, got ${JSON.stringify(json.StatusId)}`);

  if (typeof json.StatusDescription === "string" && /authoriz/i.test(json.StatusDescription)) {
    ok(`StatusDescription mentions authorization: "${json.StatusDescription}"`);
  } else {
    fail(`StatusDescription unexpected: ${JSON.stringify(json.StatusDescription)}`);
  }

  if ("RequestId" in json) ok(`RequestId present in response`);
  else fail(`RequestId missing from response`);

  if ("FunctionName" in json) ok(`FunctionName present (= "${json.FunctionName}")`);
  else fail(`FunctionName missing from response`);
} catch (err) {
  fail(`empty-auth probe threw: ${err.message}`);
}

// --- 3. Bad credentials → StatusId:-2
log("\n[3] bad-credentials path");
try {
  const fakeAuth = Buffer.from("smoke-not-a-real-user:smoke-token").toString("base64");
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${fakeAuth}`,
    },
    body: JSON.stringify({
      Data: {
        Message: "smoke probe — should never send",
        Recipients: [{ Phone: "0500000000" }],
        Settings: { Sender: "Smoke" },
      },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (r.status !== 401) fail(`expected HTTP 401 on bad creds, got ${r.status}`);
  else ok(`HTTP 401 on bad creds`);

  const json = await r.json();
  if (typeof json.StatusId === "number" && json.StatusId === -2) ok(`StatusId === -2 on bad creds`);
  else fail(`expected StatusId:-2, got ${JSON.stringify(json.StatusId)}`);

  if (typeof json.StatusDescription === "string" && /(auth|illegal\s*ip)/i.test(json.StatusDescription)) {
    ok(`StatusDescription mentions auth or IP: "${json.StatusDescription}"`);
  } else {
    fail(`StatusDescription unexpected: ${JSON.stringify(json.StatusDescription)}`);
  }
} catch (err) {
  fail(`bad-creds probe threw: ${err.message}`);
}

// --- 4. Adapter consumes this contract correctly (unit-style, no network)
log("\n[4] adapter parses StatusId field (not Status)");
// Spot-check the adapter source for the field name.
// (Light static check — the real validation is the build typecheck.)
import("node:fs").then((fs) => {
  const src = fs.readFileSync("lib/sms/inforu.ts", "utf8");
  if (src.includes('typeof json.StatusId === "number"')) ok("adapter reads StatusId");
  else fail("adapter does NOT read StatusId — fix lib/sms/inforu.ts");
  if (src.includes("capi.inforu.co.il")) ok("adapter targets capi.inforu.co.il");
  else fail("adapter does NOT target capi.inforu.co.il — fix the default URL");
  if (src.includes("RequestId")) ok("adapter surfaces RequestId");
  else fail("adapter does NOT surface RequestId — add to error path");

  log(exitCode === 0 ? "\n=== ALL CHECKS PASSED ===" : "\n=== SMOKE FAILED ===");
  process.exit(exitCode);
});
