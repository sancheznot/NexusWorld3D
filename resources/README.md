# NexusWorld3D — `resources/`

ES: Carpeta para **recursos emparejados** (servidor + cliente) que amplían el juego sin tocar el core.  
EN: Folder for **paired resources** (server + client) that extend the game without touching core.

## CoreContext

Cada recurso servidor recibe `CoreContext`:

- `room` — instancia `NexusWorldRoom`.
- `registerDisposable(fn)` — limpieza en `onDispose` de la sala.
- `services` — bolsa `FrameworkServices` (p. ej. `economy`, `inventory`) que rellenan los recursos **core** en orden.

## Dos fases de registro (servidor)

1. **`core-registry.server.ts`** — economía → inventario (antes de `ItemEvents` / `ShopEvents` en la sala).
2. **`registry.server.ts`** — tiempo → jobs → ejemplo (después de ítems/tienda y el intervalo de limpieza).

`server/bootstrap/attachFrameworkResources.ts` expone `attachCoreFrameworkResources` y `attachLateFrameworkResources`.

## Layout

```text
resources/
  types.ts                 # CoreContext + RegisterServerResource
  registry.server.ts       # Lista de registros servidor (orden importa) / Server register list
  <nombre>/
    resource.json          # Metadatos (id, deps) — opcional por ahora / Metadata — optional for now
    server/register.ts     # Exporta RegisterServerResource
    client/register.ts     # Función(es) a llamar desde el cliente Next
```

## Cómo añadir un recurso / How to add a resource

1. Crear carpeta bajo `resources/<id>/` con `server/register.ts` y, si aplica, `client/register.ts`.
2. **Servidor:** importar y añadir el export en `registry.server.ts`.
3. **Cliente:** importar y añadir en `src/lib/resources/loadClientResources.ts` (`CLIENT_REGISTERS`).

Aliases TypeScript (ver `tsconfig.json`):

- `@/…` → código en `src/`.
- `@resources/…` → carpeta `resources/` (preferir en recursos en lugar de `../../`).
- `@server/…` → carpeta `server/` (entrada Colyseus, sala, módulos).
- `@repo/…` → raíz del repo (p. ej. `@repo/nexusworld3d.config`).
