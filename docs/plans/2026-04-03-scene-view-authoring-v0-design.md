# Scene View v0 — autoría local “estilo Unity” / Local Unity-style authoring

**Versión:** 1.0  
**Fecha:** 2026-04-03  
**Relacionado / Related:** [ADR 0001](../adr/0001-scene-format-v0-1.md), [Motor admin estilo Unity](./2026-04-04-admin-unity-style-web-engine-roadmap.md) Fase B–C.

---

## Objetivo / Goal

**ES.** Dar el **salto de UX** que separa “inspector de tabla/JSON” de un **flujo tipo Unity**: **Hierarchy** (árbol por `parentId`), **Scene** (viewport 3D con selección), **Inspector** (propiedades editables mínimas), sin todavía **aplicar** cambios al proceso Colyseus ni al disco del servidor.

**EN.** Deliver the **UX leap** from table/JSON inspection to a **Unity-like loop**: **Hierarchy** (`parentId` tree), **Scene** (3D viewport + picking), **Inspector** (minimal editable fields), **without** applying changes to Colyseus or server-side files yet.

---

## Alcance v0 / v0 scope

| Pieza | Comportamiento |
|-------|----------------|
| Viewport | R3F + OrbitControls + rejilla; **primitiva caja** por entidad en `transform`; clic para seleccionar; clic vacío deselecciona. |
| Hierarchy | Raíces `parentId === null`, hijos anidados; clic selecciona. |
| Inspector | `id`, `parentId` lectura; **posición** (3 floats) editable; rotación/escala y `components` lectura (JSON legible). |
| Borrador | Estado **solo en memoria** en el cliente; **Restablecer** recarga desde snapshot inicial de la sesión del editor. |
| Export | **Descargar JSON (borrador)** — el operador debe pasar `npm run validate-scene` antes de commit. |

## Fuera de v0 / Out of v0

- Persistencia servidor, `admin:applyScenePatch`, staging room.
- Gizmos de arrastre (translate handles); edición de rotación en UI.
- Semántica por componente (`nexus:triggerSphere` como esfera en vista).

## Seguridad / Security

Misma sesión admin que el resto del panel; export es **archivo local** — no amplía superficie HTTP.

## Servidor en vivo (Fase C — implementado después de v0) / Live server (Phase C)

- **HTTP (monitor):** `POST /__nexus-internal/v1/scene-apply-v0_1` + proxy admin `POST /api/admin/scene-authoring/apply` (mismo secreto que snapshot).
- **WebSocket (tooling):** `world:scene-apply-document-v0_1` solo si el cliente hizo join con `sceneAuthoringToken` = `NEXUS_SCENE_AUTHORING_SECRET` (env opcional).
- **Broadcast:** `world:scene-applied-document-v0_1` con el documento validado; estado en memoria en `NexusWorldRoom` (no persiste a disco del repo).
- **Cliente juego:** `colyseus/client` reenvía el mensaje; `useSocket` valida con `safeParseSceneDocumentV0_1` y llena `sceneAuthoringStore`; `SceneAuthoringPreviewLayer` en `GameCanvas` dibuja cajas violeta por entidad (preview, no reemplaza nodos de recurso del juego).
- **Semántica servidor (plan Fase C):** `server/scene/validateSceneDocumentSemanticsV0_1.ts` tras Zod — `nexus:resourceNode.nodeId` vía `getWorldResourceNodeById`; **grants del nodo** → `itemId` declarados en `content/manifest.json`; `nexus:triggerSphere.radius` > 0; manifest obligatorio (`getContentManifest()`); otros `nexus:*` rechazados hasta ampliar ADR.
- **Parche incremental:** `mergeSceneEntitiesFromRegistry` — upsert por `entity.id`; requiere escena previa en memoria; validación documento completo + semántica; broadcast igual que apply. Monitor: `GET …/scene-state-v0_1`, `POST …/scene-merge-entities-v0_1`. Protocolo: `SceneMessages.PatchEntitiesV0_1` (clientes tooling con `sceneAuthoringToken`).
- **Staging (prod-safe):** `NEXUS_ENABLE_STAGING_WORLD_ROOM=1` registra una plantilla adicional (`NEXUS_STAGING_WORLD_ROOM_NAME`, default `nexus-world-staging`). Con `NEXUS_SCENE_AUTHORING_STAGING_ONLY=1`, apply/merge (HTTP + WS) solo en instancias de esa plantilla; lectura GET sigue permitida en cualquier sala registrada.
- **Persistencia:** `NEXUS_SCENE_PERSIST_ENABLE=1` escribe JSON tras apply/merge OK (`NEXUS_SCENE_PERSIST_ONLY_STAGING` opcional; coherente con `NEXUS_SCENE_AUTHORING_STAGING_ONLY`). `NEXUS_SCENE_LOAD_PERSISTED=1` + archivo `content/scenes/persisted/<worldId>.v0_1.json` (worldId vía `NEXUS_SCENE_PERSIST_WORLD_ID` o `worlds.default`). Cada join recibe `world:scene-applied-document-v0_1` si hay escena en memoria.
- **Gameplay / nodos:** `findResourceNodeOverrideInDocument` — servidor (`WorldResourceNodeEvents`) y cliente (`WorldResourceNodesLayer`) alinean posición y radio con la escena; preview violeta omite entidades con `nexus:resourceNode`.

## Próximo incremento / Next increment

Rotación/escala en inspector, preview de radio `nexus:triggerSphere` en R3F; auditoría de patches; cliente que haga join directo a plantilla staging.
