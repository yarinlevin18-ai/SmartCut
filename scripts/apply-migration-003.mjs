import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL in the environment before running.");
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), "supabase/migrations/003_scheduling.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Connected. Applying 003_scheduling.sql...");
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Migration applied successfully.");

  const checks = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM availability_config) AS config_rows,
      (SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_available_slots') AS rpc_exists,
      (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'bookings_no_overlap') AS exclusion_exists,
      (SELECT COUNT(*) FROM pg_constraint WHERE conname = 'services_duration_15min_grid_chk') AS services_check_exists;
  `);
  console.log("Post-migration checks:", checks.rows[0]);
} catch (err) {
  console.error("Migration FAILED:", err.message);
  try { await client.query("ROLLBACK"); } catch {}
  process.exit(1);
} finally {
  await client.end();
}
