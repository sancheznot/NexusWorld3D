# Deployment / Despliegue

Bilingual reference for running NexusWorld3D (framework + sample game) locally and in Docker.

---

## Local development / Desarrollo local

**EN.** Hot reload: Next.js and Colyseus as separate processes.

```bash
cp .env.local.example .env.local
# Edit .env.local — at minimum: PORT, COLYSEUS_PORT, NEXT_PUBLIC_SOCKET_URL, admin credentials.
npm install
npm run dev
```

**ES.** Un proceso corre Next (puerto `PORT`, típico **3000**); otro Colyseus (**`server/index.ts`**, `COLYSEUS_PORT` típico **3001**). El cliente usa `NEXT_PUBLIC_SOCKET_URL` (p. ej. `ws://localhost:3001`).

**Framework demo / Demo del framework:** en `.env.local` añade `NEXT_PUBLIC_FRAMEWORK_DEMO=1` (mapa ligero + cubo demo; ver `docs/GETTING_STARTED.md`).

**Database / Base de datos:** opcional en dev. Sin `MARIADB_*` / `DATABASE_URL`, el pool SQL puede quedar desactivado según rutas. Con credenciales, las migraciones pueden ejecutarse al arranque salvo `NEXUS_SKIP_AUTO_MIGRATE=1`. Manual: `npm run db:migrate`.

**Content validation / Validación de contenido:** `npm run validate-content` (manifest + catálogo).

**Publishing workspace packages / Publicar paquetes `@nexusworld3d/*`:** [`PUBLISHING_PACKAGES.md`](./PUBLISHING_PACKAGES.md).

---

## Unified production process / Producción unificada (un puerto)

**EN.** Single Node process: Next (production build) + Colyseus on the same HTTP server (`server/combined.ts`).

```bash
npm run build
npm run start
```

**ES.** `PORT` (por defecto 3000) sirve HTTP y WebSockets. Configura `NEXT_PUBLIC_SOCKET_URL` para que el navegador apunte al mismo origen (p. ej. `wss://tu-dominio` o vacío para inferencia en cliente).

---

## Docker Compose

**EN.** `docker-compose.yml` builds the app image, runs **production** `npm run start` (combined server) and **MariaDB 11** on an internal network. Not the same as `npm run dev`.

```bash
# Merge hints from env.docker.example into .env.local or .env
npm run docker:up
```

**ES.** Tras el primer arranque, migraciones dentro del contenedor:

```bash
bash scripts/compose-with-env.sh -f docker-compose.yml exec app npm run db:migrate
```

**Ports / Puertos:** `APP_PORT` (default 3000) maps the app. MariaDB **3306** no se publica al host por defecto (ver comentarios en `docker-compose.yml`).

**Interpolation / Variables:** `scripts/compose-with-env.sh` loads `.env.local` if present, then `.env`.

---

## Checklist before production / Antes de producción

- [ ] `AUTH_SECRET` and `AUTH_URL` set if using Auth.js.
- [ ] Strong `ADMIN_PASSWORD_ACCESS` and DB passwords.
- [ ] `npm run validate-content` in CI or pre-deploy.
- [ ] `PROTOCOL_VERSION` aligned between client and server builds (same `@nexusworld3d/protocol` release).

---

## Related docs / Documentación relacionada

- `docs/DEMO_MINIMAL.md` — try multiplayer without DB/Redis.
- `docs/GETTING_STARTED.md` — first run, demo mode.
- `docs/ARCHITECTURE.md` — client ↔ Colyseus ↔ persistence.
- `.env.local.example` — full commented variable list.
- `env.docker.example` — Compose-oriented DB and app secrets.
