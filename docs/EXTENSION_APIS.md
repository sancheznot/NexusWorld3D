# Planned extension APIs / APIs de extensión previstas

**EN.** The roadmap (§3.3) describes **ergonomic registrars** so games add tools, resource nodes, and item effects without forking core loops. They are **not implemented yet**; today you achieve the same with **room plugins** and **message handlers**.

**ES.** El roadmap (§3.3) describe **registros ergonómicos** para herramientas, nodos de recurso y efectos de ítem. **Aún no están en código**; hoy se logra lo mismo con **plugins de sala** y **`onMessage`**.

---

## Today / Hoy

| Goal / Objetivo | Pattern / Patrón |
|-----------------|------------------|
| World interaction (raycast, use key) | `NexusContextRoomPlugin` + `FrameworkRoomPluginContext`; message in `@nexusworld3d/protocol`; server validates distance / cooldown (see `createFrameworkDemoCubePlugin`). |
| Resource node (chop, mine) | **`registerResourceNode`** (engine-server) + static `WORLD_RESOURCE_NODES`; server handler `WorldResourceNodeEvents` + plugin `createWorldResourceNodesPlugin`. |
| Item consume effect | Server-only handler in inventory/economy flow (`InventoryEvents`, crafting, or custom `onMessage` gated by manifest + catalog). |

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

## Planned (roadmap) / Previsto (roadmap)

**EN.** Still open:

- `registerWorldTool({ id, clientRaycastFilter, serverOnUse, durabilityKey })`
- `registerItemEffect({ itemId, onConsume })` (server)

**Optional hardening for `registerResourceNode`:** per-node cooldown / `distanceCheck` overrides (today global constants in `WorldResourceNodeEvents`).

---

## Related / Ver también

- `docs/ADDING_CONTENT.md` — plugins, manifest, receta §7.
- `docs/plans/2026-04-03-framework-publication-roadmap.md` — §3.3.
