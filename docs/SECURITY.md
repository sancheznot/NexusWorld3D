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
