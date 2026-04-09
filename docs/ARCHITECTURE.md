# Architecture / Arquitectura

## Vista general / Overview

```mermaid
flowchart LR
  subgraph client [Next.js + R3F]
    UI[React UI]
    Canvas[GameCanvas / Three]
    ColyseusJS[colyseus.js client]
  end
  subgraph server [Node + Colyseus]
    Room[NexusWorldRoom]
    Plugins[Room plugins]
    Inv[InventoryEvents]
    Eco[EconomyEvents]
  end
  subgraph data [Persistence]
    Redis[(Redis)]
    SQL[(MariaDB)]
  end
  UI --> ColyseusJS
  Canvas --> ColyseusJS
  ColyseusJS <-->|WebSocket| Room
  Room --> Plugins
  Room --> Inv
  Room --> Eco
  Inv --> Redis
  Inv --> SQL
```

## Sala y plugins / Room & plugins

`NexusWorldRoom` compone subsistemas. El primer plugin registrado vía API es **`core:world-resource-nodes`** (`server/room/nexusRoomPlugins.ts` + `createWorldResourceNodesPlugin`). Otros módulos (`TreeChopEvents`, `HousingEvents`, …) se migrarán al mismo patrón de forma incremental.

## Protocolo / Protocol

`@nexusworld3d/protocol` exporta:

- `PROTOCOL_VERSION` — subir cuando haya cambios incompatibles en payloads **core** (pendiente: handshake estricto).
- `WorldMessages`, `HousingMessages`, `InventoryMessages`, `PlayerMessages`, etc.

Usa estos enums en **cliente y servidor** para que renombrar un mensaje sea un solo cambio.
