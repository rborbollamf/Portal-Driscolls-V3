import fs from "fs/promises";
import path from "path";
import { getPool, withTransaction } from "../lib/db";

export async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const pool = getPool();
  await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(742001)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    for (const file of files) {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [file]);
      if (applied.rowCount) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      console.log(`Applied ${file}`);
    }
  });
  console.log("Database schema is current.");
  await pool.end();
}

if (require.main === module) {
  runMigrations().catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  });
}