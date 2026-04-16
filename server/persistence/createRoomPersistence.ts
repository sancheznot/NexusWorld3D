import {
  createInMemoryPlayerStore,
  createInMemorySessionStore,
  createInMemoryWorldStateStore,
  type PlayerStore,
  type SessionStore,
  type WorldStateStore,
} from "@nexusworld3d/engine-server";
import {
  getRedisIo,
  getRedisKeyPrefix,
  getUpstashRestRedis,
} from "./redisClient";
import {
  createRedisPlayerStore,
  createRedisSessionStore,
  createRedisWorldStateStore,
} from "./redisStores";
import {
  createUpstashPlayerStore,
  createUpstashSessionStore,
  createUpstashWorldStateStore,
} from "./upstashStores";

/**
 * ES: Memoria si no hay credenciales; orden: Upstash REST → ioredis (REDIS_URL).
 * EN: In-memory if unset; order: Upstash REST → ioredis (REDIS_URL).
 */
export function createRoomPersistenceStores(): {
  playerStore: PlayerStore;
  sessionStore: SessionStore;
  worldStateStore: WorldStateStore;
} {
  const prefix = getRedisKeyPrefix();
  const upstash = getUpstashRestRedis();
  if (upstash) {
    return {
      playerStore: createUpstashPlayerStore(upstash, prefix),
      sessionStore: createUpstashSessionStore(upstash, prefix),
      worldStateStore: createUpstashWorldStateStore(upstash, prefix),
    };
  }
  const redis = getRedisIo();
  if (redis) {
    return {
      playerStore: createRedisPlayerStore(redis, prefix),
      sessionStore: createRedisSessionStore(redis, prefix),
      worldStateStore: createRedisWorldStateStore(redis, prefix),
    };
  }
  return {
    playerStore: createInMemoryPlayerStore(),
    sessionStore: createInMemorySessionStore(),
    worldStateStore: createInMemoryWorldStateStore(),
  };
}
