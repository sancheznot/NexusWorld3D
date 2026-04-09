import { Room, Client } from "colyseus";
import type { InventoryEvents } from "@resources/inventory/server/InventoryEvents";
import { InventoryItem, ItemRarity, ItemType } from "@/types/inventory.types";
import {
  CHOPPABLE_PROP_TREES,
  CITY_TREE_CHOP_PREFIX,
  CLIENT_POS_TRUST_RADIUS,
  getChoppableTreeDef,
  rollWoodLogsPerChopHit,
  TREE_CHOP_MAX_DISTANCE,
  TREE_RESPAWN_MS,
} from "@/constants/choppableTrees";
import { RPG_XP_CHOP_HIT } from "@/constants/rpgProgression";
import { ITEMS_CATALOG } from "@/constants/items";

type TreeRuntime = {
  hitsDone: number;
  stumpUntil: number;
};

export type TreeChopDeps = {
  getPlayerMapId: (clientId: string) => string | null;
  getPlayerPosition: (clientId: string) => { x: number; y: number; z: number } | null;
  inventory: InventoryEvents;
  awardExperience?: (playerId: string, amount: number) => void;
};

type ChopCfg = { maxHits: number };

export class TreeChopEvents {
  private room: Room;
  private deps: TreeChopDeps;
  private trees = new Map<string, TreeRuntime>();
  private lastSwing = new Map<string, number>();

  constructor(room: Room, deps: TreeChopDeps) {
    this.room = room;
    this.deps = deps;
    for (const t of CHOPPABLE_PROP_TREES) {
      this.trees.set(t.id, { hitsDone: 0, stumpUntil: 0 });
    }
    this.setupHandlers();
  }

  private ensureRuntime(treeId: string): TreeRuntime {
    let rt = this.trees.get(treeId);
    if (!rt) {
      rt = { hitsDone: 0, stumpUntil: 0 };
      this.trees.set(treeId, rt);
    }
    return rt;
  }

  private processHit(
    client: Client,
    pid: string,
    treeId: string,
    mapId: string,
    cfg: ChopCfg,
    rt: TreeRuntime,
    now: number
  ): void {
    if (rt.stumpUntil > now) {
      client.send("world:tree-chop-result", {
        ok: false,
        treeId,
        message: "Este árbol aún está derribado",
        felled: true,
        respawnAt: rt.stumpUntil,
      });
      return;
    }

    rt.hitsDone += 1;

    const toolItemId =
      this.deps.inventory.getChopToolCatalogId(pid) ?? "tool_axe";
    const logsThisHit = rollWoodLogsPerChopHit(toolItemId);

    let logsGranted = 0;
    if (logsThisHit > 0) {
      const cat = ITEMS_CATALOG.material_wood_log;
      const base: Omit<InventoryItem, "id" | "isEquipped" | "slot"> = {
        itemId: "material_wood_log",
        name: cat?.name ?? "Tronco",
        description: "Madera talada",
        type: (cat?.type ?? "misc") as ItemType,
        rarity: (cat?.rarity ?? "common") as ItemRarity,
        quantity: logsThisHit,
        maxStack: 999,
        level: 1,
        weight: cat?.weight ?? 1.2,
        icon: cat?.icon ?? "🪵",
      };
      logsGranted = this.deps.inventory.addItemFromWorld(pid, base);
      if (logsGranted <= 0) {
        rt.hitsDone -= 1;
        const pctAfterRevert = Math.max(
          0,
          Math.round(((cfg.maxHits - rt.hitsDone) / cfg.maxHits) * 100)
        );
        client.send("world:tree-chop-result", {
          ok: false,
          treeId,
          message:
            "No hay espacio de peso o ranuras para guardar la madera. El límite lo marca el servidor (RPG), no el botón de prueba +Nivel.",
          felled: false,
          logsThisHit,
          logsGranted: 0,
          toolItemId,
          hitsRemaining: cfg.maxHits - rt.hitsDone,
          treeHealthRemainingPct: pctAfterRevert,
          maxHits: cfg.maxHits,
        });
        return;
      }
    }

    const felled = rt.hitsDone >= cfg.maxHits;
    const treeHealthRemainingPct = felled
      ? 0
      : Math.max(
          0,
          Math.round(((cfg.maxHits - rt.hitsDone) / cfg.maxHits) * 100)
        );

    if (felled) {
      rt.hitsDone = 0;
      rt.stumpUntil = now + TREE_RESPAWN_MS;

      this.room.broadcast("world:tree-sync", {
        mapId,
        treeId,
        state: "stump",
        respawnAt: rt.stumpUntil,
      });

      client.send("world:tree-chop-result", {
        ok: true,
        treeId,
        felled: true,
        logQty: logsGranted,
        logsThisHit,
        logsGranted,
        toolItemId,
        hitsRemaining: 0,
        treeHealthRemainingPct,
        maxHits: cfg.maxHits,
      });

      setTimeout(() => {
        const r = this.trees.get(treeId);
        if (!r) return;
        r.stumpUntil = 0;
        r.hitsDone = 0;
        this.room.broadcast("world:tree-sync", {
          mapId,
          treeId,
          state: "active",
        });
      }, TREE_RESPAWN_MS);
    } else {
      client.send("world:tree-chop-result", {
        ok: true,
        treeId,
        felled: false,
        logQty: logsGranted,
        logsThisHit,
        logsGranted,
        toolItemId,
        hitsRemaining: cfg.maxHits - rt.hitsDone,
        treeHealthRemainingPct,
        maxHits: cfg.maxHits,
      });
    }

    this.deps.inventory.applyAxeSwingWear(pid);
    this.deps.awardExperience?.(pid, RPG_XP_CHOP_HIT);
  }

  private setupHandlers(): void {
    this.room.onMessage(
      "world:tree-chop",
      (
        client: Client,
        data: {
          treeId?: string;
          strike?: { x?: number; y?: number; z?: number };
          clientPlayerPos?: { x?: number; y?: number; z?: number };
        }
      ) => {
        const treeId = data?.treeId;
        if (!treeId || typeof treeId !== "string") {
          client.send("world:tree-chop-result", {
            ok: false,
            message: "treeId inválido",
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

        if (!this.deps.inventory.playerHasAnyChopAxe(pid)) {
          client.send("world:tree-chop-result", {
            ok: false,
            treeId,
            message: "Necesitas un hacha (equípala o ponla en la hotbar)",
          });
          return;
        }

        const pos = this.deps.getPlayerPosition(pid);
        if (!pos) {
          client.send("world:tree-chop-result", {
            ok: false,
            treeId,
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
          } else if (dSync > TREE_CHOP_MAX_DISTANCE * 3) {
            refX = cp.x;
            refZ = cp.z;
          }
        }

        const mapId = this.deps.getPlayerMapId(pid);
        if (!mapId) {
          client.send("world:tree-chop-result", {
            ok: false,
            treeId,
            message: "Mapa desconocido",
          });
          return;
        }

        if (treeId.startsWith(CITY_TREE_CHOP_PREFIX)) {
          client.send("world:tree-chop-result", {
            ok: false,
            treeId,
            message:
              "Los árboles incrustados en el mapa no se pueden talar. Usa árboles prop (marcados como talables).",
          });
          return;
        }

        const def = getChoppableTreeDef(treeId);
        if (!def) {
          client.send("world:tree-chop-result", {
            ok: false,
            treeId,
            message: "Árbol no existe",
          });
          return;
        }

        if (mapId !== def.mapId) {
          client.send("world:tree-chop-result", {
            ok: false,
            treeId,
            message: "No estás en el mapa de este árbol",
          });
          return;
        }

        const dx = refX - def.position.x;
        const dz = refZ - def.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > TREE_CHOP_MAX_DISTANCE) {
          client.send("world:tree-chop-result", {
            ok: false,
            treeId,
            message: "Demasiado lejos del árbol",
          });
          return;
        }

        const rt = this.ensureRuntime(treeId);
        this.processHit(
          client,
          pid,
          treeId,
          def.mapId,
          { maxHits: def.maxHits },
          rt,
          now
        );
      }
    );
  }
}
