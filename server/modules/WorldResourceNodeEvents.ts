import { Room, Client } from "colyseus";
import { findResourceNodeOverrideInDocument } from "@nexusworld3d/content-schema";
import { WorldMessages } from "@nexusworld3d/protocol";
import type { InventoryEvents } from "@resources/inventory/server/InventoryEvents";
import { ITEMS_CATALOG } from "@/constants/items";
import { RPG_XP_RESOURCE_NODE_HARVEST } from "@/constants/rpgProgression";
import {
  getWorldResourceNodeById,
  type WorldResourceNodeDef,
} from "@/constants/worldResourceNodes";
import type {
  InventoryItem,
  ItemRarity,
  ItemType,
} from "@/types/inventory.types";

const HARVEST_COOLDOWN_MS = 3500;
/** ES: Tolerancia XZ respecto al radio del nodo. EN: XZ slack beyond node radius. */
const DIST_SLACK = 0.75;

function baseItemFromCatalog(
  itemId: string,
  quantity: number
): Omit<InventoryItem, "id" | "isEquipped" | "slot"> {
  const cat =
    ITEMS_CATALOG[itemId as keyof typeof ITEMS_CATALOG] ?? undefined;
  return {
    itemId,
    name: cat?.name ?? itemId,
    description: "",
    type: (cat?.type ?? "material") as ItemType,
    rarity: (cat?.rarity ?? "common") as ItemRarity,
    quantity,
    maxStack: Math.max(cat?.maxStack ?? 99, quantity),
    level: 1,
    weight: cat?.weight ?? 0.1,
    icon: cat?.icon ?? "📦",
  };
}

export type WorldResourceNodeDeps = {
  inventory: InventoryEvents;
  getPlayerMapId: (clientId: string) => string | null;
  getPlayerPosition: (
    clientId: string
  ) => { x: number; y: number; z: number } | null;
  awardExperience?: (playerId: string, baseXp: number) => void;
  /** ES: Escena v0.1 en sala (override de posición/radio para `nexus:resourceNode`). EN: In-room v0.1 scene (position/radius overrides). */
  getSceneDocument?: () => import("@nexusworld3d/content-schema").SceneDocumentV0_1 | null;
};

export class WorldResourceNodeEvents {
  private room: Room;
  private deps: WorldResourceNodeDeps;
  private lastHarvest = new Map<string, number>();

  constructor(room: Room, deps: WorldResourceNodeDeps) {
    this.room = room;
    this.deps = deps;
    this.setupHandlers();
  }

  private harvestKey(sessionId: string, nodeId: string): string {
    return `${sessionId}:${nodeId}`;
  }

  private setupHandlers(): void {
    this.room.onMessage(
      WorldMessages.HarvestNode,
      (client: Client, data: { nodeId?: string }) => {
        const nodeId = typeof data?.nodeId === "string" ? data.nodeId : "";
        const mapId = this.deps.getPlayerMapId(client.sessionId) ?? "exterior";
        const pos = this.deps.getPlayerPosition(client.sessionId);
        const now = Date.now();

        if (!nodeId) {
          client.send(WorldMessages.HarvestNodeResult, {
            ok: false,
            nodeId: "",
            message: "Nodo inválido",
          });
          return;
        }

        const baseNode = getWorldResourceNodeById(nodeId);
        if (!baseNode || baseNode.mapId !== mapId) {
          client.send(WorldMessages.HarvestNodeResult, {
            ok: false,
            nodeId,
            message: "Este recurso no está disponible aquí",
          });
          return;
        }

        const doc = this.deps.getSceneDocument?.() ?? null;
        const override = findResourceNodeOverrideInDocument(doc, nodeId);
        const node: WorldResourceNodeDef = override
          ? {
              ...baseNode,
              position: override.position,
              radius: override.interactionRadius ?? baseNode.radius,
            }
          : baseNode;

        if (!pos) {
          client.send(WorldMessages.HarvestNodeResult, {
            ok: false,
            nodeId,
            message: "Posición desconocida",
          });
          return;
        }

        const dx = pos.x - node.position.x;
        const dz = pos.z - node.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > node.radius + DIST_SLACK) {
          client.send(WorldMessages.HarvestNodeResult, {
            ok: false,
            nodeId,
            message: "Acércate más al punto de recolección",
          });
          return;
        }

        const k = this.harvestKey(client.sessionId, nodeId);
        const prev = this.lastHarvest.get(k) ?? 0;
        if (now - prev < HARVEST_COOLDOWN_MS) {
          client.send(WorldMessages.HarvestNodeResult, {
            ok: false,
            nodeId,
            message: "Espera un momento antes de volver a recolectar",
          });
          return;
        }

        const granted: { itemId: string; quantity: number }[] = [];
        for (const g of node.grants) {
          const qty = Math.max(
            0,
            Math.floor(typeof g.quantity === "number" ? g.quantity : 0)
          );
          if (qty <= 0) continue;
          const itemId = g.itemId;
          if (!ITEMS_CATALOG[itemId as keyof typeof ITEMS_CATALOG]) {
            for (const r of granted) {
              this.deps.inventory.tryConsumeCatalogItems(client.sessionId, [
                { itemId: r.itemId, quantity: r.quantity },
              ]);
            }
            client.send(WorldMessages.HarvestNodeResult, {
              ok: false,
              nodeId,
              message: "Ítem de recompensa no configurado",
            });
            return;
          }
          const added = this.deps.inventory.addItemFromWorld(
            client.sessionId,
            baseItemFromCatalog(itemId, qty)
          );
          if (added < qty) {
            for (const r of granted) {
              this.deps.inventory.tryConsumeCatalogItems(client.sessionId, [
                { itemId: r.itemId, quantity: r.quantity },
              ]);
            }
            client.send(WorldMessages.HarvestNodeResult, {
              ok: false,
              nodeId,
              message:
                "No cabe en el inventario — libera espacio o peso e inténtalo de nuevo",
            });
            return;
          }
          granted.push({ itemId, quantity: qty });
        }

        if (granted.length === 0) {
          client.send(WorldMessages.HarvestNodeResult, {
            ok: false,
            nodeId,
            message: "Nodo sin recompensa configurada",
          });
          return;
        }

        this.lastHarvest.set(k, now);
        this.deps.awardExperience?.(
          client.sessionId,
          RPG_XP_RESOURCE_NODE_HARVEST
        );

        client.send(WorldMessages.HarvestNodeResult, {
          ok: true,
          nodeId,
          grants: granted,
        });
      }
    );
  }
}
