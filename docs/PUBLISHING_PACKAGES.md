# Publishing `@nexusworld3d/*` packages / Publicar paquetes

**EN.** Today, workspace packages are **`"private": true`** and consumed via **`workspace:*`** from the app root. To ship the **framework core** on npm or GitHub Packages while keeping a **private game** in another repo, follow this outline.

**ES.** Hoy los paquetes están **`"private": true`** y se consumen con **`workspace:*`**. Para publicar el **núcleo** en npm / GitHub Packages y que un **juego privado** dependa por versión semver:

---

## 1. Before first publish / Antes del primer publish

**EN.**

1. Set **`"private": false`** only on packages you intend to publish (`protocol`, `engine-server`, `engine-client`, `content-schema`, etc.).
2. Add **`repository`**, **`bugs`**, and **`homepage`** fields (GitHub URL of the **public** framework repo).
3. Decide **build vs source publish**: these packages currently expose **TypeScript source** in `"exports"`. That works for **Vite/Next + `transpilePackages`**. For maximum npm compatibility, add a **`prepublishOnly`** script that runs **`tsc`** or **tsup** into `dist/` and point `"exports"` to **`./dist/index.js`**.

**ES.** Sin build, los consumidores deben poder resolver `.ts` (Next `transpilePackages`, bundlers). Para npm “clásico”, compilá a **`dist/`** antes de publicar.

---

## 2. Registry / Registro

**EN.**

- **npm (public scope):** `npm login` → `npm publish --access public` inside each package (or use **changesets** / **semantic-release**).
- **GitHub Packages:** `.npmrc` in the consumer repo:
  ```
  @nexusworld3d:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
  ```
  Publish with `npm publish` after configuring `publishConfig` in `package.json`.

**ES.** Un juego privado en CI debe tener **token** con permiso `read:packages` (GH) o acceso al registry npm.

---

## 3. Versioning / Versionado

**EN.** Use **semver** (`0.x` until API stable, then `1.0.0`). Bump **all** published packages together when `protocol` breaks message contracts.

**ES.** Si cambia `PROTOCOL_VERSION` o nombres de mensajes, subí **`@nexusworld3d/protocol`** y paquetes que dependan de él en el **mismo release** o documenta compatibilidad.

---

## 4. Private game repo / Repo de juego privado

**EN.**

```json
{
  "dependencies": {
    "@nexusworld3d/protocol": "^0.1.0",
    "@nexusworld3d/engine-server": "^0.1.0"
  }
}
```

**ES.** Mientras no publiques, el juego puede seguir usando **`file:../hotel-humboldt/packages/protocol`** o **git+ssh** a un subdirectorio del monorepo.

---

## Related / Ver también

- [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) — runtime
- [Roadmap §6 — exit criteria](../plans/2026-04-03-framework-publication-roadmap.md)
