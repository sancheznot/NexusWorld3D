/**
 * ES: Aplica migraciones pendientes (migrations/*.sql ordenadas). Idempotente por schema_migrations.
 * EN: Apply pending migrations (sorted migrations/*.sql). Idempotent via schema_migrations.
 *
 * ES: runPendingMigrations() al arranque; npm run db:migrate = CLI.
 * EN: runPendingMigrations() on boot; npm run db:migrate = CLI.
 */

import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { isMariaDbConfigured } from "@/lib/db/mariadb";

export type MigrationRunResult = {
  ok: boolean;
  applied: string[];
  skippedNoConfig: boolean;
  skippedByEnv: boolean;
  error?: string;
};

let inFlight: Promise<MigrationRunResult> | null = null;

function shouldSkipAutoMigrate(): boolean {
  const v = process.env.NEXUS_SKIP_AUTO_MIGRATE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function createMigrationPool() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return mysql.createPool({
      uri: url,
      multipleStatements: true,
    });
  }
  const host = process.env.MARIADB_HOST?.trim();
  if (!host || !process.env.MARIADB_USER || !process.env.MARIADB_DATABASE) {
    throw new Error(
      "DATABASE_URL or MARIADB_HOST, MARIADB_USER, MARIADB_DATABASE required"
    );
  }
  return mysql.createPool({
    host,
    port: Number(process.env.MARIADB_PORT || 3306),
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD ?? "",
    database: process.env.MARIADB_DATABASE,
    multipleStatements: true,
  });
}

async function hasSchemaMigrationsTable(
  conn: mysql.PoolConnection
): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'schema_migrations'`
  );
  return Number(rows[0]?.c) > 0;
}

async function executeMigrations(options?: {
  cwd?: string;
  quiet?: boolean;
}): Promise<MigrationRunResult> {
  const cwd = options?.cwd ?? process.cwd();
  const quiet = options?.quiet === true;
  const log = quiet ? () => {} : (...a: unknown[]) => console.log(...a);

  const applied: string[] = [];
  const dir = path.join(cwd, "migrations");
  if (!fs.existsSync(dir)) {
    return { ok: true, applied: [], skippedNoConfig: false, skippedByEnv: false };
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    return { ok: true, applied: [], skippedNoConfig: false, skippedByEnv: false };
  }

  let pool: mysql.Pool;
  try {
    pool = createMigrationPool();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      applied: [],
      skippedNoConfig: false,
      skippedByEnv: false,
      error: msg,
    };
  }

  const conn = await pool.getConnection();
  const lockName = "nexusworld_migrations";
  try {
    const [lockRows] = await conn.query<RowDataPacket[]>(
      "SELECT GET_LOCK(?, 120) AS got",
      [lockName]
    );
    if (Number(lockRows[0]?.got) !== 1) {
      return {
        ok: false,
        applied: [],
        skippedNoConfig: false,
        skippedByEnv: false,
        error: "migration_lock_timeout",
      };
    }

    try {
    let migrationsTable = await hasSchemaMigrationsTable(conn);

    for (const file of files) {
      const version = file.replace(/\.sql$/i, "");

      if (migrationsTable) {
        const [done] = await conn.query<RowDataPacket[]>(
          "SELECT 1 AS ok FROM schema_migrations WHERE version = ? LIMIT 1",
          [version]
        );
        if (done.length > 0) {
          log(`⏭️  migrations: skip ${file} (already applied)`);
          continue;
        }
      }

      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      log(`▶️  migrations: applying ${file}…`);
      await conn.query(sql);
      await conn.query("INSERT INTO schema_migrations (version) VALUES (?)", [
        version,
      ]);
      migrationsTable = true;
      applied.push(file);
      log(`✅ migrations: ${file}`);
    }
    } finally {
      await conn.query("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => {});
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("❌ migrations:", e);
    return {
      ok: false,
      applied,
      skippedNoConfig: false,
      skippedByEnv: false,
      error: msg,
    };
  } finally {
    conn.release();
    await pool.end();
  }

  if (applied.length > 0 && !quiet) {
    console.log(
      `📦 migrations: ${applied.length} file(s) applied — ${applied.join(", ")}`
    );
  }
  return { ok: true, applied, skippedNoConfig: false, skippedByEnv: false };
}

/**
 * ES: Ejecuta migraciones pendientes; llamadas concurrentes comparten la misma promesa.
 * EN: Run pending migrations; concurrent callers share one in-flight promise.
 */
export async function runPendingMigrations(options?: {
  cwd?: string;
  quiet?: boolean;
}): Promise<MigrationRunResult> {
  if (!isMariaDbConfigured()) {
    return { ok: true, applied: [], skippedNoConfig: true, skippedByEnv: false };
  }
  if (shouldSkipAutoMigrate()) {
    return { ok: true, applied: [], skippedNoConfig: false, skippedByEnv: true };
  }

  if (!inFlight) {
    inFlight = executeMigrations(options).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

export async function runPendingMigrationsCli(cwd: string): Promise<void> {
  if (!isMariaDbConfigured()) {
    console.error("❌ migrate: configure DATABASE_URL or MARIADB_*");
    process.exit(1);
  }

  const r = await executeMigrations({ cwd, quiet: false });
  if (!r.ok) {
    console.error("❌ migrate:", r.error);
    process.exit(1);
  }
}
