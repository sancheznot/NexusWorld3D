import assert from 'node:assert/strict';
import test from 'node:test';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import modelFixture from '../content/scenes/models.v0_1.json';
import { uploadGlbFixture } from './helpers/uploadGlbFixture';
import { registerUploadedSceneModel } from '../server/scene/uploadedSceneModels';

if (process.env.NEXUS_RUN_ISOLATED_DB_TESTS !== '1') throw new Error('Integration tests require explicit isolated opt-in');
delete process.env.DATABASE_URL;
for (const key of Object.keys(process.env)) {
  if (/^(REDIS_|UPSTASH_|KV_)/.test(key)) delete process.env[key];
}
process.env.NEXUS_SKIP_AUTO_MIGRATE = '1';
process.env.NEXUS_SCENE_AUTHORING_STAGING_ONLY = '0';
process.env.NEXUS_SCENE_PERSIST_ONLY_STAGING = '0';
process.env.NEXUS_SCENE_PERSIST_ENABLE = '1';
process.env.NEXUS_SCENE_LOAD_PERSISTED = '1';
process.env.NEXUS_SCENE_AUTHORING_SECRET = 'isolated-scene-author-test';

async function startSceneServer(directory: string) {
  const child = fork(fileURLToPath(new URL('./helpers/scene-server.ts', import.meta.url)), {
    execArgv: ['--import', 'tsx'],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    env: {
      PATH: process.env.PATH, NODE_ENV: 'test',
      NEXUS_SCENE_TEST_WORKER: '1', NEXUS_SKIP_AUTO_MIGRATE: '1',
      NEXUS_SCENE_AUTHORING_STAGING_ONLY: '0', NEXUS_SCENE_PERSIST_ONLY_STAGING: '0',
      NEXUS_SCENE_PERSIST_ENABLE: '1', NEXUS_SCENE_LOAD_PERSISTED: '1',
      NEXUS_SCENE_PERSIST_DIR: directory,
      NEXUS_SCENE_AUTHORING_SECRET: 'isolated-scene-author-test',
    },
  });
  let output = '';
  const capture = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-4000); };
  child.stdout!.on('data', capture);
  child.stderr!.on('data', capture);
  const exited = new Promise<number | null>(resolve => child.once('exit', code => resolve(code)));
  const port = await new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill('SIGKILL'); reject(new Error(`Scene server boot timeout: ${output}`)); }, 10000);
    const finish = () => clearTimeout(timeout);
    child.once('error', error => { finish(); reject(error); });
    child.once('exit', code => { finish(); reject(new Error(`Scene server exited ${code}: ${output}`)); });
    child.once('message', message => {
      finish();
      const value = message as { port?: unknown };
      if (typeof value.port !== 'number') { child.kill(); reject(new Error('Invalid scene server port')); }
      else resolve(value.port);
    });
  });
  return {
    port, pid: child.pid,
    async stop() {
      if (child.connected) child.send('stop');
      const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
      try { assert.equal(await exited, 0, `Scene server must exit cleanly: ${output}`); }
      finally { clearTimeout(timeout); }
    },
  };
}

test('scene publish reaches two WebSocket clients and survives a full server process restart', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexus-scene-network-'));
  process.env.NEXUS_SCENE_PERSIST_DIR = directory;
  const { frameworkDefaultWorldId } = await import('../src/lib/frameworkBranding');
  const { Client } = await import('colyseus.js');
  const { PROTOCOL_VERSION, SceneMessages } = await import('../packages/protocol/src');
  let server: Awaited<ReturnType<typeof startSceneServer>> | undefined;
  const document = { schemaVersion: 1, worldId: frameworkDefaultWorldId,
    spawn: { mapId: 'exterior', position: [12, 4, -8], yaw: 0.75 }, entities: [{
    id: 'wall', parentId: null,
    transform: { position: [3, 3, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    components: [{ type: 'nexus:box', props: { size: [0.5, 6, 10], solid: true } }],
  }, ...modelFixture.entities] };
  const waitScene = (room: import('colyseus.js').Room) => new Promise<unknown>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('scene broadcast timeout')), 3000);
    room.onMessage(SceneMessages.AppliedDocumentV0_1, payload => {
      clearTimeout(timeout); resolve(payload.document);
    });
  });
  try {
    const uploaded = await registerUploadedSceneModel(uploadGlbFixture(), 'network-model.glb');
    document.entities.push({ ...structuredClone(modelFixture.entities[0]), id: 'uploaded-doorway',
      components: [{ type: 'nexus:model', props: { ...modelFixture.entities[0].components[0].props, assetId: uploaded.id } }] });
    server = await startSceneServer(directory);
    const client = new Client(`ws://127.0.0.1:${server.port}`);
    const options = { protocolVersion: PROTOCOL_VERSION };
    const author = await client.create('scene-network', { ...options, sceneAuthoringToken: process.env.NEXUS_SCENE_AUTHORING_SECRET });
    author.onMessage('*', () => {});
    const visitor = await client.joinById(author.roomId, options);
    visitor.onMessage('*', () => {});
    const first = waitScene(author);
    const second = waitScene(visitor);
    author.send(SceneMessages.ApplyDocumentV0_1, { document });
    assert.deepEqual(await first, document);
    assert.deepEqual(await second, document);
    const originalRoomId = author.roomId;
    await visitor.leave();
    await author.leave();
    const oldPid = server.pid;
    await server.stop();
    server = undefined;
    server = await startSceneServer(directory);
    assert.notEqual(server.pid, oldPid, 'a different OS process must load the scene');
    const reconnectingClient = new Client(`ws://127.0.0.1:${server.port}`);
    const restored = await reconnectingClient.create('scene-network', options);
    restored.onMessage('*', () => {});
    assert.notEqual(restored.roomId, originalRoomId);
    assert.deepEqual(await waitScene(restored), document, 'restarted process hydrates the persisted document');
    const snapshot = new Promise<{ players: Array<{ id: string; position: { x: number; y: number; z: number }; rotation: { y: number } }> }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('spawn snapshot timeout')), 3000);
      restored.onMessage('map:update', data => { clearTimeout(timeout); resolve(data); });
    });
    restored.send('map:request', { mapId: 'exterior' });
    const player = (await snapshot).players.find(player => player.id === restored.sessionId);
    assert.deepEqual(player?.position, { x: 12, y: 4, z: -8 }, 'new player uses persisted scene spawn after restart');
    assert.equal(player?.rotation.y, 0.75);
    await restored.leave();
  } finally {
    try { await server?.stop(); }
    finally { rmSync(directory, { recursive: true }); }
  }
});
