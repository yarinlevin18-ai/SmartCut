// Generic migration applier.
// Usage: DATABASE_URL=... node scripts/apply-migration.mjs supabase/migrations/004_notifications.sql
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL before running."); process.exit(1); }

const arg = process.argv[2];
if (!arg) { console.error("Usage: node scripts/apply-migration.mjs <path/to/migration.sql>"); process.exit(1); }

const sqlPath = path.resolve(process.cwd(), arg);
if (!fs.existsSync(sqlPath)) { console.error(`Not found: ${sqlPath}`); process.exit(1); }
const sql = fs.readFileSync(sqlPath, "utf8");
const fileName = path.basename(sqlPath);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log(`Connected. Applying ${fileName}...`);
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log(`Applied ${fileName} successfully.`);
} catch (err) {
  console.error(`Migration FAILED: ${err.message}`);
  try { await client.query("ROLLBACK"); } catch {}
  process.exit(1);
} finally {
  await client.end();
}
