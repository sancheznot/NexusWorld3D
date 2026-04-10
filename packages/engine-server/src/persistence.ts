/**
 * ES: Contratos de persistencia para que el juego privado enchufe MariaDB/Redis/etc.
 * EN: Persistence contracts — private game implements these against MariaDB/Redis/etc.
 *
 * El motor puede seguir usando implementaciones concretas hoy; estos tipos guían extracción futura.
 */

/** ES: Perfil o estado de jugador serializable (forma la define el juego). */
export type PlayerSnapshot = unknown;

/** ES: Fragmento de estado de mundo (replays, seeds, etc.). */
export type WorldPatch = unknown;

export interface PlayerStore {
  loadSnapshot(playerKey: string): Promise<PlayerSnapshot | null>;
  saveSnapshot(playerKey: string, snapshot: PlayerSnapshot): Promise<void>;
}

export interface SessionStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete?(key: string): Promise<void>;
}

export interface WorldStateStore {
  loadPatch(worldId: string): Promise<WorldPatch | null>;
  savePatch(worldId: string, patch: WorldPatch): Promise<void>;
}
