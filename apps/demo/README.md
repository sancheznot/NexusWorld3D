# Framework demo / Demo del framework

**ES.** No hay una segunda copia de Next.js: **`apps/demo`** solo delega scripts a la **raíz del repo** (`npm --prefix ../..`). Tras instalar dependencias en la raíz, puedes arrancar el modo demo desde aquí o desde la raíz.

**EN.** There is no duplicate Next.js app: **`apps/demo`** only forwards scripts to the **repository root**. After installing at the repo root, start the demo from here or from root.

---

## Máquina limpia / Clean machine

**ES.**

1. Clona el repositorio y entra en la **raíz** (donde está el `package.json` principal con `next` y `colyseus`).
2. `npm install`
3. Copia `.env.local.example` → `.env.local` (mínimo para Auth/DB si los usas; ver `docs/DEMO_MINIMAL.md` para solo demo).
4. **Opción A — raíz:** `npm run dev:demo`
5. **Opción B — esta carpeta:** `cd apps/demo && npm run dev:demo`

Abre `http://localhost:3000`, entra al mapa **exterior**: modo demo = suelo + rejilla sin `city.glb` ni capas pesadas; Colyseus sigue activo.

**EN.**

1. Clone the repo and `cd` to the **root** (main `package.json` with `next` + `colyseus`).
2. `npm install`
3. Copy `.env.local.example` → `.env.local` (see `docs/DEMO_MINIMAL.md` for DB-less demo).
4. **Option A — root:** `npm run dev:demo`
5. **Option B — this folder:** `cd apps/demo && npm run dev:demo`

Visit `http://localhost:3000`, open the **exterior** map.

---

## Scripts / Scripts

| Command | Effect |
|--------|--------|
| `npm run dev` | Root `dev` (Next + Colyseus, full game shell). |
| `npm run dev:demo` | Root `dev:demo` (`NEXT_PUBLIC_FRAMEWORK_DEMO=1` on Unix). |
| `npm run validate` | Runs `validate-content` + `validate-build-assets` at root. |

**ES.** En Windows, si `dev:demo` no fija la variable, define `NEXT_PUBLIC_FRAMEWORK_DEMO=1` en `.env.local` y usa `npm run dev`.

**EN.** On Windows, set `NEXT_PUBLIC_FRAMEWORK_DEMO=1` in `.env.local` and use `npm run dev` if the env inline in `dev:demo` fails.

---

## Docs / Documentación

- `docs/GETTING_STARTED.md`
- `docs/DEMO_MINIMAL.md` — demo sin DB/Redis real
- `docs/ADDING_CONTENT.md` — manifest, plugins, `validate-build-assets`
