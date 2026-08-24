import fs from "fs/promises";
import os from "os";
import path from "path";
import { createAuditLog, exportDatabaseSnapshot, getPool } from "../lib/db";
import { createBackup } from "./backup";
import { restoreBackup } from "./restore";
import { generateId } from "../lib/utils";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Restore drills are only allowed outside production.");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "portal-restore-drill-"));
  const before = await exportDatabaseSnapshot();
  const backupPath = await createBackup(directory);
  await createAuditLog({
    id: generateId(), actorUserId: "restore-drill", action: "restore_drill_mutation",
    targetType: "Database", targetId: "development", at: new Date().toISOString(), metadata: {},
  });
  await restoreBackup(backupPath, { confirmed: true });
  const after = await exportDatabaseSnapshot();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Restore drill did not return the database to its original state.");
  await fs.rm(directory, { recursive: true, force: true });
  await getPool().end();
  console.log("Restore drill passed.");
}

main().catch((error) => {
  console.error("Restore drill failed:", error);
  process.exitCode = 1;
});