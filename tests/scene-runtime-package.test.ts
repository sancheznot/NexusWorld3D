import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { createSceneRuntime, mountSceneRuntime, SceneRuntimeCleanupError } from '@nexusworld3d/engine-client';

const scene = () => parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'runtime-test', entities: [
  { id: 'group', parentId: null, transform: { position: [10, 0, 0], rotation: [0, Math.SQRT1_2, 0, Math.SQRT1_2], scale: [2, 2, 2] }, components: [{ type: 'nexus:group', props: {} }] },
  { id: 'model', parentId: 'group', transform: { position: [1, 0, 0], rotation: [0, 0, 0, 1], scale: [2, 1, 1] }, components: [{ type: 'nexus:model', props: { assetId: 'crate', colliders: [{ size: [2, 2, 2], offset: [1, 0, 0] }, { size: [1, 1, 1], offset: [0, 0, 0] }] } }] },
] });

test('packaged runtime composes model offsets and hierarchy without mutating source', () => {
  const document = scene();
  const before = JSON.stringify(document);
  const runtime = createSceneRuntime(document, 'exterior');
  assert.equal(runtime.staticBoxes.length, 2);
  assert.deepEqual(runtime.staticBoxes[0].size, [8, 4, 4]);
  for (const [axis, expected] of [10, 0, -6].entries()) assert.ok(Math.abs(runtime.staticBoxes[0].position[axis] - expected) < 1e-10);
  assert.equal(JSON.stringify(document), before);
  assert.deepEqual(runtime.spawn, { position: [0, 2, 6], yaw: 0 });
  assert.equal(createSceneRuntime(document, 'other').staticBoxes.length, 0);
});

test('runtime adapter cleanup is reverse-order and idempotent', () => {
  const removed: number[] = [];
  let index = 0;
  const dispose = mountSceneRuntime(createSceneRuntime(scene(), 'exterior'), { addStaticBox() {
    const id = index++;
    return () => { removed.push(id); };
  } });
  dispose(); dispose();
  assert.deepEqual(removed, [1, 0]);
});

test('failed collider installation rolls back previously owned bodies', () => {
  let removed = 0, mounted = 0;
  assert.throws(() => mountSceneRuntime(createSceneRuntime(scene(), 'exterior'), { addStaticBox() {
    if (mounted++ === 1) throw new Error('allocation failed');
    return () => { removed++; };
  } }), /allocation failed/);
  assert.equal(removed, 1);
});

test('one failing adapter cleanup does not strand other owned bodies', () => {
  let removed = 0;
  const dispose = mountSceneRuntime(createSceneRuntime(scene(), 'exterior'), { addStaticBox() {
    return () => { removed++; throw new Error('remove failed'); };
  } });
  assert.throws(dispose, (error: unknown) => error instanceof SceneRuntimeCleanupError && error.errors.length === 2);
  assert.equal(removed, 2);
  assert.doesNotThrow(dispose);
});
