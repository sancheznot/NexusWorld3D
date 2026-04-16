# ADR 0001 — Formato de escena v0.1 (admin / Unity-web)

**Estado:** Aceptado  
**Fecha:** 2026-04-04

## Contexto / Context

El plan [Motor admin estilo Unity](../plans/2026-04-04-admin-unity-style-web-engine-roadmap.md) requiere un **artefacto serializado** compartido entre editor admin, cliente (R3F) y servidor (Colyseus) sin acoplar el editor a constantes TypeScript del juego.

## Decisión / Decision

1. **Transporte:** archivo **JSON** UTF-8 con extensión recomendada `.scene.v0_1.json` o carpeta `content/scenes/*.json`.
2. **Versión:** campo obligatorio `schemaVersion: 1` en la raíz del documento (número entero; futuras versiones incrementan).
3. **Entidades:** lista `entities[]` con `id`, `parentId` (`null` o string), `transform` (posición 3, rotación cuaternión 4, escala 3), `components[]`.
4. **Componentes:** cada uno `{ "type": "<prefijo>:<nombre>", "props": { … } }` donde `prefijo` es `nexus` (núcleo framework) o `game` (repo privado / extensión). Validación sintáctica con **Zod** en `@nexusworld3d/content-schema` (`sceneDocumentV0_1Schema`).
5. **Semántica de `props`:** no validada por Zod en v0.1 salvo forma genérica (`record`); la **sala** valida `nexus:*` al aplicar escena en vivo (`validateSceneDocumentSemanticsV0_1` + `getWorldResourceNodeById` para `nexus:resourceNode`, y **cada `itemId` en grants del nodo** contra `content/manifest.json`; radio > 0 para `nexus:triggerSphere`). Requiere `loadContentManifestOrThrow` antes de aceptar apply. Los **plugins** siguen validando reglas de juego.

## Consecuencias / Consequences

**Positivas**

- Mismo paquete `content-schema` que el manifest; CI puede ejecutar `npm run validate-scene`.
- Git-friendly, diffable, revisable en PR.

**Negativas**

- JSON puede crecer; más adelante se puede ofrecer compresión o chunking por mapa.
- Duplicación conceptual con parte del estado Colyseus hasta exista “bridge” de importación.

## Alternativas descartadas / Rejected alternatives

- **Solo TS en servidor:** peor para herramientas externas y admin web.
- **Protobuf / MessagePack v0.1:** más fricción para autores y diff en PR; posible v2.

## Tipos `nexus:*` registrados (v0.1) / Registered `nexus:*` types (v0.1)

**ES.** Tabla de **propiedad de validación**: quién debe rechazar props inválidas antes de aplicar el documento al mundo. En v0.1 el Zod solo valida forma; esta tabla gobierna la **semántica** cuando exista importación.

**EN.** **Validation ownership** — who must reject invalid props before applying a scene to the world. Zod v0.1 is structural only; this table governs **semantics** when import exists.

| `type` | Props esperadas (mínimo) | Servidor | Cliente |
|--------|---------------------------|----------|---------|
| `nexus:resourceNode` | `{ "nodeId": string }` — id conocido en registro de nodos / `WORLD_RESOURCE_NODES` | **Sí** (autoritativo) | Opcional (preview UI) |
| `nexus:triggerSphere` | `{ "radius": number > 0 }` | **Sí** | Opcional |
| `game:*` | Definido por el juego privado | **Sí** (plugins del juego) | Según el juego |

**Nota / Note:** nuevos tipos `nexus:*` deben añadirse aquí y en tests/`validate-scene` fixtures cuando cambien reglas.

## Referencias / References

- `packages/content-schema/src/sceneV0_1.ts`
- `scripts/validate-scene.ts` — `npm run validate-scene` (incluido en `npm run check:phase1`)
- `content/scenes/starter.v0_1.json` (ejemplo canónico)
