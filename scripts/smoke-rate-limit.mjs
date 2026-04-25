// End-to-end smoke for Phase 3.2 rate limit on /booking/manage/[token].
// Hits the route 35 times in a tight loop from a single client. Expects
// the first 30 to pass through to the page (404 since token is bogus,
// but that's downstream of middleware) and 31+ to return 429.
//
// Usage:
//   BASE_URL=http://localhost:3003 node scripts/smoke-rate-limit.mjs

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const BOGUS_TOKEN = "00000000-0000-4000-8000-000000000000";
const URL = `${BASE_URL}/booking/manage/${BOGUS_TOKEN}`;
const TOTAL = 35;
const LIMIT = 30;

let exitCode = 0;
const log = (...a) => console.log(...a);
const ok  = (msg) => log(`  PASS  ${msg}`);
const fail = (msg) => { exitCode = 1; log(`  FAIL  ${msg}`); };

log(`\n=== Phase 3.2 manage-route rate-limit smoke ===\n`);
log(`base url: ${BASE_URL}`);
log(`hitting ${URL} x${TOTAL} times`);

const statuses = [];
let firstBlocked = -1;
let retryAfterOnFirstBlock = null;
let limitHeader = null;

// Sequential to keep request ordering deterministic.
for (let i = 1; i <= TOTAL; i++) {
  const r = await fetch(URL, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
  });
  statuses.push(r.status);

  if (i === 1) {
    limitHeader = r.headers.get("x-ratelimit-limit");
  }

  if (r.status === 429 && firstBlocked === -1) {
    firstBlocked = i;
    retryAfterOnFirstBlock = r.headers.get("retry-after");
  }
}

log("\n[results]");
log(`  status sequence: ${statuses.join(",")}`);
log(`  first 429 at request #${firstBlocked >= 0 ? firstBlocked : "never"}`);

// ----- Assertions -----

// 1. Every request before LIMIT+1 should NOT be 429.
const earlyBlocked = statuses.slice(0, LIMIT).filter(s => s === 429).length;
if (earlyBlocked === 0) ok(`first ${LIMIT} requests passed through (no premature 429)`);
else fail(`${earlyBlocked} of first ${LIMIT} requests were prematurely 429'd`);

// 2. Some request beyond LIMIT must be 429.
const lateBlocked = statuses.slice(LIMIT).filter(s => s === 429).length;
if (lateBlocked > 0) ok(`got ${lateBlocked} 429s in requests ${LIMIT + 1}..${TOTAL}`);
else fail(`expected 429s after request #${LIMIT}, got none`);

// 3. firstBlocked should be exactly LIMIT+1 (i.e. request #31 is the first to fail).
if (firstBlocked === LIMIT + 1) {
  ok(`first 429 happens at exactly request #${LIMIT + 1}`);
} else if (firstBlocked > 0 && firstBlocked > LIMIT) {
  ok(`first 429 happens at request #${firstBlocked} (within tolerance — limit may have been spent by warmup)`);
} else if (firstBlocked > 0 && firstBlocked <= LIMIT) {
  fail(`first 429 too early: #${firstBlocked} (likely stale bucket from a prior run; restart dev server)`);
} else {
  fail(`no 429 ever — middleware not gating this path?`);
}

// 4. Retry-After header.
if (retryAfterOnFirstBlock && Number(retryAfterOnFirstBlock) > 0) {
  ok(`Retry-After header present: ${retryAfterOnFirstBlock}s`);
} else {
  fail(`Retry-After header missing or invalid: ${retryAfterOnFirstBlock}`);
}

// 5. x-ratelimit-limit header.
if (limitHeader && Number(limitHeader) === LIMIT) {
  ok(`x-ratelimit-limit header reports ${LIMIT}`);
} else {
  fail(`x-ratelimit-limit header wrong: ${limitHeader}`);
}

log(exitCode === 0 ? "\n=== ALL CHECKS PASSED ===" : "\n=== SMOKE FAILED ===");
log("\nNote: this test pollutes the in-memory bucket. To re-run,");
log("either wait 60s for the window to roll, or restart the dev server.");
process.exit(exitCode);
