/**
 * ES: Perfil de cuenta (lobby / futura tienda) por usuario Auth.
 * EN: Account profile (lobby / future shop) per Auth user.
 */

import type { RowDataPacket } from "mysql2";
import {
  getMariaPool,
  isMariaDbConfigured,
  isMariaDbSchemaMissingError,
  logMariaSchemaMigrateHint,
} from "@/lib/db/mariadb";

export interface GameAccountProfileRow {
  user_id: string;
  display_name: string;
  bio: string | null;
  prefs_json: unknown;
}

export interface GameAccountProfilePatch {
  displayName: string;
  bio: string | null;
  prefs?: unknown | null;
}

function rowToProfile(r: RowDataPacket): GameAccountProfileRow {
  return {
    user_id: String(r.user_id),
    display_name: String(r.display_name),
    bio: r.bio == null ? null : String(r.bio),
    prefs_json: r.prefs_json,
  };
}

export async function getGameAccountProfileByUserId(
  userId: string
): Promise<GameAccountProfileRow | null> {
  if (!isMariaDbConfigured()) return null;
  const pool = getMariaPool();
  if (!pool) return null;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT user_id, display_name, bio, prefs_json FROM game_account_profile WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (!rows?.length) return null;
    return rowToProfile(rows[0]);
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("game_account_profile");
      return null;
    }
    throw e;
  }
}

export async function upsertGameAccountProfile(
  userId: string,
  patch: GameAccountProfilePatch
): Promise<void> {
  if (!isMariaDbConfigured()) return;
  const pool = getMariaPool();
  if (!pool) return;

  const bio = patch.bio;
  const prefsJson =
    patch.prefs === undefined || patch.prefs === null
      ? null
      : JSON.stringify(patch.prefs);

  try {
    await pool.query(
      `INSERT INTO game_account_profile (user_id, display_name, bio, prefs_json)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = VALUES(display_name),
         bio = VALUES(bio),
         prefs_json = VALUES(prefs_json)`,
      [userId, patch.displayName, bio, prefsJson]
    );
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("game_account_profile");
      return;
    }
    throw e;
  }
}
