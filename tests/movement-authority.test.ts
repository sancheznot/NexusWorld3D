import assert from 'node:assert/strict';
import test from 'node:test';
import { MovementBudget, resolvePortalTransition } from '../server/validation/worldMovement';
import { getMap } from '../src/lib/game/mapRegistry';

test('movement budget rejects teleports and cannot be multiplied by packet flooding', () => {
  const budget = new MovementBudget(1000);
  let from = { x: 0, y: 1, z: 0 };
  assert.equal(budget.accept(from, { ...from, x: 100 }, 1000), false);
  for (let i = 1; i <= 3; i++) {
    const to = { ...from, x: i };
    assert.equal(budget.accept(from, to, 1000), true);
    from = to;
  }
  for (let i = 0; i < 100; i++) assert.equal(budget.accept(from, { ...from, x: 4 }, 1000), false);
  assert.equal(budget.accept(from, { ...from, x: 13 }, 1200), true);
  assert.equal(budget.accept(from, { ...from, x: 1000 }, 999999), false, 'idle cannot bank unlimited distance');
  assert.equal(budget.accept(from, { ...from, y: NaN }, 999999), false);
});

test('active portals use registered destinations, validate origin and reject admin flags', () => {
  const portal = getMap('exterior')!.portals.find(p => p.targetMap === 'hotel-interior')!;
  const request = { fromMapId: 'exterior', toMapId: portal.targetMap, portalId: portal.id,
    reason: 'portal', position: { x: 99999, y: 99999, z: 99999 } };
  assert.deepEqual(resolvePortalTransition('exterior', portal.position, request), {
    mapId: portal.targetMap, position: portal.targetPosition, rotation: portal.targetRotation,
  });
  for (const bad of [null, {}, { ...request, reason: 'admin' }, { ...request, fromMapId: 'bank' },
    { ...request, portalId: 'unknown' }, { ...request, toMapId: 'unknown' }]) {
    assert.equal(resolvePortalTransition('exterior', portal.position, bad), null);
  }
  assert.equal(resolvePortalTransition('exterior', { x: 100, y: 1, z: 100 }, request), null);
});
