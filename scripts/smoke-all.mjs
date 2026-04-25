// Pre-deploy regression sweep — runs every smoke + audit in sequence.
// Per-phase smokes that hit the live DB run unconditionally. Smokes that
// require a running dev server skip with a clear note unless BASE_URL is set.
//
// Exit code is the count of failed scripts.
//
// Usage:
//   node scripts/smoke-all.mjs                     # DB-only smokes
//   BASE_URL=http://localhost:3003 node scripts/smoke-all.mjs   # + dev-server smokes

import { spawn } from "node:child_process";
import process from "node:process";

const requiresServer = new Set([
  "smoke-rate-limit.mjs",
  "smoke-calendar-feed.mjs",
]);

// Order matters: cheaper checks first, integration smokes last.
const PLAN = [
  // Audits (must pass before anything else is meaningful).
  "audit-rls.mjs",
  "audit-timezone.mjs",
  // Phase 1.
  "smoke-slots.mjs",
  "smoke-conflict.mjs",
  // Phase 2.
  "smoke-notifications.mjs",
  "smoke-sms-templates.mjs",
  "smoke-inforu-contract.mjs",
  // Phase 3 + v1.1.
  "smoke-self-service-cancel.mjs",
  "smoke-reschedule.mjs",
  // Phase 3.2 (needs server).
  "smoke-rate-limit.mjs",
  // Phase 4 (needs server).
  "smoke-calendar-feed.mjs",
  // Phase 5.
  "smoke-approval.mjs",
  // Phase 6.
  "smoke-products.mjs",
];

function runOne(file) {
  return new Promise((resolve) => {
    const args = ["scripts/" + file];
    if (file === "smoke-sms-templates.mjs") {
      args.unshift("--experimental-strip-types");
    }
    const start = Date.now();
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      resolve({ file, code: code ?? 1, ms: Date.now() - start });
    });
    child.on("error", (err) => {
      console.error(`spawn error for ${file}:`, err.message);
      resolve({ file, code: 1, ms: Date.now() - start });
    });
  });
}

async function main() {
  const baseUrl = process.env.BASE_URL;
  const results = [];
  let skipped = 0;

  console.log("\n=== Pre-deploy smoke sweep ===\n");
  if (!baseUrl) {
    console.log("BASE_URL not set — skipping smokes that require a dev server.");
    console.log("Re-run with `BASE_URL=http://localhost:3003 node scripts/smoke-all.mjs` for full coverage.\n");
  }

  for (const file of PLAN) {
    if (requiresServer.has(file) && !baseUrl) {
      console.log(`\n--- SKIP  ${file}  (needs BASE_URL)\n`);
      skipped++;
      continue;
    }
    console.log(`\n--- RUN   ${file}\n`);
    const result = await runOne(file);
    results.push(result);
    console.log(
      `\n--- ${result.code === 0 ? "PASS" : "FAIL"}  ${file}  (${result.ms}ms)\n`,
    );
  }

  // Summary
  console.log("\n=== Summary ===");
  const passed = results.filter((r) => r.code === 0).length;
  const failed = results.filter((r) => r.code !== 0);
  console.log(`  ran:     ${results.length}`);
  console.log(`  passed:  ${passed}`);
  console.log(`  failed:  ${failed.length}`);
  console.log(`  skipped: ${skipped}`);

  if (failed.length) {
    console.log("\nFailed scripts:");
    for (const r of failed) console.log(`  - ${r.file} (exit ${r.code})`);
    process.exit(failed.length);
  }
  console.log("\n=== ALL GREEN ===\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("aggregator error:", err);
  process.exit(99);
});
