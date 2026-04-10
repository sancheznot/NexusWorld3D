# Persistence interfaces / Persistencia

**EN.** Long-term direction: the **game** implements storage; the **framework** depends on narrow interfaces.

**ES.** Hoy el código sigue usando **MariaDB**, **Redis (Upstash)** y archivos directamente en muchos sitios. Como paso intermedio, **`@nexusworld3d/engine-server`** exporta tipos de referencia:

- `PlayerStore` — load/save per-player snapshot (`unknown` until you define a schema).
- `SessionStore` — key/value cache (e.g. Redis).
- `WorldStateStore` — optional world-level patches.

**Import / Importar:**

```ts
import type { PlayerStore, SessionStore } from "@nexusworld3d/engine-server";
```

**EN.** A future refactor can inject implementations into `NexusWorldRoom` or a slimmer “game host” without changing plugin APIs.

**ES.** Ver también `docs/ARCHITECTURE.md` y `docs/DEPLOYMENT.md` para MariaDB y Docker.
