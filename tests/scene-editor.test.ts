import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { createSceneEditorHistory, sceneEditorHistoryReducer as reduce, SCENE_HISTORY_LIMIT } from '../src/lib/sceneEditorHistory';
import { sceneRotationDegrees, sceneRotationQuaternion, updateSceneTransform } from '../src/lib/sceneEditorTransforms';
import { Quaternion } from 'three';

function scene() {
  return parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'editor-test', entities: [{
    id: 'box', parentId: null, transform: { position: [3, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    components: [{ type: 'nexus:box', props: { size: [2, 2, 2], solid: true } }],
  }] });
}

test('undo deletion restores both the entity and selection; redo deletes both', () => {
  const original = createSceneEditorHistory(scene());
  const removed = reduce(original, { type: 'edit', update: document => ({ ...document, entities: [] }) });
  assert.equal(removed.present.selectedId, null);
  const undone = reduce(removed, { type: 'undo' });
  assert.deepEqual(undone.present, original.present);
  assert.deepEqual(reduce(undone, { type: 'redo' }).present, removed.present);
  assert.equal(original.present.document.entities.length, 1);
});

test('selection does not add history and new edits after undo discard the redo branch', () => {
  const initial = createSceneEditorHistory(scene());
  let state = reduce(initial, { type: 'select', id: null });
  assert.equal(state.past.length, 0);
  state = reduce(state, { type: 'edit', update: document => updateSceneTransform(document, 'box', { position: [9, 1, 0] }) });
  state = reduce(state, { type: 'undo' });
  assert.equal(state.future.length, 1);
  const unchanged = reduce(state, { type: 'edit', update: structuredClone(state.present.document) });
  assert.equal(unchanged, state, 'equal documents preserve redo');
  state = reduce(state, { type: 'edit', update: document => updateSceneTransform(document, 'box', { scale: [2, 1, 1] }) });
  assert.equal(state.future.length, 0);
  assert.equal(reduce(state, { type: 'redo' }), state);
});

test('history is capped at 50 edits and replacing the source clears both stacks', () => {
  let state = createSceneEditorHistory(scene());
  for (let i = 0; i < 80; i++) state = reduce(state, { type: 'edit', update: document => updateSceneTransform(document, 'box', { position: [i + 10, 1, 0] }) });
  assert.equal(state.past.length, SCENE_HISTORY_LIMIT);
  for (let i = 0; i < 50; i++) state = reduce(state, { type: 'undo' });
  assert.equal(state.future.length, 50);
  assert.equal(reduce(state, { type: 'undo' }), state);
  const next = scene(); next.worldId = 'another-world';
  state = reduce(state, { type: 'replace', document: next });
  assert.equal(state.past.length + state.future.length, 0);
  next.entities.splice(0);
  assert.equal(state.present.document.entities.length, 1, 'initial source is detached');
});

test('loading a saved document remains undoable without mutating the original', () => {
  const original = scene();
  let state = createSceneEditorHistory(original);
  state = reduce(state, { type: 'edit', update: { ...original, entities: [] } });
  assert.deepEqual(reduce(state, { type: 'undo' }).present.document, original);
  assert.equal(original.entities.length, 1);
});

test('rotation degrees round-trip as equivalent normalized quaternions, including gimbal lock', () => {
  for (const degrees of [[25, 45, -70], [0, 90, 0], [0, -90, 0], [180, 180, 180], [360, 0, -360]] as [number, number, number][]) {
    const rotation = sceneRotationQuaternion(degrees);
    assert.ok(Math.abs(Math.hypot(...rotation) - 1) < 1e-12);
    const roundTrip = sceneRotationQuaternion(sceneRotationDegrees(rotation));
    assert.ok(Math.abs(new Quaternion(...rotation).dot(new Quaternion(...roundTrip))) > 0.999999);
    assert.doesNotThrow(() => updateSceneTransform(scene(), 'box', { rotation }));
  }
  assert.throws(() => sceneRotationQuaternion([NaN, 0, 0]), /no finita/);
});

test('transform edits reject invalid dimensions and leave the source document intact', () => {
  const doc = scene();
  for (const patch of [{ scale: [0, 1, 1] }, { scale: [501, 1, 1] }, { position: [1e6 + 1, 0, 0] }, { position: [Infinity, 0, 0] }]) {
    assert.throws(() => updateSceneTransform(doc, 'box', patch as Parameters<typeof updateSceneTransform>[2]));
  }
  const updated = updateSceneTransform(doc, 'box', { scale: [500, 1, 1], rotation: sceneRotationQuaternion([0, 45, 0]) });
  assert.equal(updated.entities[0].transform.scale[0], 500);
  assert.deepEqual(doc, scene());
});
