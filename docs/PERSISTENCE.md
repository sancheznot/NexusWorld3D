# Persistence interfaces / Persistencia

**EN.** Long-term direction: the **game** implements storage; the **framework** depends on narrow interfaces.

**ES.** Hoy el código sigue usando **MariaDB**, **Redis (Upstash)** y archivos directamente en muchos sitios. Como paso intermedio, **`@nexusworld3d/engine-server`** exporta tipos de referencia:

- `PlayerStore` — load/save per-player snapshot (`unknown` until you define a schema).
- `SessionStore` — key/value cache (e.g. Redis).
- `WorldStateStore` — optional world-level patches.

**Import / Importar:**

```ts
import type { PlayerStore, SessionStore } from "@nexusworld3d/engine-server";
import {
  createInMemoryPlayerStore,
  createInMemorySessionStore,
  createInMemoryWorldStateStore,
} from "@nexusworld3d/engine-server";
```

**Demo en memoria / In-memory demo**

**EN.** `createInMemoryPlayerStore`, `createInMemorySessionStore`, and `createInMemoryWorldStateStore` are **Map-backed** references for local dev and tests. `SessionStore` honors `ttlSeconds` lazily on `get`.

**ES.** `NexusWorldRoom` inicializa esos tres por defecto en `onCreate`. Para enchufar Redis/MariaDB, **subclase** `NexusWorldRoom` y sobreescribe `createPersistenceStores()` devolviendo tus implementaciones (el resto del juego sigue usando `this.playerStore` / `sessionStore` / `worldStateStore` cuando migres llamadas desde Redis directo).

**EN.** `NexusWorldRoom` wires the three defaults in `onCreate`. To inject real backends, **subclass** `NexusWorldRoom` and override `createPersistenceStores()`.

**Chat / Chat:** recent room chat history is stored under **`SessionStore`** key `framework:room:chat:v1` (per Colyseus room instance), not the global mock `gameRedis` chat list.

**EN.** A future refactor can move more call sites off ad-hoc Redis/MariaDB onto these interfaces without changing plugin APIs.

**ES.** Ver también `docs/ARCHITECTURE.md` y `docs/DEPLOYMENT.md` para MariaDB y Docker.
