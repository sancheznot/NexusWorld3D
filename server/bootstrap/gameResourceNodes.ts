/**
 * ES: Registra nodos de recurso extra antes de arrancar Colyseus.
 * EN: Register extra world harvest nodes before Colyseus starts.
 *
 * ```ts
 * import { registerResourceNode } from "@nexusworld3d/engine-server";
 *
 * registerResourceNode({
 *   id: "exterior_demo_ore",
 *   mapId: "exterior",
 *   position: { x: 10, y: 0.5, z: -5 },
 *   radius: 2.5,
 *   grants: [{ itemId: "material_stone_raw", quantity: 1 }],
 *   labelEs: "Veta demo",
 *   labelEn: "Demo vein",
 *   visual: "quarry",
 * });
 * ```
 */

export {};
