/**
 * ES: Lectura/borrado de auth_user (NextAuth) para panel admin.
 * EN: NextAuth auth_user read/delete for admin panel.
 */

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import {
  getMariaPool,
  isMariaDbConfigured,
  isMariaDbSchemaMissingError,
  logMariaSchemaMigrateHint,
} from "@/lib/db/mariadb";

export type AuthUserListRow = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: string | null;
  image: string | null;
  providers: string;
};

type UserRow = RowDataPacket & {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | string | null;
  image: string | null;
  providers: string | null;
};

export async function listAuthUsersForAdmin(
  limit: number,
  offset: number
): Promise<{ rows: AuthUserListRow[]; total: number }> {
  if (!isMariaDbConfigured()) {
    return { rows: [], total: 0 };
  }
  const pool = getMariaPool();
  if (!pool) return { rows: [], total: 0 };

  const lim = Math.min(Math.max(1, limit), 100);
  const off = Math.max(0, offset);

  try {
    const [countRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS c FROM auth_user"
    );
    const total = Number((countRows[0] as { c: number })?.c ?? 0);

    const [data] = await pool.query<UserRow[]>(
      `SELECT u.id, u.name, u.email, u.emailVerified, u.image,
        GROUP_CONCAT(DISTINCT a.provider ORDER BY a.provider SEPARATOR ', ') AS providers
       FROM auth_user u
       LEFT JOIN auth_account a ON a.userId = u.id
       GROUP BY u.id, u.name, u.email, u.emailVerified, u.image
       ORDER BY u.email ASC
       LIMIT ? OFFSET ?`,
      [lim, off]
    );

    const rows: AuthUserListRow[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      emailVerified:
        r.emailVerified instanceof Date
          ? r.emailVerified.toISOString()
          : r.emailVerified
            ? String(r.emailVerified)
            : null,
      image: r.image,
      providers: r.providers ?? "—",
    }));

    return { rows, total };
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("auth_user");
      return { rows: [], total: 0 };
    }
    throw e;
  }
}

export async function deleteAuthUserById(userId: string): Promise<boolean> {
  if (!isMariaDbConfigured()) return false;
  const pool = getMariaPool();
  if (!pool) return false;

  const id = userId.trim();
  if (!id || id.length > 36) return false;

  try {
    const [res] = await pool.execute<ResultSetHeader>(
      "DELETE FROM auth_user WHERE id = ? LIMIT 1",
      [id]
    );
    return res.affectedRows === 1;
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("auth_user");
      return false;
    }
    throw e;
  }
}
