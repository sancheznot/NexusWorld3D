import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSceneDocumentV0_1, safeParseSceneDocumentV0_1, resolveSceneWorldEntities, getSceneInteraction, resolveScenePortal, findResourceNodeOverrideInDocument, nearestSceneInteraction } from '@nexusworld3d/content-schema';
import fixture from '../content/scenes/playable.v0_1.json';
import { createScenePlaySession } from '../src/lib/three/scenePlaySession';

test('scene portal destination is server-owned, checks map/range and works below a transformed group', () => {
  const doc = parseSceneDocumentV0_1(fixture);
  assert.deepEqual(resolveScenePortal(doc, 'exterior', { x: 0, y: 1, z: 0 }, 'portal')?.position, { x: 20, y: 1.05, z: 0 });
  assert.equal(resolveScenePortal(doc, 'exterior', { x: 100, y: 1, z: 0 }, 'portal'), null);
  assert.equal(resolveScenePortal(doc, 'other', { x: 0, y: 1, z: 0 }, 'portal'), null);
  assert.equal(resolveScenePortal(doc, 'exterior', { x: 0, y: 1, z: 0 }, 'missing'), null);
  doc.entities[1].transform.scale = [2, 2, 2];
  doc.entities[2].transform.position = [1, 0, 0];
  const override = findResourceNodeOverrideInDocument(doc, 'exterior_node_quarry_north');
  assert.deepEqual(override?.position, { x: 22, y: 0, z: 0 });
  assert.equal(override?.interactionRadius, 6);
  assert.equal(getSceneInteraction(resolveSceneWorldEntities(doc.entities)[2])?.radius, 6);
});

test('Play uses real scene interactions without touching account inventory or network', () => {
  const session = createScenePlaySession(parseSceneDocumentV0_1(fixture), 'exterior');
  try {
    assert.match(session.interact(10000), /Portal/);
    assert.deepEqual(session.player.position.toArray(), [20, 1.05, 0]);
    assert.match(session.interact(11000), /material_stone_raw: 2/);
    assert.match(session.interact(11001), /Espera/);
    assert.match(session.interact(14500), /material_stone_raw: 4/);
    assert.equal(session.inventory.get('material_stone_raw'), 4);
  } finally { session.dispose(); }
  assert.equal(session.inventory.size, 0);
  assert.equal(session.physics.getWorld().bodies.length, 0);
});

test('invalid interaction components, duplicate resources and oversized world radii are rejected', () => {
  for (const mutate of [
    (d: ReturnType<typeof parseSceneDocumentV0_1>) => { d.entities[0].components[0].props.radius = Infinity; },
    (d: ReturnType<typeof parseSceneDocumentV0_1>) => { d.entities[0].components[1].props.targetPosition = [0, -20, 0]; },
    (d: ReturnType<typeof parseSceneDocumentV0_1>) => { d.entities[2].transform.scale = [2, 1, 2]; },
    (d: ReturnType<typeof parseSceneDocumentV0_1>) => { d.entities.push({ ...structuredClone(d.entities[2]), id: 'duplicate' }); },
    (d: ReturnType<typeof parseSceneDocumentV0_1>) => { d.entities[1].transform.scale = [100, 100, 100]; },
    (d: ReturnType<typeof parseSceneDocumentV0_1>) => { d.entities[2].components = d.entities[2].components.slice(0, 1); },
  ]) { const doc = parseSceneDocumentV0_1(fixture); mutate(doc); assert.equal(safeParseSceneDocumentV0_1(doc).success, false); }
});

test('overlapping scene interactions choose only the nearest zone and filter maps', () => {
  const doc = parseSceneDocumentV0_1(fixture);
  const portal = structuredClone(doc.entities[0]); portal.id = 'closer'; portal.transform.position = [0, 1, 0];
  doc.entities.push(portal);
  const entities = resolveSceneWorldEntities(doc.entities);
  assert.equal(nearestSceneInteraction(entities, 'exterior', { x: 0, y: 1, z: 0 })?.id, 'closer');
  assert.equal(nearestSceneInteraction(entities, 'other', { x: 0, y: 1, z: 0 }), null);
  assert.equal(nearestSceneInteraction(entities, 'exterior', { x: 999, y: 1, z: 0 }), null);
});
