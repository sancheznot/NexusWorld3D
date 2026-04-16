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

**ES.** `NexusWorldRoom` usa `createRoomPersistenceStores()` (`server/persistence/createRoomPersistence.ts`). Orden: **1)** si **`UPSTASH_REDIS_REST_URL`** y **`UPSTASH_REDIS_REST_TOKEN`** están definidos → **Upstash REST** (`@upstash/redis`); **2)** si no, y hay **`REDIS_URL`** → **ioredis** (TCP, p. ej. contenedor Docker); **3)** si no → **memoria** (un proceso / dev). Si conviven Upstash y `REDIS_URL`, **gana Upstash**. Prefijo de claves: `REDIS_KEY_PREFIX` (default `nw3d`).

**EN.** Order: **1)** **`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`** → Upstash REST; **2)** else **`REDIS_URL`** → ioredis; **3)** else in-memory. **Upstash takes precedence** over `REDIS_URL` when both are set.

**Docker:** `docker-compose.yml` can run a local **`redis`** service with `REDIS_URL`; for **Upstash-only** deploys, set the REST vars and you can omit `REDIS_URL` / the redis container.

**Chat / Chat:** recent room chat history is stored under **`SessionStore`** key `framework:room:chat:v1` (per Colyseus room instance), not the global mock `gameRedis` chat list.

**Player snapshot / Jugador:** `NexusWorldRoom` **loads** `PlayerStore.loadSnapshot(sessionId)` first, then falls back to mock **`gameRedis.getPlayer`**; **saves** with **`playerStore.saveSnapshot(sessionId, playerData)`** together with **`gameRedis.addPlayer`** (same payload shape) for compatibility.

**Inventario por usuario / Per-user inventory cache:** `getPlayerInventorySnapshot` / `savePlayerInventorySnapshot` están en **`gameRedis`** (`server/persistence/gameRedis.ts`). Con **`REDIS_URL`**, el adaptador **IoRedisGameRedis** persiste en Redis (`{prefix}:inv:user:{username}`); sin URL, **MockGameRedis** en memoria. Fuente de verdad del inventario sigue siendo **MariaDB** (`player_profile.inventory_json`) cuando existe fila; Redis es caché/fallback entre sesiones.

**EN.** A future refactor can move more call sites off ad-hoc Redis/MariaDB onto these interfaces without changing plugin APIs.

**ES.** Ver también `docs/ARCHITECTURE.md` y `docs/DEPLOYMENT.md` para MariaDB y Docker.
