import assert from 'node:assert/strict';
import test from 'node:test';
import { Room, type Client } from 'colyseus';
import { ItemEvents, type WorldItemState } from '../server/modules/ItemEvents';
import { ITEM_SPAWNS } from '../src/constants/items';

test('pickup rejects remote, wrong-map and malformed requests; nearby pickup is single-use', () => {
  class TestRoom extends Room {}
  const room = new TestRoom();
  const handlers = new Map<string, (client: Client, data: unknown) => void>();
  room.onMessage = ((name: string, handler: (client: Client, data: unknown) => void) => {
    handlers.set(name, handler);
  }) as typeof room.onMessage;
  let mapId = 'exterior';
  let position = { x: 1000, y: 0, z: 1000 };
  let grants = 0;
  const items = new ItemEvents(room, () => mapId, () => { grants++; return 1; }, {
    getPlayerPosition: () => position,
    removeItemStackForWorldDrop: () => ({ ok: false }),
  });
  const item: WorldItemState = {
    id: 'test-pickup', mapId: 'exterior', position: { x: 0, y: 0, z: 0 },
    item: ITEM_SPAWNS.exterior[0].item, isCollected: false,
  };
  (items as unknown as { worldItems: Map<string, Map<string, WorldItemState>> }).worldItems
    .set('exterior', new Map([[item.id, item]]));
  const client = { sessionId: 'player', send() {} } as unknown as Client;
  const collect = handlers.get('items:collect')!;
  const request = { mapId: 'exterior', spawnId: item.id };
  try {
    collect(client, request);
    assert.equal(grants, 0, 'remote pickup rejected');
    position = { x: 0, y: 0, z: 0 };
    mapId = 'another-map';
    collect(client, request);
    assert.equal(grants, 0, 'cross-map pickup rejected');
    for (const invalid of [null, {}, { mapId: [], spawnId: item.id }]) {
      assert.doesNotThrow(() => collect(client, invalid));
    }
    mapId = 'exterior';
    collect(client, request);
    collect(client, request);
    assert.equal(grants, 1, 'nearby pickup is granted once');
  } finally { room.clock.clear(); }
});
