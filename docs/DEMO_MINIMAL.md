# Minimal public demo / Demo pública mínima

**Goal / Objetivo:** Run the **framework slice** (flat world, Colyseus, demo cube, protocol handshake) **without** MariaDB or Upstash if you only want to try multiplayer locally.

---

## Quick start / Inicio rápido

**EN.**

1. `cp .env.local.example .env.local` (or start from root `.env.example`).
2. Set at minimum: `PORT`, `COLYSEUS_PORT`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_APP_URL`, `CLIENT_URL`, admin credentials.
3. **Omit** `MARIADB_*` and `DATABASE_URL` — the SQL pool stays off for many code paths; profile features may be limited until you add DB.
4. Omit or blank `UPSTASH_REDIS_REST_URL` / `UPSTASH_*` — the project uses an **in-memory Redis mock** when unset.
5. Enable demo map: `NEXT_PUBLIC_FRAMEWORK_DEMO=1` (or run `npm run dev:demo` from repo root).
6. `npm install` && `npm run dev` (or `npm run dev:demo`).

**ES.** Sin base de datos ni Redis real puedes probar **conexión a sala**, **movimiento**, **cubo demo** (manzana si pasas validación de distancia/manifest). Funciones que lean perfil en MariaDB pueden degradarse o no persistir — es esperado en este modo.

---

## Content manifest / Manifest

**EN.** Server grants (cube, world, craft) require `itemId` in `content/manifest.json`. Default repo manifest already includes `food_apple`. Run `npm run validate-content` after edits.

---

## Related / Ver también

- `docs/GETTING_STARTED.md` — full setup, demo mode details.
- `apps/demo/README.md` — pointer to this folder.
- `docs/DEPLOYMENT.md` — production and Docker.
