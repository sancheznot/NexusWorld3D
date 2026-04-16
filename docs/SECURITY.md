# Security policy / Política de seguridad

## Reporting vulnerabilities / Reportar vulnerabilidades

**EN.** Please report security issues **privately** (do not open a public issue with exploit details). Contact the maintainers via the security advisory flow on GitHub (**Security → Report a vulnerability**) if enabled, or by email if published in the repository profile.

**ES.** Informa problemas de seguridad **en privado** (no abras un issue público con detalles de explotación). Usa **Security → Report a vulnerability** en GitHub si está activo, o el correo de contacto del mantenedor.

## Scope / Alcance

**EN.** We care about issues affecting the **multiplayer server** (Colyseus), **auth/session** handling, **arbitrary item or economy manipulation**, and **secret leakage** in defaults or docs.

**ES.** Nos interesan fallos en el **servidor multijugador**, **auth/sesión**, **manipulación de inventario/economía** y **filtrado de secretos** en plantillas o documentación.

## Safe defaults / Valores seguros

**EN.** Never commit `.env` or `.env.local`. Rotate credentials if they were ever pushed. See `.env.example` and `docs/DEPLOYMENT.md`.

**ES.** No subas `.env` ni `.env.local`. Rota credenciales si llegaron a commitearse. Ver `.env.example` y `docs/DEPLOYMENT.md`.

## Admin authoring shell / Shell de autoría admin

**EN.** The [Unity-style admin roadmap](./plans/2026-04-04-admin-unity-style-web-engine-roadmap.md) includes **browser authoring** and **scene apply**. Treat these as **high risk** without controls:

- **RBAC:** admin routes only for trusted roles; never ship an open editor on the same origin as players without authentication.
- **Server authority:** scene documents are **parsed with Zod (`sceneDocumentV0_1Schema`) only on the Colyseus process**; HTTP apply uses the same `NEXUS_GAME_MONITOR_SECRET` as the internal monitor (not player-facing).
- **WebSocket apply (optional tooling):** `world:scene-apply-document-v0_1` is accepted **only** from clients that joined with `sceneAuthoringToken` equal to `NEXUS_SCENE_AUTHORING_SECRET` when that env is set; otherwise the message is rejected.
- **Rate limits** and **max payload size** on any admin WebSocket or HTTP API (internal monitor POST is capped at 512 KiB JSON).
- **Staging first:** apply patches in non-production environments before prod.
- **Optional staging template:** `NEXUS_ENABLE_STAGING_WORLD_ROOM=1` registers a second Colyseus room name (`NEXUS_STAGING_WORLD_ROOM_NAME`, default `nexus-world-staging`). With `NEXUS_SCENE_AUTHORING_STAGING_ONLY=1`, **apply** and **entity merge** (HTTP + WebSocket) are rejected on the primary template so operators must target a staging room instance `roomId`.
- **Disk persistence:** `NEXUS_SCENE_PERSIST_ENABLE=1` writes validated scene JSON under `content/scenes/persisted/` (gitignored `*.json`). Use `NEXUS_SCENE_PERSIST_ONLY_STAGING=1` in production if you only want writes from the staging room template. Loading on room boot requires `NEXUS_SCENE_LOAD_PERSISTED=1` and a matching file — treat persisted files as server-controlled data, not untrusted player input.

**ES.** Autoría y **aplicación de escena** son **alto riesgo** sin controles: RBAC, validación solo en servidor Colyseus, HTTP interno con el mismo secreto del monitor, token opcional `NEXUS_SCENE_AUTHORING_SECRET` para mensajes WebSocket, límites de tamaño, **staging** antes de producción, y opcionalmente `NEXUS_SCENE_AUTHORING_STAGING_ONLY` para bloquear mutaciones en la plantilla principal.
