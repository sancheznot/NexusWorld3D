# Adding content & plugins / Contenido y plugins

## 1. Nuevo mensaje de sala / New room message

1. Añade la constante en `packages/protocol/src/messages.ts` (namespace adecuado: `World`, `Housing`, `game:*` en tu repo privado, etc.).
2. En el **servidor**, `room.onMessage(Const.Name, handler)`.
3. En el **cliente**, `room.send(Const.Name, payload)` o `colyseusClient` / capa que uses.

## 2. Plugin de sala (patrón actual) / Room plugin pattern

Implementa `NexusRoomPlugin` en `server/room/nexusRoomPlugins.ts` (o un archivo junto a tu feature):

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

## 3. Contenido data-driven / Data-driven content (Fase 2)

Pendiente: manifest JSON + `npm run validate-content`. Hoy el catálogo sigue en `src/constants/*.ts`.

## 4. Demo sin arte del juego / Demo without game art

`NEXT_PUBLIC_FRAMEWORK_DEMO=1` + mapa exterior → ver `FrameworkDemoGround` en `src/components/world/FrameworkDemoGround.tsx`.
