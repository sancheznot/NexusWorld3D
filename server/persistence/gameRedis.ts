import {
  disableUpstashAfterNetworkFailure,
  getRedisIo,
  getRedisKeyPrefix,
  getUpstashRestRedis,
} from "./redisClient";
import { IoRedisGameRedis } from "./redisGameRedis";
import { MockGameRedis } from "./mockRedis";
import { UpstashRestGameRedis } from "./upstashGameRedis";

export type GameRedisInstance =
  | MockGameRedis
  | IoRedisGameRedis
  | UpstashRestGameRedis;

let gameRedisInstance: GameRedisInstance | null = null;

let loggedNetworkFallback = false;
let loggedPermissionFallback = false;

function isRedisUnreachableError(err: unknown): boolean {
  const codes = new Set(["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"]);
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur != null; i++) {
    if (typeof cur === "object" && cur !== null && "code" in cur) {
      const code = (cur as { code?: string }).code;
      if (code && codes.has(code)) return true;
    }
    if (typeof cur === "object" && cur !== null && "cause" in cur) {
      cur = (cur as Error).cause;
      continue;
    }
    break;
  }
  const s = String(err);
  return /fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN/i.test(s);
}

/** ES: Token read-only / ACL sin SET (NOPERM). EN: Read-only token or ACL blocking writes. */
function isUpstashWritePermissionError(err: unknown): boolean {
  const s = String(err);
  return /NOPERM|no permissions to run|READONLY|WRONGPASS|NOAUTH|command not allowed/i.test(
    s
  );
}

type UpstashFallbackReason = "network" | "permission" | "none";

function classifyUpstashFatalError(err: unknown): UpstashFallbackReason {
  if (isRedisUnreachableError(err)) return "network";
  if (isUpstashWritePermissionError(err)) return "permission";
  return "none";
}

/**
 * ES: Upstash inutilizable (red o NOPERM) → Mock en este proceso.
 * EN: Unusable Upstash (network or NOPERM) → in-memory mock for this process.
 */
export function reportRedisUnreachableAndFallback(err: unknown): void {
  const kind = classifyUpstashFatalError(err);
  if (kind === "none") return;
  disableUpstashAfterNetworkFailure();
  gameRedisInstance = null;
  if (kind === "network" && !loggedNetworkFallback) {
    loggedNetworkFallback = true;
    console.warn(
      "⚠️ Redis (Upstash) unreachable — using in-memory Mock Redis for this process. " +
        "Fix UPSTASH_REDIS_REST_URL / token, or remove UPSTASH_* from .env.local for local dev."
    );
  } else if (kind === "permission" && !loggedPermissionFallback) {
    loggedPermissionFallback = true;
    console.warn(
      "⚠️ Upstash REST token cannot write (NOPERM / read-only). Using Mock Redis for this process. " +
        "In https://console.upstash.com copy the **Read-Write** REST token (not read-only), or unset UPSTASH_* for local dev."
    );
  }
}

export function getGameRedis(): GameRedisInstance {
  if (!gameRedisInstance) {
    const prefix = getRedisKeyPrefix();
    const upstash = getUpstashRestRedis();
    if (upstash) {
      gameRedisInstance = new UpstashRestGameRedis(upstash, prefix);
    } else {
      const redis = getRedisIo();
      gameRedisInstance = redis
        ? new IoRedisGameRedis(redis, prefix)
        : new MockGameRedis();
    }
  }
  return gameRedisInstance;
}

/** ES: Proxy con la misma forma que antes (métodos async). EN: Same async shape as legacy export. */
export const gameRedis = {
  addPlayer: (id: string, data: unknown) => getGameRedis().addPlayer(id, data),
  removePlayer: (id: string) => getGameRedis().removePlayer(id),
  getPlayer: (id: string) => getGameRedis().getPlayer(id),
  getAllPlayers: () => getGameRedis().getAllPlayers(),
  addChatMessage: (message: unknown) => getGameRedis().addChatMessage(message),
  getChatMessages: (limit?: number) => getGameRedis().getChatMessages(limit),
  saveWorldState: (worldId: string, state: unknown) =>
    getGameRedis().saveWorldState(worldId, state),
  getWorldState: (worldId: string) => getGameRedis().getWorldState(worldId),
  saveMapDecorations: (worldId: string, decorations: unknown[]) =>
    getGameRedis().saveMapDecorations(worldId, decorations),
  getMapDecorations: (worldId: string) =>
    getGameRedis().getMapDecorations(worldId),
  updatePlayerPosition: (id: string, position: unknown) =>
    getGameRedis().updatePlayerPosition(id, position),
  getPlayerPosition: (id: string) => getGameRedis().getPlayerPosition(id),
  createRoom: (roomId: string, data: unknown) =>
    getGameRedis().createRoom(roomId, data),
  joinRoom: (roomId: string, playerId: string) =>
    getGameRedis().joinRoom(roomId, playerId),
  leaveRoom: (roomId: string, playerId: string) =>
    getGameRedis().leaveRoom(roomId, playerId),
  getRoomPlayers: (roomId: string) => getGameRedis().getRoomPlayers(roomId),
  incrementServerStats: (key: string, value: number) =>
    getGameRedis().incrementServerStats(key, value),
  getServerStats: () => getGameRedis().getServerStats(),
  cleanupExpiredData: () => getGameRedis().cleanupExpiredData(),
  cleanupAllData: () => getGameRedis().cleanupAllData(),
  savePlayerInventorySnapshot: (u: string, inv: unknown) =>
    getGameRedis().savePlayerInventorySnapshot(u, inv),
  getPlayerInventorySnapshot: (u: string) =>
    getGameRedis().getPlayerInventorySnapshot(u),
};
