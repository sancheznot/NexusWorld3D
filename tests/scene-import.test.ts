import test from 'node:test';
import assert from 'node:assert/strict';
import { importSceneDocument } from '../src/lib/importSceneDocument';
import { sceneModelAssets } from '../src/lib/assets/sceneModelAssets';
import { Quaternion, Euler } from 'three';

test('legacy import maps only registered assets, converts Euler rotations and never guesses colliders', () => {
  const raw = { id: 'legacy', spawnPoint: { x: 1, y: 0, z: 3 }, objects: [{ id: 'door', model: sceneModelAssets[0].url,
    position: { x: 2, y: 0, z: 4 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 2, y: 2, z: 2 }, hasCollision: true }] };
  const before = structuredClone(raw);
  const result = importSceneDocument(raw, sceneModelAssets);
  assert.deepEqual(result.document.entities[0].transform.rotation, new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0)).toArray());
  assert.equal(result.document.spawn?.position[1], 1.05);
  assert.ok(result.warnings.length);
  assert.deepEqual(raw, before);
  assert.deepEqual(result.document.entities[0].components[0].props.colliders, sceneModelAssets[0].colliders);
  assert.throws(() => importSceneDocument(raw, []), /no registrado/);
  assert.throws(() => importSceneDocument(raw, sceneModelAssets.map(asset => ({ ...asset, colliders: [] }))), /no tiene colliders/);
  assert.deepEqual(importSceneDocument(result.document, []).document, result.document);
});
