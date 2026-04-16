import type { Redis } from "@upstash/redis";

/**
 * ES: Misma superficie que MockGameRedis / IoRedisGameRedis — API REST Upstash.
 * EN: Same surface as mock/ioredis — Upstash REST (`UPSTASH_REDIS_REST_*`).
 */
export class UpstashRestGameRedis {
  constructor(
    private readonly redis: Redis,
    private readonly prefix: string
  ) {
    console.log(`✅ UpstashRestGameRedis (${this.prefix})`);
  }

  private pk(id: string) {
    return `${this.prefix}:player:${id}`;
  }

  private ik(u: string) {
    return `${this.prefix}:inv:user:${u.trim().toLowerCase()}`;
  }

  private legacyChat() {
    return `${this.prefix}:legacy:chat`;
  }

  private legacyWorld(wid: string) {
    return `${this.prefix}:legacy:world:${wid}`;
  }

  private legacyDecor(wid: string) {
    return `${this.prefix}:legacy:decor:${wid}`;
  }

  private legacyRoom(rid: string) {
    return `${this.prefix}:legacy:room:${rid}`;
  }

  private legacyRoomPlayers(rid: string) {
    return `${this.prefix}:legacy:roompl:${rid}`;
  }

  private legacyStats() {
    return `${this.prefix}:legacy:stats`;
  }

  async addPlayer(playerId: string, playerData: unknown) {
    await this.redis.set(this.pk(playerId), JSON.stringify(playerData));
  }

  async removePlayer(playerId: string) {
    await this.redis.del(this.pk(playerId));
  }

  async getPlayer(playerId: string) {
    const raw = await this.redis.get(this.pk(playerId));
    if (raw == null || raw === "") return null;
    try {
      return JSON.parse(raw as string) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async getAllPlayers() {
    const pat = `${this.prefix}:player:*`;
    const keys = await this.redis.keys(pat);
    const out: unknown[] = [];
    if (keys.length === 0) return out;
    const values = await this.redis.mget(...keys);
    for (let i = 0; i < keys.length; i++) {
      const raw = values[i];
      if (raw == null || raw === "") continue;
      try {
        const id = keys[i]!.slice(`${this.prefix}:player:`.length);
        out.push({ id, ...JSON.parse(raw as string) });
      } catch {
        /* skip */
      }
    }
    return out;
  }

  async addChatMessage(message: unknown) {
    const messageId = `msg:${Date.now()}:${Math.random()}`;
    const row = { id: messageId, ...(message as object) };
    const raw = await this.redis.get(this.legacyChat());
    let arr: unknown[] = [];
    if (raw) {
      try {
        arr = JSON.parse(raw as string) as unknown[];
      } catch {
        arr = [];
      }
    }
    arr.push(row);
    if (arr.length > 100) arr = arr.slice(-100);
    await this.redis.set(this.legacyChat(), JSON.stringify(arr));
    return messageId;
  }

  async getChatMessages(limit: number = 50) {
    const raw = await this.redis.get(this.legacyChat());
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw as string) as unknown[];
      return [...arr].reverse().slice(0, limit);
    } catch {
      return [];
    }
  }

  async saveWorldState(worldId: string, worldData: unknown) {
    await this.redis.set(
      this.legacyWorld(worldId),
      JSON.stringify({ ...(worldData as object), lastUpdate: Date.now() })
    );
  }

  async getWorldState(worldId: string) {
    const raw = await this.redis.get(this.legacyWorld(worldId));
    if (!raw) return null;
    try {
      return JSON.parse(raw as string);
    } catch {
      return null;
    }
  }

  async saveMapDecorations(worldId: string, decorations: unknown[]) {
    await this.redis.set(this.legacyDecor(worldId), JSON.stringify(decorations));
  }

  async getMapDecorations(worldId: string) {
    const raw = await this.redis.get(this.legacyDecor(worldId));
    if (!raw) return [];
    try {
      return JSON.parse(raw as string) as unknown[];
    } catch {
      return [];
    }
  }

  async updatePlayerPosition(playerId: string, position: unknown) {
    const cur = await this.getPlayer(playerId);
    if (!cur) return;
    await this.redis.set(
      this.pk(playerId),
      JSON.stringify({
        ...cur,
        position: JSON.stringify(position),
        lastUpdate: Date.now(),
      })
    );
  }

  async getPlayerPosition(playerId: string) {
    const p = await this.getPlayer(playerId);
    if (!p?.position) return null;
    const pos = p.position;
    if (typeof pos === "string") {
      try {
        return JSON.parse(pos);
      } catch {
        return null;
      }
    }
    return pos;
  }

  async createRoom(roomId: string, roomData: unknown) {
    await this.redis.set(
      this.legacyRoom(roomId),
      JSON.stringify({
        ...(roomData as object),
        createdAt: Date.now(),
        playerCount: 0,
      })
    );
    await this.redis.set(this.legacyRoomPlayers(roomId), JSON.stringify([]));
  }

  async joinRoom(roomId: string, playerId: string) {
    const raw = await this.redis.get(this.legacyRoomPlayers(roomId));
    let ids: string[] = [];
    if (raw) {
      try {
        ids = JSON.parse(raw as string) as string[];
      } catch {
        ids = [];
      }
    }
    if (!ids.includes(playerId)) ids.push(playerId);
    await this.redis.set(this.legacyRoomPlayers(roomId), JSON.stringify(ids));

    const rm = await this.redis.get(this.legacyRoom(roomId));
    if (rm) {
      try {
        const room = JSON.parse(rm as string) as { playerCount?: number };
        room.playerCount = (room.playerCount || 0) + 1;
        await this.redis.set(this.legacyRoom(roomId), JSON.stringify(room));
      } catch {
        /* ignore */
      }
    }
  }

  async leaveRoom(roomId: string, playerId: string) {
    const raw = await this.redis.get(this.legacyRoomPlayers(roomId));
    let ids: string[] = [];
    if (raw) {
      try {
        ids = JSON.parse(raw as string) as string[];
      } catch {
        ids = [];
      }
    }
    ids = ids.filter((x) => x !== playerId);
    await this.redis.set(this.legacyRoomPlayers(roomId), JSON.stringify(ids));

    const rm = await this.redis.get(this.legacyRoom(roomId));
    if (rm) {
      try {
        const room = JSON.parse(rm as string) as { playerCount?: number };
        room.playerCount = Math.max(0, (room.playerCount || 0) - 1);
        await this.redis.set(this.legacyRoom(roomId), JSON.stringify(room));
      } catch {
        /* ignore */
      }
    }
  }

  async getRoomPlayers(roomId: string) {
    const raw = await this.redis.get(this.legacyRoomPlayers(roomId));
    if (!raw) return [];
    try {
      return JSON.parse(raw as string) as string[];
    } catch {
      return [];
    }
  }

  async incrementServerStats(stat: string, value: number = 1) {
    await this.redis.incrby(`${this.prefix}:stat:${stat}`, value);
  }

  async getServerStats() {
    const pat = `${this.prefix}:stat:*`;
    const keys = await this.redis.keys(pat);
    const out: Record<string, number> = {};
    for (const k of keys) {
      const tail = k.slice(`${this.prefix}:stat:`.length);
      const n = await this.redis.get(k);
      if (n != null) out[tail] = Number(n) || 0;
    }
    const legacy = await this.redis.get(this.legacyStats());
    if (legacy) {
      try {
        Object.assign(out, JSON.parse(legacy as string) as Record<string, number>);
      } catch {
        /* ignore */
      }
    }
    return out;
  }

  async cleanupExpiredData() {
    /* optional TTLs later */
  }

  async savePlayerInventorySnapshot(
    normUsername: string,
    inventory: unknown
  ): Promise<void> {
    const key = normUsername.trim().toLowerCase();
    if (!key) return;
    try {
      await this.redis.set(this.ik(key), JSON.stringify(inventory));
    } catch (e) {
      console.warn("⚠️ Upstash savePlayerInventorySnapshot:", e);
    }
  }

  async getPlayerInventorySnapshot(
    normUsername: string
  ): Promise<unknown | null> {
    const key = normUsername.trim().toLowerCase();
    if (!key) return null;
    const raw = await this.redis.get(this.ik(key));
    if (raw == null || raw === "") return null;
    try {
      return JSON.parse(raw as string);
    } catch {
      return null;
    }
  }

  async cleanupAllData() {
    const pat = `${this.prefix}:*`;
    const keys = await this.redis.keys(pat);
    if (keys.length > 0) await this.redis.del(...keys);
    console.log(`🧹 Upstash cleared keys for prefix ${this.prefix}`);
  }
}
