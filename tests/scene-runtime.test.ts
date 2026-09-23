import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSceneDocumentV0_1, safeParseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { CannonPhysics } from '../src/lib/three/cannonPhysics';
import { mountSceneBoxColliders } from '../src/lib/three/sceneBoxColliders';
import { loadContentManifestOrThrow } from '../server/content/loadContentManifest';
import { writeSceneDocumentV0_1ToDisk, tryLoadSceneDocumentV0_1FromDisk } from '../server/scene/persistSceneDocumentV0_1';
import { NexusWorldRoom } from '../server/rooms/NexusWorldRoom';

function scene() {
  return parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'scene-test', entities: [{
    id: 'wall', parentId: null,
    transform: { position: [3, 3, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    components: [{ type: 'nexus:box', props: { size: [0.5, 6, 10], color: '#123456', solid: true, mapId: 'exterior' } }],
  }] });
}

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
