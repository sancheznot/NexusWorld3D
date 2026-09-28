import assert from 'node:assert/strict';
import test from 'node:test';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { Box } from 'cannon-es';
import { parseSceneDocumentV0_1, resolveSceneWorldEntities, safeParseSceneDocumentV0_1,
  type SceneEntityV0_1 } from '@nexusworld3d/content-schema';
import { createSceneGroup, duplicateSceneSubtree, removeSceneSubtree, reparentSceneEntity } from '../src/lib/sceneEditorHierarchy';
import { sceneRotationQuaternion, updateSceneTransform } from '../src/lib/sceneEditorTransforms';
import { createSceneEditorHistory, sceneEditorHistoryReducer as reduce } from '../src/lib/sceneEditorHistory';
import { CannonPhysics } from '../src/lib/three/cannonPhysics';
import { mountSceneBoxColliders } from '../src/lib/three/sceneBoxColliders';
import { loadContentManifestOrThrow } from '../server/content/loadContentManifest';
import { validateSceneDocumentSemanticsV0_1 } from '../server/scene/validateSceneDocumentSemanticsV0_1';

function group(id: string, parentId: string | null = null): SceneEntityV0_1 {
  return { id, parentId, transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    components: [{ type: 'nexus:group', props: {} }] };
}
function fixture() {
  const root = group('root'), nested = group('nested', 'root');
  root.transform = { position: [5, 2, -7], rotation: sceneRotationQuaternion([20, 45, 10]), scale: [2, 2, 2] };
  nested.transform = { position: [-1, 3, 2], rotation: sceneRotationQuaternion([-30, 10, 35]), scale: [0.5, 0.5, 0.5] };
  const box: SceneEntityV0_1 = { id: 'box', parentId: 'nested',
    transform: { position: [3, 2, 1], rotation: sceneRotationQuaternion([15, -20, 10]), scale: [2, 1, 3] },
    components: [{ type: 'nexus:box', props: { size: [2, 4, 1], solid: true } }] };
  const model: SceneEntityV0_1 = { ...structuredClone(box), id: 'model', components: [{ type: 'nexus:model',
    props: { assetId: 'demo-doorway', colliders: [{ size: [1, 2, 3], offset: [2, -1, 0.5] }] } }] };
  return parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'hierarchy', entities: [box, model, nested, root] });
}
function matrix(entity: SceneEntityV0_1) {
  return new Matrix4().compose(new Vector3(...entity.transform.position), new Quaternion(...entity.transform.rotation).normalize(), new Vector3(...entity.transform.scale));
}
function near(a: number[], b: number[]) {
  assert.equal(a.length, b.length);
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-8, `${v} != ${b[i]}`));
}

test('nested world transforms match independent Three.js matrices regardless of entity order', () => {
  const doc = fixture(), original = structuredClone(doc);
  const [box, , nested, root] = doc.entities;
  const expected = matrix(root).multiply(matrix(nested)).multiply(matrix(box));
  const resolved = resolveSceneWorldEntities(doc.entities);
  near(matrix(resolved[0]).elements, expected.elements);
  near(matrix(resolveSceneWorldEntities([...doc.entities].reverse()).find(e => e.id === box.id)!).elements, expected.elements);
  assert.deepEqual(doc, original, 'resolution cannot rewrite local transforms');
  loadContentManifestOrThrow();
  assert.deepEqual(validateSceneDocumentSemanticsV0_1(doc), { ok: true });
});

test('group schema rejects shear, bad parents, mixed components and world-space overflow', () => {
  for (const mutate of [
    (d: ReturnType<typeof fixture>) => { d.entities[3].transform.scale = [2, 3, 2]; },
    (d: ReturnType<typeof fixture>) => { d.entities[3].transform.scale = [-1, -1, -1]; },
    (d: ReturnType<typeof fixture>) => { d.entities[0].parentId = 'model'; },
    (d: ReturnType<typeof fixture>) => { d.entities[3].parentId = 'nested'; },
    (d: ReturnType<typeof fixture>) => { d.entities[0].parentId = 'missing'; },
    (d: ReturnType<typeof fixture>) => { d.entities[3].components.push(d.entities[3].components[0]); },
    (d: ReturnType<typeof fixture>) => { d.entities[3].components[0].props = { mapId: 'exterior' }; },
    (d: ReturnType<typeof fixture>) => { d.entities[0].components = [{ type: 'nexus:resourceNode', props: { nodeId: 'x' } }]; },
    (d: ReturnType<typeof fixture>) => { d.entities[3].transform.scale = [1000, 1000, 1000]; },
    (d: ReturnType<typeof fixture>) => { d.entities[0].transform.position = [1e6, 1e6, 1e6]; },
  ]) {
    const doc = fixture(); mutate(doc);
    assert.equal(safeParseSceneDocumentV0_1(doc).success, false);
  }
});

test('hierarchy caps depth at 64 in either input order and cannot overflow recursion', () => {
  const entities = Array.from({ length: 64 }, (_, i) => group(`g${i}`, i ? `g${i - 1}` : null));
  const doc = { schemaVersion: 1, worldId: 'depth', entities };
  assert.equal(safeParseSceneDocumentV0_1(doc).success, true);
  entities.push(group('g64', 'g63'));
  assert.equal(safeParseSceneDocumentV0_1(doc).success, false);
  assert.equal(safeParseSceneDocumentV0_1({ ...doc, entities: [...entities].reverse() }).success, false);
  assert.throws(() => resolveSceneWorldEntities([group('a', 'b'), group('b', 'a')]), /cycle/);
});

test('reparenting groups preserves every descendant world pose; root detach also preserves pose', () => {
  const doc = fixture();
  const target = group('target'); target.transform = { position: [-8, 3, 5], rotation: sceneRotationQuaternion([40, -10, 60]), scale: [4, 4, 4] };
  doc.entities.push(target);
  const before = resolveSceneWorldEntities(doc.entities);
  const moved = reparentSceneEntity(doc, 'nested', 'target');
  for (const entity of resolveSceneWorldEntities(moved.entities)) near(matrix(entity).elements, matrix(before.find(e => e.id === entity.id)!).elements);
  const detached = reparentSceneEntity(moved, 'nested', null);
  for (const entity of resolveSceneWorldEntities(detached.entities)) near(matrix(entity).elements, matrix(before.find(e => e.id === entity.id)!).elements);
  assert.throws(() => reparentSceneEntity(doc, 'root', 'nested'));
  assert.throws(() => reparentSceneEntity(doc, 'box', 'model'));
  assert.equal(reparentSceneEntity(doc, 'box', 'nested'), doc);
});

test('subtree duplication remaps internal parents and deletion is a single undoable edit', () => {
  const doc = fixture(); let next = 0;
  const duplicated = duplicateSceneSubtree(doc, 'nested', () => `copy-${next++}`);
  const copy = duplicated.document.entities.find(e => e.id === duplicated.selectedId)!;
  assert.equal(copy.parentId, 'root');
  assert.equal(duplicated.document.entities.filter(e => e.parentId === copy.id).length, 2);
  assert.equal(doc.entities.length, 4);
  const state = createSceneEditorHistory(duplicated.document);
  const selected = reduce(state, { type: 'select', id: copy.id });
  const removed = reduce(selected, { type: 'edit', update: removeSceneSubtree(duplicated.document, copy.id) });
  assert.equal(removed.present.selectedId, null);
  assert.deepEqual(removed.present.document, doc);
  assert.deepEqual(reduce(removed, { type: 'undo' }).present, selected.present);
  assert.deepEqual(reduce(reduce(removed, { type: 'undo' }), { type: 'redo' }).present, removed.present);
  assert.equal(createSceneGroup(doc, 'new').entities.length, 5);
  assert.throws(() => createSceneGroup(doc, 'root'));
  assert.throws(() => updateSceneTransform(doc, 'root', { scale: [1000, 1000, 1000] }));
});

test('nested box and model colliders match world visuals, including rotated/scaled model offsets', () => {
  const doc = fixture(), physics = new CannonPhysics();
  try {
    const dispose = mountSceneBoxColliders(physics, doc, 'exterior');
    const world = resolveSceneWorldEntities(doc.entities);
    const bodies = physics.getWorld().bodies;
    assert.equal(bodies.length, 2, 'groups do not create bodies');
    near(bodies[0].position.toArray(), world[0].transform.position);
    near(bodies[0].quaternion.toArray(), world[0].transform.rotation);
    near((bodies[0].shapes[0] as Box).halfExtents.toArray(), [2, 2, 1.5]);
    near(bodies[1].position.toArray(), new Vector3(2, -1, 0.5).applyMatrix4(matrix(world[1])).toArray());
    dispose(); dispose();
    assert.equal(physics.getWorld().bodies.length, 0);
    mountSceneBoxColliders(physics, doc, 'other-map')();
    assert.equal(physics.getWorld().bodies.length, 0);
  } finally { physics.dispose(); }
});

test('rotated parent wall blocks walking consistently at 30 and 144 FPS', () => {
  const root = group('root'); root.transform.position = [3, 0, 0]; root.transform.rotation = sceneRotationQuaternion([0, 90, 0]);
  const doc = parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'wall', entities: [root, {
    id: 'wall', parentId: 'root', transform: { position: [0, 3, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    components: [{ type: 'nexus:box', props: { size: [10, 6, 0.5], solid: true } }],
  }] });
  for (const fps of [30, 144]) {
    const physics = new CannonPhysics(); physics.createGround();
    const player = physics.createPlayer({ x: 0, y: 1, z: 0 });
    const dispose = mountSceneBoxColliders(physics, doc, 'exterior');
    try {
      physics.setMovementInput({ x: 1, z: 0, isRunning: true, stamina: 100 });
      for (let frame = 0; frame < fps * 3; frame++) physics.update(1 / fps);
      assert.ok(player.position.x > 1 && player.position.x < 2.75);
    } finally { dispose(); physics.dispose(); }
  }
});
