# Nexus standalone laboratory

This directory is exported with compiled framework tarballs into `vendor/`. It does not need the original repository, Next.js, React, private maps, accounts, Redis or a database.

```sh
npm install --ignore-scripts
npm run build
npm test
npm start
```

Open http://127.0.0.1:3100 and click **Entrar al laboratorio**. Open a second tab for multiplayer. WASD/arrows move, Space jumps. Leave/rejoin with the button. The server binds only to loopback; Ctrl+C closes it. `PORT` can override 3100. Keep the generated package-lock.json for repeatable installations with `npm ci --ignore-scripts`.

Edit `scene.json` (canonical v0.1) to change boxes, transforms, colliders and spawn, then restart. The renderer intentionally supports boxes only; it rejects unsupported components instead of pretending to render them. The shared framework resolves transforms/colliders; `physics.mjs` is the Cannon adapter. `server.mjs` composes a Colyseus room and a managed input plugin. `client.mjs` bundles only public packages and Three.js.

Physics runs on the server at a fixed 60 Hz with bounded catch-up. Snapshots are sent at 20 Hz; the browser interpolates them. Clients send axes/jump, never positions. No client prediction/lag compensation, account persistence, deployment hardening, mobile controls or load target is claimed. This is an eight-player local development example, not a production game server. A refresh creates a new guest session; editing the file persists the scene, not player progress.

Tests run a physical wall/jump/respawn/disposal regression and two actual WebSocket clients, plus HTTP bundle/scene checks. Browser visual acceptance remains a separate manual step.
