import { Redis as UpstashRedis } from "@upstash/redis";
import IORedis from "ioredis";

let upstashClient: UpstashRedis | undefined;
let ioClient: IORedis | undefined;

/** ES: Tras fallo irrecuperable de Upstash (red, NOPERM, etc.), no volver a usar REST en este proceso. EN: After fatal Upstash failure, skip REST for this process. */
let upstashDisabledAfterUnreachable = false;

/** ES: Desactiva cliente Upstash y fuerza Mock en el siguiente getGameRedis(). EN: Disables Upstash client; next getGameRedis() uses mock. */
export function disableUpstashAfterNetworkFailure(): void {
  upstashDisabledAfterUnreachable = true;
  upstashClient = undefined;
}

/** ES: URL + token REST de Upstash (o KV_* de Vercel vía fromEnv). EN: Upstash REST credentials. */
export function hasUpstashRestEnv(): boolean {
  if (upstashDisabledAfterUnreachable) return false;
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  return Boolean(url && token);
}

/**
 * ES: Prioridad 1 — HTTP REST (serverless / Railway / sin TCP).
 * EN: Priority 1 — REST (no TCP connection pool required).
 */
export function getUpstashRestRedis(): UpstashRedis | undefined {
  if (!hasUpstashRestEnv()) return undefined;
  if (!upstashClient) {
    upstashClient = UpstashRedis.fromEnv();
    console.log("✅ Redis: Upstash REST (UPSTASH_REDIS_REST_* / @upstash/redis)");
  }
  return upstashClient;
}

/**
 * ES: Prioridad 2 — ioredis si hay REDIS_URL y **no** hay Upstash REST (evita dos backends).
 * EN: Priority 2 — ioredis when REDIS_URL is set and Upstash REST is not configured.
 */
export function getRedisIo(): IORedis | undefined {
  if (hasUpstashRestEnv()) return undefined;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return undefined;
  if (!ioClient) {
    ioClient = new IORedis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    ioClient.on("error", (err: Error) => {
      console.error("❌ Redis (ioredis):", err.message);
    });
    console.log("✅ Redis: REDIS_URL (ioredis)");
  }
  return ioClient;
}

export function getRedisKeyPrefix(): string {
  return process.env.REDIS_KEY_PREFIX?.trim() || "nw3d";
}

export function describeRedisBackend(): string {
  const prefix = getRedisKeyPrefix();
  if (upstashDisabledAfterUnreachable) {
    return `Mock Redis (in-memory) — Upstash was unreachable; fix or unset UPSTASH_REDIS_REST_* and restart`;
  }
  if (hasUpstashRestEnv()) {
    return `Upstash Redis REST (${prefix}) — UPSTASH_REDIS_REST_URL + TOKEN`;
  }
  if (process.env.REDIS_URL?.trim()) {
    return `Redis TCP (${prefix}) — REDIS_URL / ioredis`;
  }
  return "Mock Redis (in-memory — set UPSTASH_REDIS_REST_* or REDIS_URL)";
}

export async function disconnectRedisIo(): Promise<void> {
  if (ioClient) {
    try {
      await ioClient.quit();
    } catch {
      /* ignore */
    }
    ioClient = undefined;
  }
  upstashClient = undefined;
}
