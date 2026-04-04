/**
 * ES: Adaptador Auth.js ↔ MariaDB (mysql2) para usuarios, cuentas y tokens email.
 * EN: Auth.js adapter for MariaDB — users, accounts, email verification tokens.
 */

import type {
  Adapter,
  AdapterAccount,
  AdapterUser,
  VerificationToken,
} from "@auth/core/adapters";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { getMariaPool } from "@/lib/db/mariadb";

type UserRow = RowDataPacket & {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | string | null;
  image: string | null;
};

function toUser(r: UserRow): AdapterUser {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    emailVerified: r.emailVerified
      ? r.emailVerified instanceof Date
        ? r.emailVerified
        : new Date(r.emailVerified)
      : null,
    image: r.image,
  };
}

export function mariaAuthAdapter(): Adapter {
  const pool = getMariaPool();
  if (!pool) {
    throw new Error("mariaAuthAdapter: MariaDB pool not available");
  }

  return {
    async createUser(user) {
      const id = user.id ?? crypto.randomUUID();
      await pool.execute<ResultSetHeader>(
        `INSERT INTO auth_user (id, name, email, emailVerified, image)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          user.name ?? null,
          user.email,
          user.emailVerified ? new Date(user.emailVerified) : null,
          user.image ?? null,
        ]
      );
      return toUser({
        id,
        name: user.name ?? null,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
      } as UserRow);
    },

    async getUser(id) {
      const [rows] = await pool.query<UserRow[]>(
        `SELECT id, name, email, emailVerified, image FROM auth_user WHERE id = ? LIMIT 1`,
        [id]
      );
      const r = rows[0];
      return r ? toUser(r) : null;
    },

    async getUserByEmail(email) {
      const [rows] = await pool.query<UserRow[]>(
        `SELECT id, name, email, emailVerified, image FROM auth_user WHERE email = ? LIMIT 1`,
        [email]
      );
      const r = rows[0];
      return r ? toUser(r) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const [rows] = await pool.query<UserRow[]>(
        `SELECT u.id, u.name, u.email, u.emailVerified, u.image
         FROM auth_user u
         INNER JOIN auth_account a ON a.userId = u.id
         WHERE a.provider = ? AND a.providerAccountId = ? LIMIT 1`,
        [provider, providerAccountId]
      );
      const r = rows[0];
      return r ? toUser(r) : null;
    },

    async updateUser(user) {
      const fields: string[] = [];
      const vals: unknown[] = [];
      if (user.name !== undefined) {
        fields.push("name = ?");
        vals.push(user.name);
      }
      if (user.email !== undefined) {
        fields.push("email = ?");
        vals.push(user.email);
      }
      if (user.emailVerified !== undefined) {
        fields.push("emailVerified = ?");
        vals.push(
          user.emailVerified ? new Date(user.emailVerified) : null
        );
      }
      if (user.image !== undefined) {
        fields.push("image = ?");
        vals.push(user.image);
      }
      if (fields.length === 0) {
        const [keep] = await pool.query<UserRow[]>(
          `SELECT id, name, email, emailVerified, image FROM auth_user WHERE id = ? LIMIT 1`,
          [user.id]
        );
        if (!keep[0]) throw new Error("updateUser: user not found");
        return toUser(keep[0]);
      }
      vals.push(user.id);
      await pool.query(
        `UPDATE auth_user SET ${fields.join(", ")} WHERE id = ?`,
        vals as (string | number | Date | null)[]
      );
      const [after] = await pool.query<UserRow[]>(
        `SELECT id, name, email, emailVerified, image FROM auth_user WHERE id = ? LIMIT 1`,
        [user.id]
      );
      if (!after[0]) throw new Error("updateUser: user missing after update");
      return toUser(after[0]);
    },

    async linkAccount(account: AdapterAccount) {
      const id = crypto.randomUUID();
      const params: (string | number | null)[] = [
        id,
        account.userId,
        String(account.type),
        account.provider,
        account.providerAccountId,
        account.refresh_token != null ? String(account.refresh_token) : null,
        account.access_token != null ? String(account.access_token) : null,
        account.expires_at ?? null,
        account.token_type != null ? String(account.token_type) : null,
        account.scope != null ? String(account.scope) : null,
        account.id_token != null ? String(account.id_token) : null,
        account.session_state != null ? String(account.session_state) : null,
      ];
      await pool.execute(
        `INSERT INTO auth_account (
          id, userId, type, provider, providerAccountId,
          refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params
      );
      return { ...account, id };
    },

    async createVerificationToken({ identifier, expires, token }) {
      await pool.execute(
        `INSERT INTO auth_verification_token (identifier, token, expires) VALUES (?, ?, ?)`,
        [identifier, token, expires]
      );
      return { identifier, token, expires };
    },

    async useVerificationToken({ identifier, token }) {
      const [rows] = await pool.query<
        (RowDataPacket & {
          identifier: string;
          token: string;
          expires: Date | string;
        })[]
      >(
        `SELECT identifier, token, expires FROM auth_verification_token
         WHERE identifier = ? AND token = ? LIMIT 1`,
        [identifier, token]
      );
      const row = rows[0];
      if (!row) return null;
      await pool.execute(
        `DELETE FROM auth_verification_token WHERE identifier = ? AND token = ?`,
        [identifier, token]
      );
      return {
        identifier: row.identifier,
        token: row.token,
        expires:
          row.expires instanceof Date
            ? row.expires
            : new Date(row.expires),
      } satisfies VerificationToken;
    },
  };
}
