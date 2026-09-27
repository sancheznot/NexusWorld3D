import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { createScenePlaySession } from '../src/lib/three/scenePlaySession';
import { createSceneEditorHistory, sceneEditorHistoryReducer } from '../src/lib/sceneEditorHistory';

const scene = { schemaVersion: 1, worldId: 'spawn-test', entities: [] };
const spawn = { mapId: 'exterior', position: [12, 4, -8], yaw: 0.75 };

test('scene spawn is optional, bounded and restricted to supported maps', () => {
  assert.equal(parseSceneDocumentV0_1(scene).spawn, undefined);
  assert.deepEqual(parseSceneDocumentV0_1({ ...scene, spawn }).spawn, spawn);
  for (const invalid of [null, { ...spawn, mapId: 'unknown' }, { ...spawn, position: [0, 0, 0] },
    { ...spawn, position: [Infinity, 2, 0] }, { ...spawn, position: [1e6 + 1, 2, 0] },
    { ...spawn, yaw: NaN }, { ...spawn, yaw: 7 }, { ...spawn, yaw: undefined }]) {
    assert.throws(() => parseSceneDocumentV0_1({ ...scene, spawn: invalid }));
  }
});

test('Play uses exact spawn position and heading; old scenes retain preview defaults', () => {
  const authored = createScenePlaySession(parseSceneDocumentV0_1({ ...scene, spawn }), 'exterior');
  const legacy = createScenePlaySession(parseSceneDocumentV0_1(scene), 'exterior');
  try {
    assert.deepEqual(authored.physics.getPlayerPosition(), { x: 12, y: 4, z: -8 });
    assert.ok(Math.abs(authored.player.quaternion.y - Math.sin(0.75 / 2)) < 1e-12);
    assert.deepEqual(legacy.physics.getPlayerPosition(), { x: 0, y: 2, z: 6 });
  } finally { authored.dispose(); legacy.dispose(); }
});

test('enabling and removing scene spawn participates in undo and redo', () => {
  let state = createSceneEditorHistory(parseSceneDocumentV0_1(scene));
  state = sceneEditorHistoryReducer(state, { type: 'edit', update: parseSceneDocumentV0_1({ ...scene, spawn }) });
  state = sceneEditorHistoryReducer(state, { type: 'undo' });
  assert.equal(state.present.document.spawn, undefined);
  state = sceneEditorHistoryReducer(state, { type: 'redo' });
  assert.deepEqual(state.present.document.spawn, spawn);
});
