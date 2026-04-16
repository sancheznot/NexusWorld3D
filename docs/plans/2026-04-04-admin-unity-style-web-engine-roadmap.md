# Motor web “estilo Unity” para administración / Unity-style web engine for admins

**Versión:** 1.4  
**Fecha:** 2026-04-04  
**Depende de / Depends on:** [Framework Fase 1 / Phase 1](../plans/2026-04-03-framework-publication-roadmap.md) (`@nexusworld3d/*`, `content/manifest.json`, plugins, `check:phase1`).

---

## Propósito / Purpose

**ES.** Definir un **sistema entero** (no un parche) para que un **administrador** o **autor técnico** pueda crear y mantener mundos 3D multijugador con un flujo **parecido a Unity** — **dentro del navegador** o en una app web dedicada — sin reescribir el motor Colyseus + Three que ya tenéis.

**EN.** This document is a **full product roadmap** so **admins / technical designers** can author and maintain multiplayer 3D worlds with a **Unity-like workflow** in the **browser** (or a dedicated web shell), **on top of** your existing Colyseus + Three stack — not a ground-up rewrite.

**Audiencia / Audience:** CTO, lead gameplay, herramientas internas; no jugadores finales.

---

## Qué ya es “motor” hoy (base) / What is already “engine” today

| Capa | Estado aproximado |
|------|---------------------|
| Red / sync | Colyseus + `@nexusworld3d/protocol` + `protocolVersion` |
| Sala / extensión | `NexusWorldRoom`, plugins, `registerResourceNode` / `ItemEffect` / `WorldTool` |
| Datos | `content/manifest.json`, `content-schema`, `validate-content` |
| 3D cliente | React Three Fiber, mapas, inventario UI |
| Persistencia | MariaDB perfiles + Redis/Upstash (`docs/PERSISTENCE.md`) |

**ES.** El hueco no es “falta motor”, sino **falta producto de autoría** unificado para el **administrador**.

**EN.** The gap is **authoring product**, not core runtime.

---

## Experiencia objetivo (paridad mental con Unity) / Target mental model

| Unity (referencia) | Objetivo web (este plan) |
|--------------------|---------------------------|
| Hierarchy + Scene | Árbol de entidades / capas por mapa o por sala |
| Inspector | Panel que edita **propiedades serializadas** (solo lectura al inicio; edición después) |
| Prefab / variant | Plantilla de entidad + overrides por instancia (mínimo viable) |
| Project / Assets | Catálogo alineado con `manifest` + rutas `public/` o CDN |
| Play / Pause | Modo “simular sala” vs “solo editar datos” (no confundir con producción) |
| Gizmos / debug | Posición, triggers, radios de interacción, red |

**ES.** “Estilo Unity” aquí significa **ritmo de trabajo y conceptos**, no clonar el editor pixel a pixel.

**EN.** “Unity-like” means **workflow and concepts**, not a pixel-perfect clone.

---

## Alcance y no-alcance / Scope and non-goals

**In scope**

- Shell de **administración** (ruta protegida o subdominio `admin.*`).
- **Formato de escena** versionado (JSON o JSON Lines + checksum) importable por servidor y cliente.
- **Contrato componente** delgado (datos + hooks de ciclo de vida claros cliente/servidor).
- **Pipeline** GLB → validación (`validate-build-assets`) → entrada en manifest / registro de nodos.
- **Herramientas**: inspector, lista de entidades, reloj de red básico, flags de debug.

**Out of scope (inicial)**

- Motor C# / scripting completo tipo Unity.
- Editor de mallas pesadas (sigue siendo Blender / DCC externo).
- Replazar Next por otro framework sin motivo fuerte.
- Editor expuesto a internet **sin** RBAC, rate limits y auditoría.

---

## Arquitectura objetivo (capas) / Target architecture (layers)

```
┌─────────────────────────────────────────────────────────────┐
│  Admin shell (Next route group o app aparte)                 │
│  — auth admin, layout, router, guardas RBAC                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Authoring runtime (TypeScript)                               │
│  — SceneStore, Selection, Undo local (opcional), Inspector  │
│  — serialización ↔ blob versionado                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Bridge al motor existente                                  │
│  — carga escena en cliente (R3F) + mensajes Colyseus         │
│  — servidor: validar + aplicar patch de escena autoritativo│
└─────────────────────────────────────────────────────────────┘
```

**ES.** El **framework publicado** sigue siendo la capa inferior; el **admin** es un **consumidor** privilegiado del mismo protocolo.

**EN.** Published **framework** stays the bottom layer; the **admin app** is a **privileged consumer** of the same protocol.

---

## Modelo de datos: escena v0.1 / Scene format v0.1 (propuesta)

**ES.** Primera versión estable del archivo que el admin exporta/importa:

**EN.** First stable artifact the admin exports/imports:

```json
{
  "schemaVersion": 1,
  "worldId": "demo-or-production-id",
  "entities": [
    {
      "id": "ent_spawn_zone_01",
      "parentId": null,
      "transform": { "position": [0, 0, 0], "rotation": [0, 0, 0, 1], "scale": [1, 1, 1] },
      "components": [
        { "type": "nexus:resourceNode", "props": { "nodeId": "tree_oak" } },
        { "type": "nexus:triggerSphere", "props": { "radius": 2.5 } }
      ]
    }
  ]
}
```

- **`components[].type`:** prefijo `nexus:` = núcleo; `game:` = repo privado.
- **Validación estructural:** Zod en **`@nexusworld3d/content-schema`** (`sceneDocumentV0_1Schema`); semántica `nexus:*` → ver ADR 0001 tabla.
- **Aplicación:** mensaje de sala reservado `admin:applyScenePatch` (nombre a fijar en `protocol`) con **versión** y **firma** o rol admin.

---

## Fases e hitos / Phases and milestones

### Fase A — Especificación y contratos (2–4 semanas de enfoque)

| Entrega | Criterio de salida |
|---------|-------------------|
| ADR “escena v0.1 + patches” | [ADR 0001](../adr/0001-scene-format-v0-1.md) — **hecho** |
| Esquema Zod + ejemplo + CI | `sceneDocumentV0_1Schema` en `@nexusworld3d/content-schema`, `content/scenes/starter.v0_1.json`, `npm run validate-scene` en `check:phase1` — **hecho** |
| Lista de `component types` núcleo | [ADR 0001 — tabla `nexus:*`](../adr/0001-scene-format-v0-1.md#tipos-nexus-registrados-v01--registered-nexus-types-v01) — **hecho** |
| Amenaza modelo | [`docs/SECURITY.md`](../SECURITY.md) (sección *Admin authoring shell*) — **hecho** (lineamientos; hardening en código en Fase B+) |

**Salida / Exit:** ADR + Zod + ejemplo + `validate-scene` + tabla `nexus:*` + SECURITY ✅. **Fase B iniciada:** pestaña escenas en panel admin.

---

### Fase B — Inspector solo lectura sobre mundo vivo (4–8 semanas)

| Entrega | Criterio de salida |
|---------|-------------------|
| Rutas `/admin` + login existentes | Ya estaban; sesión vía `/api/admin/verify` |
| **Escenas v0.1 — inspector** | Pestaña **«Escenas v0.1»** en `/admin/panel` + `GET /api/admin/scenes` (parse Zod, tabla + JSON) — **hecho (archivos en disco, no estado Colyseus aún)** |
| **Vista escena v0 (Unity-lite)** | **Hecho** — Hierarchy + viewport R3F + Inspector (posición editable) + borrador local + descarga JSON; [`scene-view-authoring-v0-design`](./2026-04-03-scene-view-authoring-v0-design.md). Botón **«Vista 3D (beta)»** en la tarjeta de cada escena válida. |
| Lista de entidades **derivada** del estado Colyseus vivo | Parcial — snapshot `nexusWorldRooms` en pestaña Escenas + Monitor; falta árbol de entidades de **juego** si difiere del JSON. |
| Inspector read-only del mundo en juego | Pendiente (más allá de jugadores/posición en snapshot). |

**Salida / Exit (parcial):** admin autenticado puede **inspeccionar archivos** `content/scenes/*.json` sin mutar producción. Siguiente sub-hito: entidades desde sala en vivo.

---

### Fase C — Modo edición y serialización (8–14 semanas)

| Entrega | Criterio de salida |
|---------|-------------------|
| Editor local de escena (draft) | Cambios en memoria + export JSON — **hecho** (vista 3D admin) |
| **Aplicar escena v0.1 a Colyseus (memoria)** | **Hecho (MVP):** apply + merge + GET + Pull/Merge admin; staging + guard; **persistencia** `content/scenes/persisted/<worldId>.v0_1.json` (`NEXUS_SCENE_PERSIST_ENABLE`); **carga al crear sala** (`NEXUS_SCENE_LOAD_PERSISTED` + `NEXUS_SCENE_PERSIST_WORLD_ID`); sync al **join** (`world:scene-applied-document-v0_1`). **Gameplay:** cosecha `world:harvest-node` y **WorldResourceNodesLayer** usan posición/radio de escena para entidades `nexus:resourceNode` (+ `nexus:triggerSphere`). Pendiente: prefabs UI, auditoría, más ADR. |
| Import en **sala de staging** | **Parcial — hecho:** segunda plantilla Colyseus opcional; operadores deben usar `roomId` de esa instancia para HTTP/merge cuando el guard está activo. |
| Validación servidor | **Parcial — hecho:** `validateSceneDocumentSemanticsV0_1` — `nexus:resourceNode` + grants del nodo → cada `itemId` ∈ `content/manifest.json` (`isDeclaredManifestItemId`); `nexus:triggerSphere` → `radius` > 0; otros `nexus:*` rechazados hasta implementarlos. **Pendiente:** diff incremental en protocol; más tipos ADR. |
| Undo local (opcional) | Stack mínimo por sesión de edición |

**Salida / Exit:** import/export **cerrado** en entorno de pruebas.

---

### Fase D — Producto “admin motor” (continuo)

| Entrega | Criterio de salida |
|---------|-------------------|
| Prefabs mínimos | Duplicar entidad + overrides en JSON |
| Gizmos | Esferas/cajas de debug en R3F solo en modo admin |
| Pipeline GLB | Asistente: subir → validar → sugerir manifest |
| Auditoría | Log de quién aplicó qué patch y cuándo |

**Salida / Exit:** flujo usable por **no-programador técnico** con checklist interna.

---

## Seguridad y operación / Security and operations

**ES.**

- **Nunca** montar el editor en la misma URL que el juego público sin **RBAC** fuerte.
- Patches de escena solo por **WebSocket autenticado** + verificación de rol en **servidor** (no confiar en el cliente).
- Rate limiting en rutas admin y tamaño máximo de payload de patch.
- Entornos: `staging` obligatorio antes de `production`.

**EN.** Same rules: **server-authoritative** patches, **RBAC**, **rate limits**, **staging** before prod.

---

## Dependencias técnicas / Technical dependencies

- `@nexusworld3d/protocol` — nuevos mensajes admin (`ScenePatch`, `AdminSubscribeState`, etc.) con versionado.
- `@nexusworld3d/engine-server` — hooks opcionales `validateScenePatch` / plugins que registren componentes.
- Next **route groups** `(admin)` + middleware de sesión.
- Opcional: **Monaco** o **CodeMirror** para JSON avanzado; formularios generados desde Zod para MVP.

---

## Riesgos / Risks

| Riesgo | Mitigación |
|--------|------------|
| Scope infinito (“clonemos Unity”) | Este doc + revisiones trimestrales; non-goals explícitos |
| Desync cliente/servidor en patches | Versionado + diff incremental + rechazo atómico |
| Deuda UI | Reutilizar shadcn/Radix ya en el repo; no nuevo design system sin necesidad |

---

## Próxima acción inmediata / Immediate next action

1. ~~Schema v0.1 + ADR + tabla `nexus:*` + SECURITY + pestaña Escenas~~ → listo.
2. ~~**Vista escena v0** (Hierarchy + Scene + Inspector + export borrador)~~ → listo (solo disco; no servidor).
3. **Fase B (resto):** endpoint o mensaje Colyseus **solo admin** que exponga lista de entidades / nodos del estado de sala (read-only); UI alineada con el mismo patrón Hierarchy/Inspector si aplica.
4. **Fase C:** ~~validación~~ + ~~lectura en vivo~~ + ~~parche~~ + ~~staging~~ + ~~persistencia + overrides de nodos en gameplay~~ → hecho (MVP). Siguiente: auditoría; diff JSON más rico; prefabs.

---

## Apéndice: mapa rápido Unity → Nexus / Appendix: Unity → Nexus map

| Unity | Nexus (objetivo) |
|-------|------------------|
| GameObject | `entity` en escena JSON |
| Transform | `transform` en entidad |
| MonoBehaviour | `component` con `type` + `props` |
| ScriptableObject | Entradas `manifest` + catálogos TS |
| AssetDatabase | `npm run validate-content` + carpetas `public/` |
| Play Mode | Sala Colyseus + cliente R3F |
| Build | CI `check:phase1` + deploy Docker/Railway |

---

*Fin del documento v1.0 — revisar al cerrar §6 del roadmap de publicación / Review after Phase 1 publication roadmap §6 is closed.*
