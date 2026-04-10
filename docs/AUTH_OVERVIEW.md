# Auth overview / Identidad y sesiones

**EN.** The app uses **Auth.js (NextAuth v5)** for player sign-in. Supported flows depend on `.env.local` (see `.env.local.example`): **Discord OAuth**, **magic-link email** (Resend), and optional SMTP.

**ES.** Sin `AUTH_SECRET` / proveedores configurados, el flujo “producción” no está completo; en desarrollo muchos flujos usan **invitado** en UI (nombre en localStorage + sala lobby) para chat y presencia sin cuenta.

---

## Dev / guest path / Invitados

**EN.** `GameLobby` and related UI allow a **guest display name** (stored in `localStorage`) when the user is not authenticated. That is enough to join the **lobby room** and, depending on server rules, the **world room**. It is **not** a substitute for secure identity in production.

**ES.** Para un **modo dev documentado**: usa guest + `NEXT_PUBLIC_FRAMEWORK_DEMO=1` + `docs/DEMO_MINIMAL.md` si quieres evitar DB.

---

## Swapping auth / Cambiar proveedor

**EN.** Keep NextAuth configuration in `src` app routes; a **private game repo** can replace providers (Supabase, Auth0, etc.) by changing the Auth.js config and callbacks while keeping the same **session shape** expected by Colyseus join options (`userId`, `username`).

**ES.** No hay hoy una interfaz `AuthProvider` única exportada del motor; el punto de extensión real es la **config NextAuth** del proyecto.

---

## Related / Ver también

- `.env.local.example` — `AUTH_*`, Resend, Discord.
- `docs/SECURITY.md` — reporting issues.
