/**
 * ES: Registro de acciones admin en admin_audit.
 * EN: Persist admin actions to admin_audit.
 */

import type { RowDataPacket } from "mysql2";
import {
  getMariaPool,
  isMariaDbConfigured,
  isMariaDbSchemaMissingError,
  logMariaSchemaMigrateHint,
} from "@/lib/db/mariadb";

export interface AdminAuditEntry {
  adminUsername: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: unknown;
  ip?: string | null;
}

export async function insertAdminAudit(entry: AdminAuditEntry): Promise<void> {
  if (!isMariaDbConfigured()) return;
  const pool = getMariaPool();
  if (!pool) return;

  const payloadJson =
    entry.payload === undefined ? null : JSON.stringify(entry.payload);

  try {
    await pool.query(
      `INSERT INTO admin_audit (admin_username, action, entity_type, entity_id, payload, ip)
     VALUES (?,?,?,?,?,?)`,
      [
        entry.adminUsername,
        entry.action,
        entry.entityType ?? null,
        entry.entityId ?? null,
        payloadJson,
        entry.ip ?? null,
      ]
    );
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("admin_audit");
      return;
    }
    throw e;
  }
}

export type AdminAuditListRow = {
  id: number;
  adminUsername: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: unknown;
  ip: string | null;
  createdAt: string;
};

type AuditRow = RowDataPacket & {
  id: number;
  admin_username: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: unknown;
  ip: string | null;
  created_at: Date | string;
};

/** ES: Historial admin_audit (más reciente primero). EN: admin_audit history (newest first). */
export async function listAdminAudit(
  limit: number,
  offset: number
): Promise<{ rows: AdminAuditListRow[]; total: number }> {
  if (!isMariaDbConfigured()) {
    return { rows: [], total: 0 };
  }
  const pool = getMariaPool();
  if (!pool) return { rows: [], total: 0 };

  const lim = Math.min(Math.max(1, limit), 100);
  const off = Math.max(0, offset);

  try {
    const [countRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM admin_audit"
    );
    const total = Number((countRows[0] as { c: number })?.c ?? 0);

    const [data] = await pool.query<AuditRow[]>(
      `SELECT id, admin_username, action, entity_type, entity_id, payload, ip, created_at
       FROM admin_audit
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [lim, off]
    );

    const rows: AdminAuditListRow[] = (data ?? []).map((r) => ({
      id: r.id,
      adminUsername: r.admin_username,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      payload:
        r.payload != null && typeof r.payload === "string"
          ? (() => {
              try {
                return JSON.parse(r.payload as string) as unknown;
              } catch {
                return r.payload;
              }
            })()
          : r.payload,
      ip: r.ip,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));

    return { rows, total };
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("admin_audit");
      return { rows: [], total: 0 };
    }
    throw e;
  }
}
