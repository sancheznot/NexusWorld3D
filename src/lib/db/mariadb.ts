/**
 * ES: Pool MariaDB/MySQL (mysql2). Desactivado si no hay MARIADB_HOST ni DATABASE_URL.
 * EN: MariaDB/MySQL pool (mysql2). Disabled if neither MARIADB_HOST nor DATABASE_URL is set.
 */

import mysql from "mysql2/promise";

declare global {
  var __nexusMariaPool: mysql.Pool | undefined;
}

/** ES: Tabla o BD aún sin migrar. EN: Table/DB not migrated yet. */
export function isMariaDbSchemaMissingError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { code?: string; errno?: number };
  return err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146;
}

let mariaSchemaHintLogged = false;

/** ES: Un aviso en dev si faltan tablas (evita spam). EN: One dev hint if tables are missing. */
export function logMariaSchemaMigrateHint(context: string): void {
  if (process.env.NODE_ENV !== "development" || mariaSchemaHintLogged) return;
  mariaSchemaHintLogged = true;
  console.warn(
    `[${context}] MariaDB tables missing — run: npm run db:migrate`
  );
}

export function isMariaDbConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL?.trim() ||
      (process.env.MARIADB_HOST?.trim() &&
        process.env.MARIADB_USER?.trim() &&
        process.env.MARIADB_DATABASE?.trim())
  );
}

export function getMariaPool(): mysql.Pool | null {
  if (!isMariaDbConfigured()) {
    return null;
  }

  if (globalThis.__nexusMariaPool === undefined) {
    const url = process.env.DATABASE_URL?.trim();
    if (url) {
      globalThis.__nexusMariaPool = mysql.createPool(url);
    } else {
      globalThis.__nexusMariaPool = mysql.createPool({
        host: process.env.MARIADB_HOST,
        port: Number(process.env.MARIADB_PORT || 3306),
        user: process.env.MARIADB_USER,
        password: process.env.MARIADB_PASSWORD ?? "",
        database: process.env.MARIADB_DATABASE,
        waitForConnections: true,
        connectionLimit: Number(process.env.MARIADB_POOL_SIZE || 10),
        enableKeepAlive: true,
      });
    }
  }

  return globalThis.__nexusMariaPool;
}

export type MariaPingResult =
  | { kind: "skipped" }
  | { kind: "ok"; latencyMs: number }
  | { kind: "error"; error: string };

export async function pingMariaDb(): Promise<MariaPingResult> {
  if (!isMariaDbConfigured()) {
    return { kind: "skipped" };
  }

  const pool = getMariaPool();
  if (!pool) {
    return { kind: "error", error: "pool_unavailable" };
  }

  const start = Date.now();
  try {
    const conn = await pool.getConnection();
    try {
      await conn.query("SELECT 1 AS ok");
    } finally {
      conn.release();
    }
    return { kind: "ok", latencyMs: Date.now() - start };
  } catch (e) {
    const msg =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "connection_failed";
    return { kind: "error", error: msg };
  }
}
