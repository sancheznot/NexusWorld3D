# Planned extension APIs / APIs de extensión previstas

**EN.** The roadmap (§3.3) describes **ergonomic registrars** so games add tools, resource nodes, and item effects without forking core loops. They are **not implemented yet**; today you achieve the same with **room plugins** and **message handlers**.

**ES.** El roadmap (§3.3) describe **registros ergonómicos** para herramientas, nodos de recurso y efectos de ítem. **Aún no están en código**; hoy se logra lo mismo con **plugins de sala** y **`onMessage`**.

---

## Today / Hoy

| Goal / Objetivo | Pattern / Patrón |
|-----------------|------------------|
| World interaction (raycast, use key) | `NexusContextRoomPlugin` + `FrameworkRoomPluginContext`; message in `@nexusworld3d/protocol`; server validates distance / cooldown (see `createFrameworkDemoCubePlugin`). |
| Resource node (chop, mine) | `createWorldResourceNodesPlugin` (`server/room/nexusRoomPlugins.ts`) or duplicate that pattern in a `game:*` plugin. |
| Item consume effect | Server-only handler in inventory/economy flow (`InventoryEvents`, crafting, or custom `onMessage` gated by manifest + catalog). |

---

## Planned (roadmap) / Previsto (roadmap)

**EN.** Names are indicative; signatures will evolve.

- `registerWorldTool({ id, clientRaycastFilter, serverOnUse, durabilityKey })`
- `registerResourceNode({ type, grants, cooldown, distanceCheck })`
- `registerItemEffect({ itemId, onConsume })` (server)

**ES.** Cuando existan, vivirán probablemente en **`@nexusworld3d/engine-server`** o en un paquete `engine-gameplay` y se **adjuntarán** desde `NexusWorldRoom` o un bootstrap de juego privado.

---

## Related / Ver también

- `docs/ADDING_CONTENT.md` — plugins, manifest, receta §7.
- `docs/plans/2026-04-03-framework-publication-roadmap.md` — §3.3.
