# NexusWorld3D Framework – Deploy (Single Service) y Roadmap

> **📚 Para la visión completa del framework, ver:** [FRAMEWORK_VISION.md](./FRAMEWORK_VISION.md)

## Despliegue en un solo servicio (Railway / Docker)

- Servidor unificado
  - Archivo: `server/combined.ts` – monta Next (HTTP) y Colyseus (WebSocket) en el mismo HTTP server y puerto `$PORT`.
  - Scripts (`package.json`):
    - `dev`: corre Next + Colyseus separados para DX local.
    - `start`: `tsx server/combined.ts` (un solo proceso/puerto) – usar en producción.
- Railway
  - `railway.toml` → `startCommand = "npm run start"`.
  - No fijar `PORT` en Railway (Railway inyecta `$PORT`).
  - `NODE_ENV=production`.
  - `Procfile`: `web: npm run start`.
- Docker
  - `Dockerfile`: `RUN npm run build`, `EXPOSE 3000`, `CMD ["npm","run","start"]`.
  - Un solo puerto (3000) expuesto por el contenedor.
- Cliente Colyseus (autodetección de WS)
  - `src/lib/colyseus/client.ts`:
    - En producción, si no hay `NEXT_PUBLIC_SOCKET_URL`, usa automáticamente `wss://<host>` (mismo dominio/puerto del frontend).
    - En desarrollo, usa `ws://localhost:3001`.
- Variables de entorno
  - Producción (Railway):
    - Requeridas: `NODE_ENV=production`.
    - Opcionales: `NEXT_PUBLIC_SOCKET_URL` (solo si quieres forzar una URL distinta).
    - No usar: `PORT`, `SOCKET_PORT`.
  - Desarrollo local:
    - `NEXT_PUBLIC_SOCKET_URL` no es necesario; se usa `ws://localhost:3001` por defecto.

## Limpieza de código legacy (Socket.IO)

- Eliminados: `src/lib/socket/client.ts`, `src/app/api/socket/route.ts`, `server/package.json`, `server/simple.ts`.
- Dependencias removidas: `socket.io`, `socket.io-client`.

## Políticas de runtime (multiplayer)

- Heartbeat: cliente envía `player:heartbeat` cada 10s.
- Limpieza: el servidor elimina solo jugadores `offline` con `lastUpdate > 60s` (intervalo 30s).
- LOD: el cliente renderiza máx. 12 jugadores cercanos (configurable).
- Modelos/animación: `SkeletonUtils.clone(scene)` por instancia.

## Roadmap para framework “build-on-it”

1) Config central (`humboldt.config.ts`): mundo, networking, assets, UI.
2) Módulos (`src/core`, `src/modules/{player,world,chat,inventory,net}`).
3) Tipos/protocolo compartido (`src/shared/protocol.ts`, `src/shared/types.ts`) – sin `any`.
4) Hooks/Plugins de servidor: `onInit`, `onPlayerJoin`, `onPlayerLeave`, `onMessage`, `onTick`.
5) Template + CLI (scaffold) y scripts: `create:game`, `dev`, `build`, `start`.
6) Docs: quickstart, config, plugins, deploy, troubleshooting.

## Tareas pendientes sugeridas

- Tipar `any` en `src/lib/colyseus/client.ts`, `GameCanvas.tsx`, `src/lib/services/redis.ts`, `src/types/*`.
- Mover heartbeat/cleanup/LOD a config y leerlos en server/cliente.
- Pooling/caching de animaciones y optimización de loaders.
- Ejemplos de mundos y de assets personalizados.

—
Última actualización: servidor unificado (Next + Colyseus), Docker/Railway single port, WS autodetect en cliente, y limpieza de Socket.IO.
