# Planned extension APIs / APIs de extensión previstas

**EN.** The roadmap (§3.3) **`registerResourceNode`**, **`registerItemEffect`**, and **`registerWorldTool`** are **implemented** (see sections below). Older flows (`TreeChop`, `RockMine`) still use dedicated messages; migrating them is optional.

**ES.** Los tres registros principales del §3.3 están **en código**; tala y mina siguen con mensajes dedicados hasta que se unifiquen si se desea.

---

## Today / Hoy

| Goal / Objetivo | Pattern / Patrón |
|-----------------|------------------|
| World interaction (raycast, use key) | **`registerWorldTool`** + `GenericTool` or `NexusContextRoomPlugin` / demo cube (`createFrameworkDemoCubePlugin`). |
| Resource node (chop, mine) | **`registerResourceNode`** (engine-server) + static `WORLD_RESOURCE_NODES`; server handler `WorldResourceNodeEvents` + plugin `createWorldResourceNodesPlugin`. |
| Item consume effect | **`registerItemEffect`** + catálogo `ITEMS_CATALOG.effects` en `InventoryEvents.handleUseItem`. |

---

## Implemented (resource nodes) / Implementado (nodos de recurso)

**EN.** `registerResourceNode` lives in **`@nexusworld3d/engine-server`** (also importable as **`@nexusworld3d/engine-server/resource-node-registry`** for **client-safe** bundles without the Colyseus barrel). Registrations merge with **`WORLD_RESOURCE_NODES`** in `src/constants/worldResourceNodes.ts` (`getWorldResourceNodeById`, `getWorldResourceNodesForMap`). Bootstrap stub: `server/bootstrap/gameResourceNodes.ts` (imported from `server/index.ts` and `server/combined.ts`).

**ES.** Cooldown y distancia siguen en **`WorldResourceNodeEvents`** (fijos por ahora); el registro aporta **id, mapId, posición, radio, grants, labels, visual**.

```ts
import { registerResourceNode } from "@nexusworld3d/engine-server";

registerResourceNode({
  id: "my_node",
  mapId: "exterior",
  position: { x: 0, y: 0.5, z: 0 },
  radius: 2.5,
  grants: [{ itemId: "material_stone_raw", quantity: 1 }],
  labelEs: "…",
  labelEn: "…",
  visual: "quarry",
});
```

## Implemented (item consume) / Implementado (consumo de ítem)

**EN.** `registerItemEffect(itemId, onConsume)` — **synchronous** hooks run after catalog effects (gold, etc.) and **before** `ItemUsed` broadcast and stack decrement. Multiple handlers per `itemId` run in registration order. Bootstrap: `server/bootstrap/gameItemEffects.ts`. Import: `@nexusworld3d/engine-server` or `@nexusworld3d/engine-server/item-effect-registry` (server-only; wired from `resources/inventory/server/InventoryEvents.ts`).

**ES.** No sustituye efectos del catálogo (`ITEMS_CATALOG.effects`); **añade** comportamiento (broadcast, integraciones, etc.). Async deliberadamente **no** en v1.

## Implemented (world tools) / Implementado (herramientas mundo)

**EN.** `registerWorldTool({ id, itemIds, durabilityKey?, clientTargetUserData?, serverOnUse })` — **`WorldMessages.GenericTool`** / **`GenericToolResult`**. Router: `attachGenericWorldToolRouter(room, gate)` (wired in `NexusWorldRoom` with inventory gate). **Client:** `sendGenericWorldTool`, `userDataMatchesWorldToolHint` (`@nexusworld3d/engine-client`). **Shared ids:** `src/constants/frameworkWorldTools.ts` + `server/bootstrap/gameWorldTools.ts`. Demo: green sphere in `FrameworkDemoGround` (needs `food_apple`).

**ES.** `clientTargetUserData` sustituye la función `clientRaycastFilter` del roadmap: el juego compara `userData` en el raycast con el helper del engine-client.

## Planned (roadmap) / Previsto (roadmap)

**EN.** Optional: fold `TreeChop` / `RockMine` into the same router; per-tool cooldown; async handlers.

**Optional hardening for `registerResourceNode`:** per-node cooldown / `distanceCheck` overrides (today global constants in `WorldResourceNodeEvents`).

**Future `registerItemEffect`:** async hooks with explicit cancel / “skip consume” contract.

---

## Related / Ver también

- `docs/ADDING_CONTENT.md` — plugins, manifest, receta §7.
- `docs/plans/2026-04-03-framework-publication-roadmap.md` — §3.3.
