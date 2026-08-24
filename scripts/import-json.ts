import fs from "fs/promises";
import path from "path";
import { getDatabaseCounts, getPool, restoreDatabaseSnapshot } from "../lib/db";
import { snapshotCounts, validateDatabaseSnapshot } from "../lib/db/snapshot";

export async function importJsonSnapshot(
  filePath = path.join(process.cwd(), "data", "db.json"),
  options: { replace?: boolean; confirmed?: boolean } = {}
) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JSON imports are blocked in production. Use the managed Publish migration flow.");
  }
  if (options.replace && !options.confirmed) {
    throw new Error("Replacing database contents requires explicit confirmation.");
  }
  const raw = await fs.readFile(filePath, "utf8");
  const snapshot: unknown = JSON.parse(raw);
  validateDatabaseSnapshot(snapshot);
  await restoreDatabaseSnapshot(snapshot, { replace: options.replace });
  const expected = snapshotCounts(snapshot);
  const actual = await getDatabaseCounts();
  for (const [collection, count] of Object.entries(expected)) {
    if (actual[collection as keyof typeof actual] !== count) {
      throw new Error(`Import validation failed for ${collection}: expected ${count}, got ${actual[collection as keyof typeof actual]}.`);
    }
  }
  console.log("JSON migration completed and validated:", actual);
  await getPool().end();
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const source = args.find((argument) => !argument.startsWith("--")) ?? path.join(process.cwd(), "data", "db.json");
  const replace = args.includes("--replace");
  if (replace && !args.includes("--confirm")) {
    throw new Error("Replacing database contents requires --confirm.");
  }
  importJsonSnapshot(source, { replace, confirmed: args.includes("--confirm") }).catch((error) => {
    console.error("JSON migration failed:", error);
    process.exitCode = 1;
  });
}