import type {
  PlayerSnapshot,
  PlayerStore,
  SessionStore,
  WorldPatch,
  WorldStateStore,
} from "./persistence";

type SessionEntry = { value: unknown; expiresAt?: number };

/**
 * ES: Implementación demo en RAM (Map). Sin TTL real en producción.
 * EN: Demo in-memory implementation — not for multi-process production.
 */
export function createInMemoryPlayerStore(): PlayerStore {
  const map = new Map<string, PlayerSnapshot>();
  return {
    async loadSnapshot(playerKey) {
      return map.get(playerKey) ?? null;
    },
    async saveSnapshot(playerKey, snapshot) {
      map.set(playerKey, snapshot);
    },
  };
}

/**
 * ES: KV en memoria; `ttlSeconds` expira en `get` (lazy).
 * EN: In-memory KV; optional TTL checked lazily on `get`.
 */
export function createInMemorySessionStore(): SessionStore {
  const map = new Map<string, SessionEntry>();
  return {
    async get(key) {
      const e = map.get(key);
      if (!e) return null;
      if (e.expiresAt != null && Date.now() > e.expiresAt) {
        map.delete(key);
        return null;
      }
      return e.value;
    },
    async set(key, value, ttlSeconds) {
      const expiresAt =
        ttlSeconds != null && ttlSeconds > 0
          ? Date.now() + ttlSeconds * 1000
          : undefined;
      map.set(key, { value, expiresAt });
    },
    async delete(key) {
      map.delete(key);
    },
  };
}

export function createInMemoryWorldStateStore(): WorldStateStore {
  const map = new Map<string, WorldPatch>();
  return {
    async loadPatch(worldId) {
      return map.get(worldId) ?? null;
    },
    async savePatch(worldId, patch) {
      map.set(worldId, patch);
    },
  };
}
