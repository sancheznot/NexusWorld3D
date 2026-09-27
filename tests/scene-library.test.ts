import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { executeSceneLibraryCommand, sceneRevision, SceneLibraryError } from '../server/scene/sceneLibrary';
import { loadContentManifestOrThrow } from '../server/content/loadContentManifest';
import { createScenePlaySession } from '../src/lib/three/scenePlaySession';
import { createServer } from 'node:http';
import { tryHandleGameMonitorRequest } from '../server/metrics/gameMonitorHttp';

const document = () => parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'library-test', entities: [{
  id: 'box', parentId: null, transform: { position: [3, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  components: [{ type: 'nexus:box', props: { size: [2, 2, 2], solid: true, color: '#123456', mapId: 'exterior' } }],
}] });

function isolated(run: () => void) {
  loadContentManifestOrThrow();
  const directory = mkdtempSync(join(tmpdir(), 'nexus-library-'));
  const previous = process.env.NEXUS_SCENE_PERSIST_DIR;
  process.env.NEXUS_SCENE_PERSIST_DIR = directory;
  try { run(); } finally {
    if (previous === undefined) delete process.env.NEXUS_SCENE_PERSIST_DIR;
    else process.env.NEXUS_SCENE_PERSIST_DIR = previous;
    rmSync(directory, { recursive: true });
  }
}

test('draft, publication and restored revisions remain independent and durable', () => isolated(() => {
  const first = document();
  const worldId = first.worldId;
  const draft = executeSceneLibraryCommand({ action: 'save-draft', worldId, document: first, expectedRevision: null });
  assert.equal(draft.published, null);
  assert.equal(draft.draftRevision, sceneRevision(first));
  const published = executeSceneLibraryCommand({ action: 'publish', worldId, document: first, expectedRevision: null });
  const changed = document(); changed.entities[0].transform.position[0] = 12;
  const second = executeSceneLibraryCommand({ action: 'publish', worldId, document: changed, expectedRevision: published.publishedRevision });
  assert.equal(second.revisions.length, 2);
  assert.deepEqual(second.draft, first);
  assert.deepEqual(second.published, changed);
  const restored = executeSceneLibraryCommand({ action: 'restore', worldId, revision: published.publishedRevision, expectedRevision: second.publishedRevision });
  assert.deepEqual(restored.published, first);
  assert.deepEqual(executeSceneLibraryCommand({ action: 'read', worldId }), restored);
}));

test('stale revisions and foreign world documents cannot overwrite saved content', () => isolated(() => {
  const doc = document();
  const worldId = doc.worldId;
  const saved = executeSceneLibraryCommand({ action: 'save-draft', worldId, document: doc, expectedRevision: null });
  assert.throws(() => executeSceneLibraryCommand({ action: 'save-draft', worldId, document: doc, expectedRevision: null }),
    (error: unknown) => error instanceof SceneLibraryError && error.status === 409);
  assert.throws(() => executeSceneLibraryCommand({ action: 'publish', worldId, document: { ...doc, worldId: 'foreign' }, expectedRevision: null }), /scene_world_mismatch/);
  assert.throws(() => executeSceneLibraryCommand({ action: 'restore', worldId, revision: '../draft', expectedRevision: null }), /invalid_revision/);
  assert.throws(() => executeSceneLibraryCommand({ action: 'publish', worldId, document: doc }), /expected_revision_required/);
  assert.deepEqual(executeSceneLibraryCommand({ action: 'read', worldId }), saved);
  assert.equal(executeSceneLibraryCommand({ action: 'read', worldId: 'foreign' }).draft, null);
}));

test('20 editor Play/Stop sessions release all bodies without modifying the document', () => {
  const doc = document();
  const before = structuredClone(doc);
  for (let i = 0; i < 20; i++) {
    const session = createScenePlaySession(doc, 'exterior');
    assert.equal(session.physics.getWorld().bodies.length, 3);
    session.physics.setMovementInput({ x: 1, z: 0, isRunning: false, stamina: 100 });
    session.physics.update(1 / 30);
    session.dispose(); session.dispose();
    assert.equal(session.physics.getWorld().bodies.length, 0);
  }
  assert.deepEqual(doc, before);
});

test('library HTTP boundary rejects anonymous callers and returns conflicts without overwriting', async () => {
  loadContentManifestOrThrow();
  const directory = mkdtempSync(join(tmpdir(), 'nexus-library-http-'));
  const previous = { dir: process.env.NEXUS_SCENE_PERSIST_DIR, secret: process.env.NEXUS_GAME_MONITOR_SECRET };
  process.env.NEXUS_SCENE_PERSIST_DIR = directory;
  process.env.NEXUS_GAME_MONITOR_SECRET = 'isolated-library-test';
  const server = createServer((request, response) => {
    void tryHandleGameMonitorRequest(request, response).then(handled => {
      if (!handled) { response.writeHead(404); response.end(); }
    });
  });
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/__nexus-internal/v1/scene-library-v1`;
    const body = JSON.stringify({ action: 'save-draft', worldId: 'library-test', document: document(), expectedRevision: null });
    assert.equal((await fetch(url, { method: 'POST', body })).status, 401);
    const headers = { Authorization: 'Bearer isolated-library-test', 'Content-Type': 'application/json' };
    assert.equal((await fetch(url, { method: 'POST', headers, body })).status, 200);
    assert.equal((await fetch(url, { method: 'POST', headers, body })).status, 409);
    assert.deepEqual(executeSceneLibraryCommand({ action: 'read', worldId: 'library-test' }).draft, document());
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (previous.dir === undefined) delete process.env.NEXUS_SCENE_PERSIST_DIR; else process.env.NEXUS_SCENE_PERSIST_DIR = previous.dir;
    if (previous.secret === undefined) delete process.env.NEXUS_GAME_MONITOR_SECRET; else process.env.NEXUS_GAME_MONITOR_SECRET = previous.secret;
    rmSync(directory, { recursive: true });
  }
});
