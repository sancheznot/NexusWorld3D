# Required 3D models / Modelos 3D obligatorios

**EN.** After `git clone`, most of `public/models/` is **not** in git (large/private game assets). A fresh copy **will crash** on the character creator if boot models are missing — typically:

`Could not load /models/characters/men/men-all.glb: 404 Not Found`

**ES.** Tras `git clone`, casi todo `public/models/` **no está** en git (assets grandes/privados). Una copia nueva **fallará** en el creador de personaje si faltan los modelos de arranque — típicamente:

`Could not load /models/characters/men/men-all.glb: 404 Not Found`

---

## What ships in this repo / Qué incluye este repo

| Asset | Path | Tier |
|-------|------|------|
| Male player (all anims) | `public/models/characters/men/men-all.glb` | **boot** |
| Female player (all anims) | `public/models/characters/women/women-all.glb` | **boot** |
| Inventory silhouettes | `men_shape.png`, `women-shape.png` | boot (optional) |

Everything else (city, vehicles, terrain props, NPC variants) is **your responsibility** — copy from your asset pack, S3, or a private fork.

---

## Tiers / Niveles

Defined in [`content/required-models.json`](../content/required-models.json):

| Tier | When you need it |
|------|------------------|
| **boot** | Always — character creator + player in world |
| **demo** | Skybox + sun/moon when running the game (even `NEXT_PUBLIC_FRAMEWORK_DEMO=1`) |
| **full** | Default exterior map: `city.glb`, hotel interior, vehicles, tools, etc. |

Use **`NEXT_PUBLIC_FRAMEWORK_DEMO=1`** (`npm run dev:demo`) to skip the full city GLB while testing the framework slice. You still need **boot** character models.

---

## Validate after clone / Validar tras clonar

```bash
# Minimum — should pass on a clean template clone
npm run validate-required-models

# Before playing full exterior (not demo mode)
npm run validate-required-models -- --tier=full

# CI / fail on missing files
npm run validate-required-models -- --tier=boot --strict
npm run validate-required-models -- --tier=full --strict
```

Recommended first-time setup:

```bash
npm install
npm run validate-required-models -- --strict
npm run dev
```

Al abrir `/game`, si faltan archivos verás un **popup guía** con rutas exactas y pasos para colocarlos en `public/models/`.

---

## Adding your game assets / Añadir assets del juego

1. Place files under `public/models/…` matching the URLs used in code (see manifest).
2. Run `npm run validate-required-models -- --tier=full`.
3. For build pieces: `npm run validate-build-assets` ([`ADDING_CONTENT.md`](./ADDING_CONTENT.md) §5).
4. Read [`ASSETS_PUBLIC_REPO.md`](./ASSETS_PUBLIC_REPO.md) before publishing assets in a public fork.

### `.gitignore` behaviour

- `public/models/**` is ignored by default.
- **Exception:** boot character files listed in `.gitignore` negation rules and `public/models/characters/README.md`.
- To track more files in git, add explicit `!public/models/…` rules or use Git LFS for large GLBs.

---

## Where paths are defined / Dónde se definen las rutas

| Source | Role |
|--------|------|
| `nexusworld3d.config.ts` → `characters.models` | Default male/female GLB URLs |
| `CharacterCreatorV2.tsx` | Preview model in creator |
| `PlayerV2.tsx` | In-world player model |
| `GameCanvas.tsx` | City, hotel, vehicles (full game) |
| `content/required-models.json` | Validation manifest (keep in sync when adding critical GLBs) |

When you add a **hard-required** GLB (load fails without it), add an entry to `content/required-models.json` and document it here.

---

## Related / Ver también

- [`ASSETS_PUBLIC_REPO.md`](./ASSETS_PUBLIC_REPO.md) — licenses for public repos
- [`GETTING_STARTED.md`](./GETTING_STARTED.md) — install and demo mode
- [`SCALE_REFERENCE.md`](./SCALE_REFERENCE.md) — proportions for city assets
- [`public/models/characters/README.md`](../public/models/characters/README.md) — attribution for shipped characters
