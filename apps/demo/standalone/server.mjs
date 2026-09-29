import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server, Room } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { parseSceneDocumentV0_1, getSceneBoxProps } from '@nexusworld3d/content-schema';
import { PROTOCOL_VERSION } from '@nexusworld3d/protocol';
import { attachNexusRoomPlugins } from '@nexusworld3d/engine-server';
import { createDemoPhysics } from './physics.mjs';

export const document = parseSceneDocumentV0_1(JSON.parse(readFileSync(new URL('./scene.json', import.meta.url), 'utf8')));
if (document.entities.some(entity => entity.components.length !== 1 || entity.components[0].type !== 'nexus:box' || getSceneBoxProps(entity)?.mapId !== 'exterior')) {
  throw new Error('This minimal renderer supports exterior boxes only');
}

class DemoRoom extends Room {
  onAuth(_client, options) {
    if (options.protocolVersion !== PROTOCOL_VERSION || options.worldId !== document.worldId) throw new Error('Incompatible demo world/protocol');
    return true;
  }
  onCreate() {
    this.maxClients = 8;
    this.physics = createDemoPhysics(document);
    this.inputs = new Map();
    this.stopPlugins = attachNexusRoomPlugins(this, [{ id: 'game:demo-controls', version: '0.1.0', attach: room => {
      const removeInput = room.onMessage('demo:input', (client, data) => {
        const previous = this.inputs.get(client.sessionId);
        const now = Date.now();
        if (!previous || now - previous.at < 30) return;
        if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.z) || Math.abs(data.x) > 1 || Math.abs(data.z) > 1 || typeof data.jump !== 'boolean') return;
        this.inputs.set(client.sessionId, { x: data.x, z: data.z, jump: data.jump, at: now });
      });
      const removeSnapshot = room.onMessage('demo:ready', client => client.send('demo:snapshot', this.snapshot()));
      return () => { removeInput(); removeSnapshot(); this.inputs.clear(); };
    } }]);
    this.setSimulationInterval(delta => {
      const now = Date.now();
      for (const input of this.inputs.values()) if (now - input.at > 250) { input.x = 0; input.z = 0; input.jump = false; }
      this.physics.step(this.inputs, delta / 1000);
    }, 1000 / 60);
    this.clock.setInterval(() => this.broadcast('demo:snapshot', this.snapshot()), 50);
  }
  snapshot() {
    return [...this.physics.players].map(([id, body]) => ({ id, position: body.position.toArray() }));
  }
  onJoin(client) { this.physics.add(client.sessionId); this.inputs.set(client.sessionId, { x: 0, z: 0, jump: false, at: 0 }); }
  onLeave(client) { this.physics.remove(client.sessionId); this.inputs.delete(client.sessionId); }
  onDispose() { try { this.stopPlugins?.(); } finally { this.physics?.dispose(); this.clock.clear(); } }
}

export async function startDemo({ port = 0, host = '127.0.0.1' } = {}) {
  const routes = new Map([
    ['/', ['public/index.html', 'text/html; charset=utf-8']],
    ['/client.js', ['public/client.js', 'text/javascript; charset=utf-8']],
  ]);
  const http = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/scene') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(document)); return;
    }
    const entry = routes.get(pathname);
    if (!entry) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const data = readFileSync(new URL(entry[0], import.meta.url));
      response.writeHead(200, { 'Content-Type': entry[1], 'X-Content-Type-Options': 'nosniff' }); response.end(data);
    } catch { response.writeHead(503); response.end('Run npm run build first'); }
  });
  const server = new Server({ transport: new WebSocketTransport({ server: http, maxPayload: 4096 }), greet: false, gracefullyShutdown: false });
  server.define('demo', DemoRoom);
  await server.listen(port, host);
  return { port: http.address().port, close: () => server.gracefullyShutdown(false) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startDemo({ port: Number(process.env.PORT ?? 3100) });
  console.log(`Nexus standalone lab: http://127.0.0.1:${server.port}`);
  let stopping = false;
  const stop = () => { if (!stopping) { stopping = true; void server.close(); } };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
