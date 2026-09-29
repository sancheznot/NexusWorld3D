# Planned extension APIs / APIs de extensión previstas

**EN.** The roadmap (§3.3) **`registerResourceNode`**, **`registerItemEffect`**, and **`registerWorldTool`** are **implemented** (see sections below). Older flows (`TreeChop`, `RockMine`) still use dedicated messages; migrating them is optional.

**ES.** Los tres registros principales del §3.3 están **en código**; tala y mina siguen con mensajes dedicados hasta que se unifiquen si se desea.

---

## Scene runtime and plugin lifetime / Runtime y vida útil (fase 4)

`@nexusworld3d/engine-client` exports `createSceneRuntime(document, mapId)` and `mountSceneRuntime(runtime, adapter)`. The document must already be validated. The snapshot contains resolved entities, spawn and static boxes with world position, normalized quaternion and full size (not half extents). An adapter implements `addStaticBox(box)` and returns a cleanup function for that body. The returned runtime cleanup owns only these bodies, not the whole physics world. Failed installations roll back completed allocations; adapters must clean their own partial allocation before throwing.

`@nexusworld3d/engine-server` exports `installRuntimePlugins(context, plugins)`. Plugins declare `id`, optional `version`, optional `requires` (IDs in the same batch), and synchronous `setup(context)` returning optional cleanup. Dependencies install first. Missing dependencies, cycles and duplicate IDs reject the entire batch before setup. Disposal runs in reverse order, is idempotent and attempts every cleanup even if one throws (`PluginCleanupError.errors`). Failed setup rolls back earlier plugins; the failing plugin remains responsible for its incomplete setup.

```ts
const stop = installRuntimePlugins(services, [
  { id: 'game:quests', version: '1.0.0', requires: ['core:inventory'],
    setup: ctx => ctx.quests.start() }, // start returns cleanup
  { id: 'core:inventory', version: '1.0.0',
    setup: ctx => ctx.inventory.start() },
]);
// World/room teardown:
stop();
```

Existing `attachNexusRoomPlugins` / `attachContextRoomPlugins` also return cleanup and accept the metadata. Existing `attach` methods returning void still work. Keep the returned function and invoke it during room disposal. This is not remote plugin loading, version-range resolution, hot reload or a sandbox for untrusted code.

### Scoped registries / Registros por sala

`createWorldRegistries()` creates empty, independent `resources`, `effects` and `tools` registries. Their methods mirror the legacy registration/get/clear names. Each registration returns idempotent cleanup which removes only that registration; stale cleanup never removes a replacement. `clear()` clears all three owned registries. Individual factories (`createResourceNodeRegistry`, `createItemEffectRegistry`, `createWorldToolRegistry`) and `fork()` are also available.

```ts
const scope = createWorldRegistries();
const stop = installRuntimePlugins(scope, [{ id: 'game:resource', setup(ctx) {
  return ctx.resources.registerResourceNode({ id: 'ore', mapId: 'exterior',
    position: { x: 2, y: 0, z: 1 }, radius: 3, grants: [] });
} }]);
// Inject scope.tools into attachGenericWorldToolRouter(room, gate, scope.tools).
// Dispose plugins before clearing their scope:
stop(); scope.clear();
```

Legacy top-level functions still address process-wide bootstrap templates. `createWorldRegistries({ inheritDefaults: true })` explicitly copies them once. New registrations/clear operations on templates do not modify existing scopes. `NexusWorldRoom` owns such a snapshot and injects it into inventory effects, resource lookup, scene live validation and generic tools. Scene catalog/publication outside a room still uses bootstrap definitions; runtime registrations are not an editor synchronization or persistence API. Built-in game resource definitions remain shared templates and retain lookup precedence; lookup returns detached data.

Resource positions/grants and tool metadata are copied on insertion/read/fork. Function closures cannot be cloned: stateful handlers must be constructed separately per world, preferably inside plugin setup. Sharing a callback that captures mutable state still shares that captured state. The template API is compatibility support, not an implicit runtime fallback when a scope is supplied.

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
