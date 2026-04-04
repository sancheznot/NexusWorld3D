/**
 * ES: Aplica migraciones SQL en orden (migrations/*.sql).
 * EN: Apply SQL migrations in order (migrations/*.sql).
 *
 * Uso / Usage: npx tsx scripts/migrate.ts
 */

import path from "node:path";
import dotenv from "dotenv";
import { runPendingMigrationsCli } from "../src/lib/db/runMigrations";

dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({
  path: path.join(process.cwd(), ".env.local"),
  override: true,
});

void runPendingMigrationsCli(process.cwd());
