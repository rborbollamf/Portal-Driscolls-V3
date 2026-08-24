import fs from "fs/promises";
import { exportDatabaseSnapshot, getDatabaseCounts, getPool, restoreDatabaseSnapshot } from "../lib/db";
import { snapshotCounts, validateDatabaseSnapshot } from "../lib/db/snapshot";
import { type DatabaseBackup, verifyBackup } from "./backup";

export async function restoreBackup(filePath: string, options: { confirmed?: boolean } = {}) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Direct restores are blocked in production. Use the managed recovery process.");
  }
  if (!options.confirmed) throw new Error("Restoring database contents requires explicit confirmation.");
  const backup = verifyBackup(JSON.parse(await fs.readFile(filePath, "utf8")) as DatabaseBackup);
  validateDatabaseSnapshot(backup.snapshot);
  const expected = snapshotCounts(backup.snapshot);
  if (JSON.stringify(expected) !== JSON.stringify(backup.counts)) throw new Error("Backup record counts do not match its contents.");
  await restoreDatabaseSnapshot(backup.snapshot, { replace: true });
  const actual = await getDatabaseCounts();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("Restore verification failed: record counts differ.");
  const restoredSnapshot = await exportDatabaseSnapshot();
  if (JSON.stringify(restoredSnapshot) !== JSON.stringify(backup.snapshot)) {
    throw new Error("Restore verification failed: restored content differs from the backup.");
  }
  console.log("Backup restored and verified:", actual);
}

if (require.main === module) {
  const [filePath, confirmation] = process.argv.slice(2);
  if (!filePath) throw new Error("Usage: npm run db:restore -- <backup-file> --confirm");
  if (confirmation !== "--confirm") throw new Error("Restoring database contents requires --confirm.");
  restoreBackup(filePath, { confirmed: true }).catch((error) => {
    console.error("Restore failed:", error);
    process.exitCode = 1;
  }).finally(() => {
    void getPool().end();
  });
}