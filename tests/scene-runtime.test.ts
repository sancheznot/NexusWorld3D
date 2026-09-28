import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSceneDocumentV0_1, safeParseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { CannonPhysics } from '../src/lib/three/cannonPhysics';
import { mountSceneBoxColliders } from '../src/lib/three/sceneBoxColliders';
import { loadContentManifestOrThrow } from '../server/content/loadContentManifest';
import { persistedSceneFilePath, writeSceneDocumentV0_1ToDisk, tryLoadSceneDocumentV0_1FromDisk } from '../server/scene/persistSceneDocumentV0_1';
import { NexusWorldRoom } from '../server/rooms/NexusWorldRoom';
import { issueWorldTicket } from '../src/lib/auth/worldIdentity';
import type { Client } from 'colyseus';
import { saveWorldAccess } from '../server/scene/publicWorlds';

function scene() {
  return parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'scene-test', entities: [{
    id: 'wall', parentId: null,
    transform: { position: [3, 3, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    components: [{ type: 'nexus:box', props: { size: [0.5, 6, 10], color: '#123456', solid: true, mapId: 'exterior' } }],
  }] });
}

test('world IDs cannot overwrite another scene through filename normalization', () => {
  loadContentManifestOrThrow();
  const directory = mkdtempSync(join(tmpdir(), 'nexus-scene-isolation-'));
  const previous = process.env.NEXUS_SCENE_PERSIST_DIR;
  process.env.NEXUS_SCENE_PERSIST_DIR = directory;
  try {
    const ids = ['world/a', 'world_a', ' world_a ', 'x'.repeat(121), 'x'.repeat(122)];
    assert.equal(new Set(ids.map(persistedSceneFilePath)).size, ids.length);
    for (const worldId of ids) writeSceneDocumentV0_1ToDisk({ ...scene(), worldId });
    for (const worldId of ids) assert.equal(tryLoadSceneDocumentV0_1FromDisk(worldId)?.worldId, worldId);
  } finally {
    if (previous === undefined) delete process.env.NEXUS_SCENE_PERSIST_DIR;
    else process.env.NEXUS_SCENE_PERSIST_DIR = previous;
    rmSync(directory, { recursive: true });
  }
});

test('legacy scene files load only for the exact world and migrate without deleting the original', () => {
  loadContentManifestOrThrow();
  const directory = mkdtempSync(join(tmpdir(), 'nexus-scene-legacy-'));
  const previous = process.env.NEXUS_SCENE_PERSIST_DIR;
  process.env.NEXUS_SCENE_PERSIST_DIR = directory;
  try {
    const doc = { ...scene(), worldId: 'world/a' };
    const legacy = join(directory, 'world_a.v0_1.json');
    writeFileSync(legacy, JSON.stringify(doc));
    assert.deepEqual(tryLoadSceneDocumentV0_1FromDisk('world/a'), doc);
    assert.equal(tryLoadSceneDocumentV0_1FromDisk('world_a'), null);
    writeSceneDocumentV0_1ToDisk(doc);
    assert.ok(existsSync(legacy));
    assert.ok(existsSync(persistedSceneFilePath(doc.worldId)));
    writeFileSync(persistedSceneFilePath(doc.worldId), 'invalid JSON');
    assert.equal(tryLoadSceneDocumentV0_1FromDisk(doc.worldId), null, 'corrupt current file cannot resurrect old data');
  } finally {
    if (previous === undefined) delete process.env.NEXUS_SCENE_PERSIST_DIR;
    else process.env.NEXUS_SCENE_PERSIST_DIR = previous;
    rmSync(directory, { recursive: true });
  }
});

test('authenticated worlds load only their own scene after the room identity is verified', () => {
  loadContentManifestOrThrow();
  const directory = mkdtempSync(join(tmpdir(), 'nexus-scene-auth-'));
  const values = { NEXUS_SCENE_PERSIST_DIR: directory, NEXUS_SCENE_LOAD_PERSISTED: '1',
    NEXUS_GAME_AUTH_SECRET: 'isolated-world-scene-secret-at-least-32-bytes' };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    for (const worldId of ['world-A', 'world-B']) {
      writeSceneDocumentV0_1ToDisk({ ...scene(), worldId });
      saveWorldAccess({ worldId, name: worldId, public: true });
    }
    for (const worldId of ['world-A', 'world-B']) {
      const room = new NexusWorldRoom();
      room.roomName = 'world-scene-auth';
      const identity = { kind: 'account' as const, subject: 'test-account', displayName: 'Test', worldId };
      const ticket = issueWorldTicket(identity, room.roomName, values.NEXUS_GAME_AUTH_SECRET);
      room.onAuth({ sessionId: worldId } as Client, { worldId, gameTicket: ticket });
      const loaded = (room as unknown as { sceneDocumentV0_1: { worldId: string } }).sceneDocumentV0_1;
      assert.equal(loaded.worldId, worldId);
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    rmSync(directory, { recursive: true });
  }
});

test('scene rejects cyclic ancestry, non-finite transforms and ambiguous boxes', () => {
  for (const mutate of [
    (doc: ReturnType<typeof scene>) => { doc.entities[0].parentId = 'wall'; },
    (doc: ReturnType<typeof scene>) => { doc.entities[0].transform.position[0] = Infinity; },
    (doc: ReturnType<typeof scene>) => { doc.entities[0].transform.rotation = [0, 0, 0, 0]; },
    (doc: ReturnType<typeof scene>) => { doc.entities[0].components[0].props.size = [-1, 2, 3]; },
    (doc: ReturnType<typeof scene>) => { doc.entities[0].components.push(doc.entities[0].components[0]); },
    (doc: ReturnType<typeof scene>) => { doc.entities[0].transform.scale[0] = 0; },
  ]) {
    const doc = scene(); mutate(doc);
    assert.equal(safeParseSceneDocumentV0_1(doc).success, false);
  }
  const doc = scene();
  doc.entities[0].components = [];
  doc.entities.push({ ...structuredClone(doc.entities[0]), id: 'other', parentId: 'wall' });
  doc.entities[0].parentId = 'other';
  assert.equal(safeParseSceneDocumentV0_1(doc).success, false);
});

test('scene boxes filter maps, honor solid=false and release bodies over 20 replacements', () => {
  const physics = new CannonPhysics();
  physics.createGround();
  try {
    for (let cycle = 0; cycle < 20; cycle++) {
      const dispose = mountSceneBoxColliders(physics, scene(), 'exterior');
      assert.equal(physics.getWorld().bodies.length, 2);
      dispose(); dispose();
      assert.equal(physics.getWorld().bodies.length, 1);
    }
    mountSceneBoxColliders(physics, scene(), 'hotel-interior')();
    const visualOnly = scene(); visualOnly.entities[0].components[0].props.solid = false;
    mountSceneBoxColliders(physics, visualOnly, 'exterior')();
    assert.equal(physics.getWorld().bodies.length, 1);
  } finally { physics.dispose(); }
});

test('persisted scene reconstructs the same solid wall in two independent runtimes', () => {
  loadContentManifestOrThrow();
  const directory = mkdtempSync(join(tmpdir(), 'nexus-scene-test-'));
  const previous = process.env.NEXUS_SCENE_PERSIST_DIR;
  process.env.NEXUS_SCENE_PERSIST_DIR = directory;
  try {
    writeSceneDocumentV0_1ToDisk(scene());
    const loaded = tryLoadSceneDocumentV0_1FromDisk('scene-test');
    assert.deepEqual(loaded, scene());
    for (const fps of [30, 144]) {
      const physics = new CannonPhysics();
      physics.createGround();
      const player = physics.createPlayer({ x: 0, y: 1, z: 0 });
      const cleanup = mountSceneBoxColliders(physics, loaded!, 'exterior');
      try {
        physics.setMovementInput({ x: 1, z: 0, isRunning: true, stamina: 100 });
        for (let frame = 0; frame < fps * 3; frame++) physics.update(1 / fps);
        assert.ok(player.position.x > 1 && player.position.x < 2.75);
      } finally { cleanup(); physics.dispose(); }
    }
  } finally {
    if (previous === undefined) delete process.env.NEXUS_SCENE_PERSIST_DIR;
    else process.env.NEXUS_SCENE_PERSIST_DIR = previous;
    rmSync(directory, { recursive: true });
  }
});

test('failed persistence leaves the previous live scene intact and sends no success broadcast', () => {
  loadContentManifestOrThrow();
  const room = new NexusWorldRoom();
  const internal = room as unknown as {
    sceneDocumentV0_1: unknown;
    maybePersistSceneDocument(): boolean;
    applySceneAuthoringFromRegistry(raw: unknown): { ok: boolean; error?: string };
    mergeSceneEntitiesFromRegistry(raw: unknown): { ok: boolean; error?: string };
  };
  const before = scene();
  internal.sceneDocumentV0_1 = before;
  internal.maybePersistSceneDocument = () => false;
  let broadcasts = 0;
  room.broadcast = (() => { broadcasts++; }) as typeof room.broadcast;
  assert.equal(internal.applySceneAuthoringFromRegistry(scene()).error, 'scene_persist_failed');
  assert.equal(internal.mergeSceneEntitiesFromRegistry({ entities: scene().entities }).error, 'scene_persist_failed');
  assert.equal(internal.sceneDocumentV0_1, before);
  assert.equal(broadcasts, 0);
  assert.equal(internal.mergeSceneEntitiesFromRegistry(null).ok, false);
});
