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
| `nexus:box` | `size: [x,y,z]`, `color: #rrggbb`, `solid: boolean`, `mapId: string`; defaults `[1,1,1]`, `#a78bfa`, `true`, `exterior` | Schema compartido | Mesh + collider estático Cannon si `solid` |
| `nexus:group` | `{}`; único componente, escala uniforme positiva | Schema compartido: padres, profundidad y límites mundiales | Transformación heredada por grupos, cajas y modelos; sin cuerpo físico |
| `nexus:portal` | `targetPosition: [x,y,z]`, `yaw`; requiere triggerSphere | Destino de escena + alcance 3D + cooldown | Solicitud por E y pose confirmada por servidor |
| `nexus:model` | `assetId`, `mapId`, `colliders: [{size, offset}]` | Schema compartido + existencia del asset registrado/subido | GLTF estático + cajas de colisión configuradas |
| `game:*` | Definido por el juego privado | **Sí** (plugins del juego) | Según el juego |

**Nota / Note:** nuevos tipos `nexus:*` deben añadirse aquí y en tests/`validate-scene` fixtures cuando cambien reglas.

### Incremento de cajas jugables (2026-09-22)

`nexus:box` solo admite entidades raíz, un componente box por entidad y no se combina con `nexus:resourceNode`. Tamaños locales entre 0.01 y 1000; escala entre 0.01 y 1000; dimensiones finales ≤1000; posición absoluta ≤1e6. El schema rechaza propiedades desconocidas del box, números no finitos, rotaciones no unitarias y ciclos de parentesco. Las restricciones de box se comprueban antes de aplicar o cargar una escena. Los demás componentes mantienen sus validadores específicos.

El cliente usa posición, quaternion, tamaño y escala del documento tanto para geometría como para colisión, y filtra por mapa. No hay cuerpos dinámicos, colliders compuestos ni jerarquías físicas en este incremento. No introduce simulación física en servidor.

Con persistencia habilitada y permitida para la plantilla de sala, un error de escritura ahora rechaza apply/merge antes de mutar el estado o emitir el broadcast. Con persistencia deshabilitada sigue siendo una aplicación solo en memoria, no una publicación durable.

### Grupos y modelos (2026-09-27)

Este incremento sustituye la restricción histórica de entidades raíz para cajas/modelos. `nexus:group` permite grupos anidados con escala uniforme; cajas/modelos conservan escala por eje. Todos los padres deben ser grupos y los demás componentes permanecen en raíz. Se rechazan jerarquías genéricas antes aceptadas sin ejecución coherente. No hay migración automática de archivos existentes.

El schema comprueba límites tanto locales como acumulados, y profundidad máxima de 64 entidades contando la raíz. Editor, Play y runtime resuelven las mismas transformaciones mundiales mediante `resolveSceneWorldEntities`; las físicas incluyen los offsets de collider escalados y rotados. Los grupos solo tienen marcador en el editor. Ver `docs/plans/2026-09-27-scene-hierarchy-design.md` y fixture `content/scenes/groups.v0_1.json`.

## Referencias / References

Actualización 2026-09-28: recursos/triggers/portales también admiten padres grupo y escala uniforme. Cada recurso requiere un trigger y su nodeId es único por escena. `triggerSphere` admite radio 0.1–100, etiqueta y mapId; radio mundial máximo 100. Un trigger solo muestra un aviso; combinado con resource recoge del registro servidor, combinado con portal traslada dentro del mismo mapa. No se combinan resource y portal. El conjunto público se valida además con `server/scene/scenePlayable.ts`; ver el cierre de fase 3 para compatibilidad e importación legacy.

- `packages/content-schema/src/sceneV0_1.ts`
- `scripts/validate-scene.ts` — `npm run validate-scene` (incluido en `npm run check:phase1`)
- `content/scenes/starter.v0_1.json` (ejemplo canónico)
