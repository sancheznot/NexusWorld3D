import { createHash } from "node:crypto";
import type Redis from "ioredis";
import type {
  PlayerStore,
  SessionStore,
  WorldStateStore,
} from "@nexusworld3d/engine-server";
import type { PlayerSnapshot, WorldPatch } from "@nexusworld3d/engine-server";

function sessionRedisKey(prefix: string, logicalKey: string): string {
  const h = createHash("sha256").update(logicalKey, "utf8").digest("hex");
  return `${prefix}:sess:${h}`;
}

export function createRedisPlayerStore(
  redis: Redis,
  prefix: string
): PlayerStore {
  const key = (id: string) => `${prefix}:player:${id}`;
  return {
    async loadSnapshot(playerKey: string) {
      const raw = await redis.get(key(playerKey));
      if (raw == null || raw === "") return null;
      try {
        return JSON.parse(raw) as PlayerSnapshot;
      } catch {
        return null;
      }
    },
    async saveSnapshot(playerKey: string, snapshot: PlayerSnapshot) {
      await redis.set(key(playerKey), JSON.stringify(snapshot));
    },
  };
}

export function createRedisSessionStore(
  redis: Redis,
  prefix: string
): SessionStore {
  return {
    async get(k: string) {
      const raw = await redis.get(sessionRedisKey(prefix, k));
      if (raw == null || raw === "") return null;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    },
    async set(k: string, value: unknown, ttlSeconds?: number) {
      const rk = sessionRedisKey(prefix, k);
      const payload = JSON.stringify(value);
      if (ttlSeconds != null && ttlSeconds > 0) {
        await redis.set(rk, payload, "EX", ttlSeconds);
      } else {
        await redis.set(rk, payload);
      }
    },
    async delete(k: string) {
      await redis.del(sessionRedisKey(prefix, k));
    },
  };
}

export function createRedisWorldStateStore(
  redis: Redis,
  prefix: string
): WorldStateStore {
  const key = (worldId: string) => `${prefix}:worldpatch:${worldId}`;
  return {
    async loadPatch(worldId: string) {
      const raw = await redis.get(key(worldId));
      if (raw == null || raw === "") return null;
      try {
        return JSON.parse(raw) as WorldPatch;
      } catch {
        return null;
      }
    },
    async savePatch(worldId: string, patch: WorldPatch) {
      await redis.set(key(worldId), JSON.stringify(patch));
    },
  };
}
