import type { Room, Client } from "colyseus";
import type { NexusRoomPlugin } from "@nexusworld3d/engine-server";
import { DemoMessages } from "@nexusworld3d/protocol";
import type { InventoryEvents } from "@resources/inventory/server/InventoryEvents";
import { ITEMS_CATALOG } from "@/constants/items";
import { FRAMEWORK_DEMO_CUBE_CENTER } from "@/constants/frameworkDemo";

const PICKUP_RADIUS_SQ = 5 * 5;
const COOLDOWN_MS = 10_000;
const REWARD_ITEM_ID = "food_apple" as const;

export type FrameworkDemoCubeDeps = {
  inventory: InventoryEvents;
  getPlayerPosition: (
    sessionId: string
  ) => { x: number; y: number; z: number } | null;
};

/**
 * ES: Plugin piloto — cubo clickeable en demo da manzana si el jugador está cerca.
 * EN: Pilot plugin — demo cube grants an apple when the player is in range.
 */
export function createFrameworkDemoCubePlugin(
  deps: FrameworkDemoCubeDeps
): NexusRoomPlugin {
  const lastPickup = new Map<string, number>();

  return {
    id: "core:demo-framework-cube",
    attach(room: Room) {
      room.onMessage(DemoMessages.FrameworkCubePickup, (client: Client) => {
        const now = Date.now();
        const prev = lastPickup.get(client.sessionId) ?? 0;
        if (now - prev < COOLDOWN_MS) return;

        const pos = deps.getPlayerPosition(client.sessionId);
        if (!pos) return;

        const c = FRAMEWORK_DEMO_CUBE_CENTER;
        const dx = pos.x - c.x;
        const dy = pos.y - c.y;
        const dz = pos.z - c.z;
        if (dx * dx + dy * dy + dz * dz > PICKUP_RADIUS_SQ) return;

        const cat = ITEMS_CATALOG[REWARD_ITEM_ID];
        if (!cat) return;

        const added = deps.inventory.addItemFromWorld(client.sessionId, {
          itemId: REWARD_ITEM_ID,
          quantity: 1,
          name: cat.name,
          description: "",
          type: cat.type,
          rarity: cat.rarity,
          weight: cat.weight,
          maxStack: cat.maxStack ?? 99,
          level: 1,
          icon: cat.icon,
        });

        if (added > 0) lastPickup.set(client.sessionId, now);
      });
    },
  };
}
