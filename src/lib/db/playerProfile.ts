/**
 * ES: Lectura/escritura de player_profile (MariaDB) por username normalizado.
 * EN: player_profile read/write (MariaDB) by normalized username.
 */

import type { RowDataPacket } from "mysql2";
import {
  getMariaPool,
  isMariaDbConfigured,
  isMariaDbSchemaMissingError,
  logMariaSchemaMigrateHint,
} from "@/lib/db/mariadb";

export function normalizePlayerUsername(username: string): string {
  return username.trim().toLowerCase();
}

export interface PlayerProfileRow {
  username: string;
  username_norm: string;
  world_id: string;
  health: number;
  max_health: number;
  stamina: number;
  max_stamina: number;
  hunger: number;
  max_hunger: number;
  level: number;
  experience: number;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_x: number;
  rot_y: number;
  rot_z: number;
  map_id: string;
  role_id: string | null;
  stats_json: unknown;
  /** ES: Snapshot de inventario (JSON). EN: Inventory snapshot (tras migración 003). */
  inventory_json?: unknown | null;
  /** ES: Parcela + estructuras (JSON, migración 004). EN: Plot + structures JSON. */
  housing_json?: unknown | null;
}

export interface PlayerProfileUpsertInput {
  username: string;
  worldId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  mapId: string;
  roleId: string | null;
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  hunger: number;
  maxHunger: number;
  level: number;
  experience: number;
  statsJson?: unknown;
  /** ES: Inventario completo para persistencia. EN: Full inventory JSON. */
  inventoryJson?: unknown;
  /** ES: Vivienda / lote / construcciones. EN: Housing snapshot JSON. */
  housingJson?: unknown;
}

function rowToProfile(r: RowDataPacket): PlayerProfileRow {
  return {
    username: String(r.username),
    username_norm: String(r.username_norm),
    world_id: String(r.world_id),
    health: Number(r.health),
    max_health: Number(r.max_health),
    stamina: Number(r.stamina),
    max_stamina: Number(r.max_stamina),
    hunger: Number(r.hunger),
    max_hunger: Number(r.max_hunger),
    level: Number(r.level),
    experience: Number(r.experience),
    pos_x: Number(r.pos_x),
    pos_y: Number(r.pos_y),
    pos_z: Number(r.pos_z),
    rot_x: Number(r.rot_x),
    rot_y: Number(r.rot_y),
    rot_z: Number(r.rot_z),
    map_id: String(r.map_id),
    role_id: r.role_id == null || r.role_id === "" ? null : String(r.role_id),
    stats_json: r.stats_json,
    inventory_json: r.inventory_json ?? null,
    housing_json: r.housing_json ?? null,
  };
}

export async function fetchPlayerProfileByNorm(
  usernameNorm: string
): Promise<PlayerProfileRow | null> {
  if (!isMariaDbConfigured()) return null;
  const pool = getMariaPool();
  if (!pool) return null;

  let rows: RowDataPacket[];
  try {
    const result = await pool.query<RowDataPacket[]>(
      `SELECT username, username_norm, world_id, health, max_health, stamina, max_stamina,
            hunger, max_hunger, level, experience,
            pos_x, pos_y, pos_z, rot_x, rot_y, rot_z, map_id, role_id, stats_json, inventory_json, housing_json
     FROM player_profile WHERE username_norm = ? LIMIT 1`,
      [usernameNorm]
    );
    rows = result[0];
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("player_profile");
      return null;
    }
    throw e;
  }

  if (!rows?.length) return null;
  return rowToProfile(rows[0]);
}

export async function upsertPlayerProfile(
  input: PlayerProfileUpsertInput
): Promise<void> {
  if (!isMariaDbConfigured()) return;
  const pool = getMariaPool();
  if (!pool) return;

  const norm = normalizePlayerUsername(input.username);
  const statsJson =
    input.statsJson === undefined ? null : JSON.stringify(input.statsJson);
  const roleId = input.roleId ?? null;
  const inventoryJson =
    input.inventoryJson === undefined
      ? null
      : typeof input.inventoryJson === "string"
        ? input.inventoryJson
        : JSON.stringify(input.inventoryJson);
  const housingJson =
    input.housingJson === undefined
      ? null
      : typeof input.housingJson === "string"
        ? input.housingJson
        : JSON.stringify(input.housingJson);

  try {
    await pool.query(
      `INSERT INTO player_profile (
      username, username_norm, world_id, health, max_health, stamina, max_stamina,
      hunger, max_hunger, level, experience,
      pos_x, pos_y, pos_z, rot_x, rot_y, rot_z, map_id, role_id, stats_json, inventory_json, housing_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      username = VALUES(username),
      world_id = VALUES(world_id),
      health = VALUES(health),
      max_health = VALUES(max_health),
      stamina = VALUES(stamina),
      max_stamina = VALUES(max_stamina),
      hunger = VALUES(hunger),
      max_hunger = VALUES(max_hunger),
      level = VALUES(level),
      experience = VALUES(experience),
      pos_x = VALUES(pos_x),
      pos_y = VALUES(pos_y),
      pos_z = VALUES(pos_z),
      rot_x = VALUES(rot_x),
      rot_y = VALUES(rot_y),
      rot_z = VALUES(rot_z),
      map_id = VALUES(map_id),
      role_id = VALUES(role_id),
      stats_json = COALESCE(VALUES(stats_json), stats_json),
      inventory_json = COALESCE(VALUES(inventory_json), inventory_json),
      housing_json = COALESCE(VALUES(housing_json), housing_json)`,
    [
      input.username,
      norm,
      input.worldId,
      input.health,
      input.maxHealth,
      input.stamina,
      input.maxStamina,
      input.hunger,
      input.maxHunger,
      input.level,
      input.experience,
      input.position.x,
      input.position.y,
      input.position.z,
      input.rotation.x,
      input.rotation.y,
      input.rotation.z,
      input.mapId,
      roleId,
      statsJson,
      inventoryJson,
      housingJson,
    ]
    );
  } catch (e) {
    if (isMariaDbSchemaMissingError(e)) {
      logMariaSchemaMigrateHint("player_profile");
      return;
    }
    throw e;
  }
}
