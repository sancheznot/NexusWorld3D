import { Room, Client } from "colyseus";
import type { InventoryEvents } from "@resources/inventory/server/InventoryEvents";
import { InventoryItem, ItemRarity, ItemType } from "@/types/inventory.types";
import { CLIENT_POS_TRUST_RADIUS } from "@/constants/choppableTrees";
import {
  MINEABLE_PROP_ROCKS,
  getMineableRockDef,
  rollStonePerMineHit,
  ROCK_MINE_MAX_DISTANCE,
  ROCK_RESPAWN_MS,
} from "@/constants/mineableRocks";
import { RPG_XP_MINE_HIT } from "@/constants/rpgProgression";
import { ITEMS_CATALOG } from "@/constants/items";

type RockRuntime = {
  hitsDone: number;
  rubbleUntil: number;
};

export type RockMineDeps = {
  getPlayerMapId: (clientId: string) => string | null;
  getPlayerPosition: (clientId: string) => { x: number; y: number; z: number } | null;
  inventory: InventoryEvents;
  awardExperience?: (playerId: string, amount: number) => void;
};

type MineCfg = { maxHits: number };

export class RockMineEvents {
  private room: Room;
  private deps: RockMineDeps;
  private rocks = new Map<string, RockRuntime>();
  private lastSwing = new Map<string, number>();

  constructor(room: Room, deps: RockMineDeps) {
    this.room = room;
    this.deps = deps;
    for (const r of MINEABLE_PROP_ROCKS) {
      this.rocks.set(r.id, { hitsDone: 0, rubbleUntil: 0 });
    }
    this.setupHandlers();
  }

  private ensureRuntime(rockId: string): RockRuntime {
    let rt = this.rocks.get(rockId);
    if (!rt) {
      rt = { hitsDone: 0, rubbleUntil: 0 };
      this.rocks.set(rockId, rt);
    }
    return rt;
  }

  private processHit(
    client: Client,
    pid: string,
    rockId: string,
    mapId: string,
    cfg: MineCfg,
    rt: RockRuntime,
    now: number
  ): void {
    if (rt.rubbleUntil > now) {
      client.send("world:rock-mine-result", {
        ok: false,
        rockId,
        message: "Este yacimiento aún está agotado",
        depleted: true,
        respawnAt: rt.rubbleUntil,
      });
      return;
    }

    rt.hitsDone += 1;

    const toolItemId =
      this.deps.inventory.getMineToolCatalogId(pid) ?? "tool_pickaxe";
    const stoneThisHit = rollStonePerMineHit(toolItemId);

    let stoneGranted = 0;
    if (stoneThisHit > 0) {
      const cat = ITEMS_CATALOG.material_stone_raw;
      const base: Omit<InventoryItem, "id" | "isEquipped" | "slot"> = {
        itemId: "material_stone_raw",
        name: cat?.name ?? "Piedra bruta",
        description: "Piedra extraída",
        type: (cat?.type ?? "misc") as ItemType,
        rarity: (cat?.rarity ?? "common") as ItemRarity,
        quantity: stoneThisHit,
        maxStack: 999,
        level: 1,
        weight: cat?.weight ?? 1.5,
        icon: cat?.icon ?? "🪨",
      };
      stoneGranted = this.deps.inventory.addItemFromWorld(pid, base);
      if (stoneGranted <= 0) {
        rt.hitsDone -= 1;
        const pctAfterRevert = Math.max(
          0,
          Math.round(((cfg.maxHits - rt.hitsDone) / cfg.maxHits) * 100)
        );
        client.send("world:rock-mine-result", {
          ok: false,
          rockId,
          message:
            "No hay espacio de peso o ranuras para guardar la piedra. Libera inventario e inténtalo de nuevo.",
          depleted: false,
          stoneThisHit,
          stoneGranted: 0,
          toolItemId,
          hitsRemaining: cfg.maxHits - rt.hitsDone,
          rockHealthRemainingPct: pctAfterRevert,
          maxHits: cfg.maxHits,
        });
        return;
      }
    }

    const depleted = rt.hitsDone >= cfg.maxHits;
    const rockHealthRemainingPct = depleted
      ? 0
      : Math.max(
          0,
          Math.round(((cfg.maxHits - rt.hitsDone) / cfg.maxHits) * 100)
        );

    if (depleted) {
      rt.hitsDone = 0;
      rt.rubbleUntil = now + ROCK_RESPAWN_MS;

      this.room.broadcast("world:rock-sync", {
        mapId,
        rockId,
        state: "rubble",
        respawnAt: rt.rubbleUntil,
      });

      client.send("world:rock-mine-result", {
        ok: true,
        rockId,
        depleted: true,
        stoneQty: stoneGranted,
        stoneThisHit,
        stoneGranted,
        toolItemId,
        hitsRemaining: 0,
        rockHealthRemainingPct,
        maxHits: cfg.maxHits,
      });

      setTimeout(() => {
        const r = this.rocks.get(rockId);
        if (!r) return;
        r.rubbleUntil = 0;
        r.hitsDone = 0;
        this.room.broadcast("world:rock-sync", {
          mapId,
          rockId,
          state: "active",
        });
      }, ROCK_RESPAWN_MS);
    } else {
      client.send("world:rock-mine-result", {
        ok: true,
        rockId,
        depleted: false,
        stoneQty: stoneGranted,
        stoneThisHit,
        stoneGranted,
        toolItemId,
        hitsRemaining: cfg.maxHits - rt.hitsDone,
        rockHealthRemainingPct,
        maxHits: cfg.maxHits,
      });
    }

    this.deps.inventory.applyPickaxeSwingWear(pid);
    this.deps.awardExperience?.(pid, RPG_XP_MINE_HIT);
  }

  private setupHandlers(): void {
    this.room.onMessage(
      "world:rock-mine",
      (
        client: Client,
        data: {
          rockId?: string;
          clientPlayerPos?: { x?: number; y?: number; z?: number };
        }
      ) => {
        const rockId = data?.rockId;
        if (!rockId || typeof rockId !== "string") {
          client.send("world:rock-mine-result", {
            ok: false,
            message: "rockId inválido",
          });
          return;
        }

        const now = Date.now();
        const pid = client.sessionId;
        const last = this.lastSwing.get(pid) ?? 0;
        if (now - last < 550) {
          return;
        }
        this.lastSwing.set(pid, now);

        if (!this.deps.inventory.playerHasAnyMinePickaxe(pid)) {
          client.send("world:rock-mine-result", {
            ok: false,
            rockId,
            message: "Necesitas un pico (equípalo o ponlo en la hotbar)",
          });
          return;
        }

        const pos = this.deps.getPlayerPosition(pid);
        if (!pos) {
          client.send("world:rock-mine-result", {
            ok: false,
            rockId,
            message: "Posición desconocida",
          });
          return;
        }

        const cp = data.clientPlayerPos;
        let refX = pos.x;
        let refZ = pos.z;
        if (
          cp &&
          typeof cp.x === "number" &&
          typeof cp.z === "number" &&
          Number.isFinite(cp.x) &&
          Number.isFinite(cp.z)
        ) {
          const dSync = Math.hypot(cp.x - pos.x, cp.z - pos.z);
          if (dSync < CLIENT_POS_TRUST_RADIUS) {
            refX = cp.x;
            refZ = cp.z;
          } else if (dSync > ROCK_MINE_MAX_DISTANCE * 3) {
            refX = cp.x;
            refZ = cp.z;
          }
        }

        const mapId = this.deps.getPlayerMapId(pid);
        if (!mapId) {
          client.send("world:rock-mine-result", {
            ok: false,
            rockId,
            message: "Mapa desconocido",
          });
          return;
        }

        const def = getMineableRockDef(rockId);
        if (!def) {
          client.send("world:rock-mine-result", {
            ok: false,
            rockId,
            message: "Roca no existe",
          });
          return;
        }

        if (mapId !== def.mapId) {
          client.send("world:rock-mine-result", {
            ok: false,
            rockId,
            message: "No estás en el mapa de esta roca",
          });
          return;
        }

        const dx = refX - def.position.x;
        const dz = refZ - def.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > ROCK_MINE_MAX_DISTANCE) {
          client.send("world:rock-mine-result", {
            ok: false,
            rockId,
            message: "Demasiado lejos de la roca",
          });
          return;
        }

        const rt = this.ensureRuntime(rockId);
        this.processHit(
          client,
          pid,
          rockId,
          def.mapId,
          { maxHits: def.maxHits },
          rt,
          now
        );
      }
    );
  }
}
