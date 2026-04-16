import { Room, Client } from "colyseus";
import { RpgMessages } from "@nexusworld3d/protocol";
import type { InventoryEvents } from "@resources/inventory/server/InventoryEvents";
import {
  clampAlloc,
  RPG_INITIAL_UNSPENT_POINTS,
  RPG_MAX_POINTS_PER_STAT,
  RPG_STAT_POINTS_PER_LEVEL,
  RPG_STAT_IDS,
  xpRequiredForLevel,
  buildRpgSyncPayload,
  xpGainMultiplierFromLuck,
  type RpgAlloc,
  type RpgStatId,
  type RpgSyncPayload,
} from "@/constants/rpgProgression";

const BASE_MAX_HEALTH = 100;

export type RpgProgressionPlayer = {
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
};

type RpgSessionState = {
  alloc: RpgAlloc;
  unspent: number;
};

export type RpgProgressionDeps = {
  room: Room;
  getPlayer: (sessionId: string) => RpgProgressionPlayer | undefined;
  getClient: (sessionId: string) => Client | undefined;
  inventory: InventoryEvents;
  requestPersist: (sessionId: string) => void;
  syncStatePlayer: (
    sessionId: string,
    patch: Partial<{ level: number; experience: number; maxHealth: number; health: number }>
  ) => void;
};

export class RpgProgression {
  private room: Room;
  private getPlayer: RpgProgressionDeps["getPlayer"];
  private getClient: RpgProgressionDeps["getClient"];
  private inventory: InventoryEvents;
  private requestPersist: RpgProgressionDeps["requestPersist"];
  private syncStatePlayer: RpgProgressionDeps["syncStatePlayer"];

  private sessionRpg = new Map<string, RpgSessionState>();
  private statsJsonBase = new Map<string, Record<string, unknown>>();

  constructor(deps: RpgProgressionDeps) {
    this.room = deps.room;
    this.getPlayer = deps.getPlayer;
    this.getClient = deps.getClient;
    this.inventory = deps.inventory;
    this.requestPersist = deps.requestPersist;
    this.syncStatePlayer = deps.syncStatePlayer;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.room.onMessage(
      RpgMessages.AllocateStat,
      (client: Client, data: { stat?: string }) => {
        const stat = data?.stat as RpgStatId | undefined;
        if (!stat || !RPG_STAT_IDS.includes(stat)) {
          client.send(RpgMessages.Error, { message: "Stat inválido" });
          return;
        }
        const pid = client.sessionId;
        const st = this.sessionRpg.get(pid);
        const p = this.getPlayer(pid);
        if (!st || !p) {
          client.send(RpgMessages.Error, { message: "Sin estado RPG" });
          return;
        }
        if (st.unspent < 1) {
          client.send(RpgMessages.Error, { message: "Sin puntos libres" });
          return;
        }
        if (st.alloc[stat] >= RPG_MAX_POINTS_PER_STAT) {
          client.send(RpgMessages.Error, { message: "Stat al máximo" });
          return;
        }
        st.unspent -= 1;
        st.alloc[stat] += 1;
        this.applyDerivedStats(pid);
        this.pushSync(pid);
        this.requestPersist(pid);
      }
    );

    this.room.onMessage(RpgMessages.RequestSync, (client: Client) => {
      this.pushSync(client.sessionId);
    });
  }

  /** ES: ¿Perfil sin bloque `rpg` guardado? (PJ nuevo o migración). EN: No saved `rpg` block yet. */
  private isNewRpgProfile(raw: unknown): boolean {
    if (raw == null) return true;
    if (typeof raw === "string") {
      const t = raw.trim();
      if (!t || t === "{}") return true;
      try {
        const o = JSON.parse(t) as Record<string, unknown>;
        return !o || typeof o !== "object" || o.rpg == null;
      } catch {
        return true;
      }
    }
    if (typeof raw === "object" && raw !== null) {
      return (raw as Record<string, unknown>).rpg == null;
    }
    return true;
  }

  /** ES: Cargar desde stats_json de MariaDB + nivel/exp del jugador. EN: Hydrate from DB. */
  hydrate(sessionId: string, statsJson: unknown): void {
    const { base, alloc, unspent: parsedUnspent } = this.parseStatsJson(statsJson);
    let unspent = Math.max(0, Math.floor(parsedUnspent));
    if (this.isNewRpgProfile(statsJson)) {
      unspent = Math.max(unspent, RPG_INITIAL_UNSPENT_POINTS);
    }
    this.statsJsonBase.set(sessionId, base);
    this.sessionRpg.set(sessionId, {
      alloc: clampAlloc(alloc),
      unspent,
    });
    this.applyDerivedStats(sessionId);
    this.pushSync(sessionId);
    setTimeout(() => this.pushSync(sessionId), 75);
  }

  clearSession(sessionId: string): void {
    this.sessionRpg.delete(sessionId);
    this.statsJsonBase.delete(sessionId);
  }

  private parseStatsJson(raw: unknown): {
    base: Record<string, unknown>;
    alloc: RpgAlloc;
    unspent: number;
  } {
    let obj: Record<string, unknown> = {};
    if (raw == null) {
      /* empty */
    } else if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw) as unknown;
        if (p && typeof p === "object") obj = { ...(p as object) } as Record<string, unknown>;
      } catch {
        obj = {};
      }
    } else if (typeof raw === "object") {
      obj = { ...(raw as object) } as Record<string, unknown>;
    }
    const rpgRaw = obj.rpg as { alloc?: Partial<RpgAlloc>; unspent?: number } | undefined;
    const base: Record<string, unknown> = { ...obj };
    delete base.rpg;
    return {
      base,
      alloc: clampAlloc(rpgRaw?.alloc),
      unspent:
        typeof rpgRaw?.unspent === "number" && Number.isFinite(rpgRaw.unspent)
          ? Math.max(0, Math.floor(rpgRaw.unspent))
          : 0,
    };
  }

  buildStatsJsonForSave(sessionId: string): Record<string, unknown> | null {
    const st = this.sessionRpg.get(sessionId);
    const base = this.statsJsonBase.get(sessionId) ?? {};
    if (!st) return Object.keys(base).length ? { ...base } : null;
    return {
      ...base,
      rpg: {
        v: 1,
        alloc: st.alloc,
        unspent: st.unspent,
      },
    };
  }

  addXp(sessionId: string, baseXp: number): void {
    const p = this.getPlayer(sessionId);
    const st = this.sessionRpg.get(sessionId);
    if (!p || !st || baseXp <= 0) return;

    const mul = xpGainMultiplierFromLuck(st.alloc.luck);
    const gain = Math.max(1, Math.round(baseXp * mul));
    p.experience += gain;

    let leveled = false;
    while (p.experience >= xpRequiredForLevel(p.level)) {
      p.experience -= xpRequiredForLevel(p.level);
      p.level += 1;
      st.unspent += RPG_STAT_POINTS_PER_LEVEL;
      leveled = true;
    }

    this.syncStatePlayer(sessionId, {
      level: p.level,
      experience: p.experience,
    });

    this.applyDerivedStats(sessionId);
    this.pushSync(sessionId);

    const client = this.getClient(sessionId);
    if (client) {
      if (leveled) {
        client.send("player:levelup", {
          playerId: sessionId,
          newLevel: p.level,
          stats: {},
        });
      }
    }

    this.requestPersist(sessionId);
  }

  /** ES: Inventario + vida máx. según nivel y stats. EN: Apply caps and max HP. */
  applyDerivedStats(sessionId: string): void {
    const p = this.getPlayer(sessionId);
    const st = this.sessionRpg.get(sessionId);
    if (!p || !st) return;

    const payload = buildRpgSyncPayload(
      p.level,
      p.experience,
      st.unspent,
      st.alloc
    );

    this.inventory.applyCarryingCaps(
      sessionId,
      payload.maxWeight,
      payload.maxSlots
    );

    const newMax = BASE_MAX_HEALTH + payload.maxHealthBonus;
    if (p.maxHealth !== newMax) {
      p.maxHealth = newMax;
      p.health = Math.min(p.health, p.maxHealth);
      this.syncStatePlayer(sessionId, {
        maxHealth: p.maxHealth,
        health: p.health,
      });
    }
  }

  private pushSync(sessionId: string): void {
    const p = this.getPlayer(sessionId);
    const st = this.sessionRpg.get(sessionId);
    const client = this.getClient(sessionId);
    if (!p || !st || !client) return;
    const payload: RpgSyncPayload = buildRpgSyncPayload(
      p.level,
      p.experience,
      st.unspent,
      st.alloc
    );
    client.send(RpgMessages.Sync, payload);
  }

}
