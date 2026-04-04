# Hotel Humboldt / NexusWorld3D — Railway

## ES

### Arquitectura actual (producción)

- **Un solo proceso y un solo puerto:** `npm run start` → `server/combined.ts` (Next.js + Colyseus en el mismo HTTP).
- **Docker:** `Dockerfile` en la raíz — misma base conceptual que `docker-compose.yml` (app en producción).
- **Healthcheck:** `GET /health` → `200 OK` (usado por Railway).

`railway.toml` y `railway.json` están alineados para usar **builder `DOCKERFILE`**. El comando de arranque es `npm run start` (equivalente a `npm run start:all` en `package.json`).

### Variables de entorno (runtime)

| Variable | Uso |
|----------|-----|
| `PORT` | **La asigna Railway.** No fuerces `3001`; el servidor unificado escucha en `process.env.PORT` (por defecto 3000 solo en local). |
| `DATABASE_URL` | **Recomendado** si usas el plugin MySQL/MariaDB de Railway (URL tipo `mysql://...`). |
| `MARIADB_HOST`, `MARIADB_PORT`, `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_DATABASE` | Alternativa a `DATABASE_URL` si conectas a una base externa o variables sueltas. |
| `NODE_ENV` | `production` (ya fijado en `[env]` de `railway.toml` para referencia). |

Opcionales / juego:

- `NEXT_PUBLIC_*` — se “hornan” en el **build** de Next; en Docker deben existir como **build arguments** o variables disponibles en la fase de build en Railway (ver abajo).
- Si **no** defines `NEXT_PUBLIC_COLYSEUS_URL` ni `NEXT_PUBLIC_SOCKET_URL`, en el navegador el cliente usa `ws(s)://` + `window.location.host` en producción (adecuado para un solo dominio en Railway).

### Build Docker en Railway (NEXT_PUBLIC_*)

El `Dockerfile` declara `ARG`/`ENV` de ejemplo:

- `NEXT_PUBLIC_GAME_NAME`
- `NEXT_PUBLIC_COLYSEUS_ROOM`
- `NEXT_PUBLIC_SOCKET_URL`

En Railway: **Settings → your service → Variables**, marca las que deban inyectarse en **build** como variables de entorno de build (según la UI, “Build” / “Shared” según versión). Si faltan, se usan los valores por defecto del `Dockerfile`.

### Pasos rápidos (Docker)

1. Repo conectado a Railway.
2. Un servicio con fuente Git; Railway debe leer `railway.toml` / `railway.json` y construir con **Dockerfile**.
3. Añade base de datos (MySQL/MariaDB) y copia `DATABASE_URL` al servicio de la app (o configura `MARIADB_*`).
4. Despliega; las migraciones SQL en `migrations/` se aplican al arranque vía `runPendingMigrations()` (salvo `NEXUS_SKIP_AUTO_MIGRATE=true`).

### Alternativa: Nixpacks (sin Docker)

Si prefieres no usar Docker en Railway:

1. En el servicio, cambia el builder a **Nixpacks** (dashboard) o elimina/ajusta la sección `[build]` en `railway.toml`.
2. Se usará `nixpacks.toml` (`npm run build` + `npm run start`).

Mantén el mismo `start` unificado; no uses el modelo antiguo “Next en 3000 + Socket en 3001” salvo que vuelvas a separar servidores en código.

### Archivos relacionados

| Archivo | Rol |
|---------|-----|
| `Dockerfile` | Imagen producción (incluye `migrations/` para arranque). |
| `docker-compose.yml` | App + MariaDB local/dedicado; mismo `CMD` que Railway Docker. |
| `railway.toml` / `railway.json` | Builder Dockerfile + healthcheck + start. |
| `nixpacks.toml` | Solo si el builder es Nixpacks. |
| `Procfile` | Compatibilidad Heroku-style; Railway con Docker usa `CMD` / `startCommand` del config. |

---

## EN

### Current production architecture

- **Single process, single port:** `npm run start` → `server/combined.ts` (Next.js + Colyseus on one HTTP server).
- **Docker:** root `Dockerfile` — same idea as `docker-compose.yml` (production app).
- **Healthcheck:** `GET /health` → `200 OK`.

`railway.toml` and `railway.json` are aligned on **builder `DOCKERFILE`**. The start command is `npm run start` (same as `npm run start:all` in `package.json`).

### Environment variables (runtime)

| Variable | Purpose |
|----------|---------|
| `PORT` | **Set by Railway.** Do not force `3001`; the unified server listens on `process.env.PORT`. |
| `DATABASE_URL` | **Preferred** with Railway’s MySQL/MariaDB plugin. |
| `MARIADB_*` | Alternative when not using a single URL. |

If you omit `NEXT_PUBLIC_COLYSEUS_URL` and `NEXT_PUBLIC_SOCKET_URL`, the browser client uses `ws(s)://` + `window.location.host` in production (good for one Railway hostname).

### Docker build on Railway (NEXT_PUBLIC_*)

Define build-time variables in Railway so the Docker build sees them, or rely on `Dockerfile` defaults.

### Quick steps (Docker)

1. Connect the repo.
2. Ensure the service builds with the **Dockerfile** (config-as-code does this).
3. Add MySQL/MariaDB and set `DATABASE_URL` (or `MARIADB_*`) on the app service.
4. Deploy; `migrations/` are applied on boot unless `NEXUS_SKIP_AUTO_MIGRATE=true`.

### Alternative: Nixpacks

Switch the service builder to **Nixpacks** and use `nixpacks.toml` if you do not want Docker builds.

### Related files

Same table as above (Dockerfile, `docker-compose.yml`, `railway.toml` / `railway.json`, `nixpacks.toml`, `Procfile`).
