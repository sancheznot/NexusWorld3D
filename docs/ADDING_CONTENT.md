# Adding content & plugins / Contenido y plugins

## 1. Nuevo mensaje de sala / New room message

1. Añade la constante en `packages/protocol/src/messages.ts` (namespace adecuado: `World`, `Housing`, `game:*` en tu repo privado, etc.).
2. En el **servidor**, `room.onMessage(Const.Name, handler)`.
3. En el **cliente**, `room.send(Const.Name, payload)` o `colyseusClient` / capa que uses.

## 2. Plugin de sala (patrón actual) / Room plugin pattern

El contrato **`NexusRoomPlugin`** y **`attachNexusRoomPlugins`** viven en **`@nexusworld3d/engine-server`**. Para código nuevo, preferir **`NexusContextRoomPlugin`** + **`attachContextRoomPlugins(room, ctx, plugins)`** con **`FrameworkRoomPluginContext`** (`getPlayerPosition`, ampliable en tu juego). Ejemplo: `createFrameworkDemoCubePlugin`.

Las fábricas que aún usan el estilo clásico (`attach(room)` sin ctx) siguen en `server/room/nexusRoomPlugins.ts` o junto a tu feature.

```typescript
export function createMyGamePlugin(deps: MyDeps): NexusRoomPlugin {
  return {
    id: "game:my-feature",
    attach(room) {
      new MyFeatureEvents(room, deps);
    },
  };
}
```

Regístralo en `NexusWorldRoom` con `attachNexusRoomPlugins(this, [createMyGamePlugin(ctx), ...])`.

**Referencia / Reference:** `createWorldResourceNodesPlugin` — ~10 líneas.

**Plugin demo cubo:** `createFrameworkDemoCubePlugin` (`server/room/frameworkDemoCubePlugin.ts`) + mensaje `DemoMessages.FrameworkCubePickup` — visible con `NEXT_PUBLIC_FRAMEWORK_DEMO=1` (cubo dorado en `FrameworkDemoGround`); el servidor comprueba distancia y cooldown.

## 3. Contenido data-driven / Data-driven content (Fase 2)

- **Manifest:** `content/manifest.json` — `schemaVersion`, `items[]` con `{ id }`, y arrays opcionales (`recipes`, `worldSpawns`, `buildingPieces`, `shops`).
- **Validación:** `npm run validate-content` — **`@nexusworld3d/content-schema`** (Zod) + cada `items[].id` ∈ **`ITEMS_CATALOG`** (`src/constants/items.ts`).
- **Runtime:** al arrancar Colyseus (`server/index.ts` / `server/combined.ts`) se llama `loadContentManifestOrThrow()` — misma validación que `validate-content`. Usa `getContentManifest()` / `isDeclaredManifestItemId()` desde `@server/content/loadContentManifest` cuando quieras comprobar “subset publicado”.
- **Otorgamiento:** `InventoryEvents.addItemFromWorld` solo acepta `itemId` presentes en el manifest (mundo, craft, tiendas que usan esa API). Añade el id a `content/manifest.json` y pasa `npm run validate-content`.
- **Cliente:** el mensaje `inventory:add-item` queda acotado al mismo criterio (catálogo + manifest) para evitar ids falsos desde el cliente.
- El catálogo de definiciones completas sigue en `src/constants/items.ts` (el manifest lista qué ids están activos / documentados).

## 4. Demo sin arte del juego / Demo without game art

`NEXT_PUBLIC_FRAMEWORK_DEMO=1` + mapa exterior → ver `FrameworkDemoGround` en `src/components/world/FrameworkDemoGround.tsx`.

## 5. Modelos de construcción (`pieceId`) / Build piece GLBs

**Convención / Convention**

- **Ruta pública / Public path:** `public/models/build/{pieceId}.glb` (mismo basename que `pieceId`, caracteres seguros: letras, dígitos, `_`, `-`).
- **Catálogo de código / Code catalog:** `src/constants/buildPieces.ts` — `BUILD_PIECE_CATALOG` + `fallback` primitivo si el `.glb` no está en el servidor o falla la carga.
- **Manifest (opcional):** `content/manifest.json` → `buildingPieces[]` puede incluir objetos con `pieceId` para documentar piezas adicionales; el validador las incluye en el chequeo.

**Validación / Validation**

```bash
npm run validate-build-assets
# CI estricto / strict CI:
npx tsx scripts/validate-build-assets.ts --strict
```

Sin `--strict`, faltan GLB → **warning** (el juego puede seguir con primitivos). Con `--strict`, cualquier pieza requerida sin archivo → **exit 1**.
