# Framework demo / Demo del framework

## Demo independiente — fase 4

La demo nueva está en `standalone/`. Se exporta con tarballs compilados, sin Next, React, assets privados, DB ni aliases del repositorio:

```sh
# Desde la raíz; la carpeta de destino debe ser nueva y su padre debe existir.
npm run export:demo -- /tmp/mi-nexus-demo
cd /tmp/mi-nexus-demo
npm install --ignore-scripts
npm run build
npm test
npm start
```

Abre `http://127.0.0.1:3100`. Dos pestañas comparten el mundo; WASD/flechas y espacio. `scene.json` define suelo, obstáculos y spawn. El servidor controla física y movimiento; el cliente interpola snapshots. Ctrl+C cierra el servidor. No ejecutar `npm install` directamente en la plantilla `standalone/`: sus paquetes locales todavía no están publicados en npm; el exportador los incluye en `vendor/`.

`npm run check:demo` instala, compila y prueba en una carpeta temporal externa, con dos clientes WebSocket reales, sin dejar un servidor escuchando. La carpeta se elimina tras éxito y se conserva si falla. La demo no incluye persistencia de jugadores, controles móviles ni garantías de producción. Ver `standalone/README.md`.

## Modo legacy integrado en la aplicación

Los scripts anteriores de `apps/demo` se conservan por compatibilidad. Lo siguiente describe ese modo integrado, no la demo exportable.

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
