import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import { exportDatabaseSnapshot, getPool } from "../lib/db";
import { snapshotCounts } from "../lib/db/snapshot";

export interface DatabaseBackup {
  format: "portal-monitoring-backup/v1";
  createdAt: string;
  counts: Record<string, number>;
  snapshot: Awaited<ReturnType<typeof exportDatabaseSnapshot>>;
  checksum: string;
}

function checksum(payload: Omit<DatabaseBackup, "checksum">) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function createBackup(outputDirectory = path.join(process.cwd(), "backups")) {
  const snapshot = await exportDatabaseSnapshot();
  const payload = {
    format: "portal-monitoring-backup/v1" as const,
    createdAt: new Date().toISOString(),
    counts: snapshotCounts(snapshot),
    snapshot,
  };
  const backup: DatabaseBackup = { ...payload, checksum: checksum(payload) };
  await fs.mkdir(outputDirectory, { recursive: true });
  const filename = `portal-backup-${backup.createdAt.replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(outputDirectory, filename);
  await fs.writeFile(filePath, JSON.stringify(backup, null, 2), { mode: 0o600 });
  console.log(`Backup written to ${filePath}`, backup.counts);
  return filePath;
}

if (require.main === module) {
  createBackup(process.argv[2] ?? path.join(process.cwd(), "backups")).catch((error) => {
    console.error("Backup failed:", error);
    process.exitCode = 1;
  }).finally(() => {
    void getPool().end();
  });
}

export function verifyBackup(backup: DatabaseBackup) {
  if (backup.format !== "portal-monitoring-backup/v1") throw new Error("Unsupported backup format.");
  const { checksum: storedChecksum, ...payload } = backup;
  if (checksum(payload) !== storedChecksum) throw new Error("Backup checksum does not match.");
  return backup;
}