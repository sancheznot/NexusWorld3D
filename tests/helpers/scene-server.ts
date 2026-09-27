import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { loadContentManifestOrThrow } from '../../server/content/loadContentManifest';
import { NexusWorldRoom } from '../../server/rooms/NexusWorldRoom';

// Only launched by the integration harness with a whitelisted disposable environment.
if (!process.send || process.env.NEXUS_SCENE_TEST_WORKER !== '1') {
  throw new Error('Scene test worker requires the isolated IPC harness');
}

void (async () => {
  loadContentManifestOrThrow();
  const requireModule = createRequire(import.meta.url);
  const { Server } = requireModule('colyseus') as typeof import('colyseus');
  const { WebSocketTransport } = requireModule('@colyseus/ws-transport') as typeof import('@colyseus/ws-transport');
  const http = createServer();
  // The harness owns shutdown instead of installing the default signal handlers.
  const server = new Server({ transport: new WebSocketTransport({ server: http }), greet: false, gracefullyShutdown: false });
  server.define('scene-network', NexusWorldRoom);
  await server.listen(0, '127.0.0.1');
  let stopping = false;
  process.on('message', message => {
    if (message !== 'stop' || stopping) return;
    stopping = true;
    // PM2 instrumentation treats explicit IPC disconnect as a crash. Unref only
    // the harness channel: real server handles must still close for exit code 0.
    void server.gracefullyShutdown(false).then(() => { process.channel?.unref(); });
  });
  const address = http.address();
  if (!address || typeof address !== 'object') throw new Error('Missing loopback address');
  process.send!({ port: address.port });
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
  if (process.connected) process.disconnect();
});
