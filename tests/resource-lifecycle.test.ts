import assert from 'node:assert/strict';
import test from 'node:test';
import type { Client } from 'colyseus';
import { NexusWorldRoom } from '../server/rooms/NexusWorldRoom';
import { TreeChopEvents } from '../server/modules/TreeChopEvents';
import { RockMineEvents } from '../server/modules/RockMineEvents';
import { RpgProgression } from '../server/modules/RpgProgression';
import type { InventoryEvents } from '../resources/inventory/server/InventoryEvents';
import { CHOPPABLE_PROP_TREES } from '../src/constants/choppableTrees';
import { MINEABLE_PROP_ROCKS } from '../src/constants/mineableRocks';
import { WorldMessages } from '@nexusworld3d/protocol';

for (const kind of ['tree', 'rock'] as const) {
  for (const dispose of [false, true]) {
  test(`${kind} respawn ${dispose ? 'stops on disposal' : 'runs in a live room'}`, (t) => {
    t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100_000 });
    const room = new NexusWorldRoom();
    const timers = t.mock.method(room.clock, 'setTimeout');
    const broadcast = t.mock.method(room, 'broadcast', () => {});
    const handlers = new Map<string, (client: Client, data: unknown) => void>();
    room.onMessage = ((name: string, handler: (client: Client, data: unknown) => void) => {
      handlers.set(name, handler);
    }) as typeof room.onMessage;
    const def = kind === 'tree' ? CHOPPABLE_PROP_TREES[0] : MINEABLE_PROP_ROCKS[0];
    const inventory = {
      playerHasAnyChopAxe: () => true, playerHasAnyMinePickaxe: () => true,
      getChopToolCatalogId: () => 'tool_axe', getMineToolCatalogId: () => 'tool_pickaxe',
      addItemFromWorld: () => 1, applyAxeSwingWear() {}, applyPickaxeSwingWear() {},
    } as unknown as InventoryEvents;
    const deps = { inventory, getPlayerMapId: () => def.mapId, getPlayerPosition: () => def.position };
    if (kind === 'tree') new TreeChopEvents(room, deps);
    else new RockMineEvents(room, deps);
    const client = { sessionId: 'test-player', send() {} } as unknown as Client;
    const handler = handlers.get(kind === 'tree' ? WorldMessages.TreeChop : WorldMessages.RockMine)!;
    for (let i = 0; i < def.maxHits; i++) {
      t.mock.timers.tick(600);
      handler(client, kind === 'tree' ? { treeId: def.id } : { rockId: def.id });
    }
    try {
      assert.equal(broadcast.mock.callCount(), 1, 'resource exhausted');
      assert.equal(timers.mock.callCount(), 1);
      const timer = timers.mock.calls[0].result;
      assert.ok(timer);
      if (dispose) room.onDispose();
      t.mock.timers.tick(60_000);
      room.clock.tick();
      assert.equal(broadcast.mock.callCount(), dispose ? 1 : 2);
      assert.equal(timer.active, false);
    } finally { room.clock.clear(); }
  });
  }
}

test('RPG delayed sync is cancelled with its room', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const room = new NexusWorldRoom();
  const timers = t.mock.method(room.clock, 'setTimeout');
  const client = { sessionId: 'test-player', send() {} } as unknown as Client;
  const send = t.mock.method(client, 'send', () => {});
  const progression = new RpgProgression({
    room, getClient: () => client,
    getPlayer: () => ({ level: 1, experience: 0, health: 100, maxHealth: 100 }),
    inventory: { applyCarryingCaps() {} } as unknown as InventoryEvents,
    requestPersist() {}, syncStatePlayer() {},
  });
  try {
    progression.hydrate(client.sessionId, null);
    assert.equal(send.mock.callCount(), 1);
    room.onDispose();
    t.mock.timers.tick(100);
    assert.equal(send.mock.callCount(), 1, 'no sync after room disposal');
    assert.equal(timers.mock.callCount(), 1);
    const timer = timers.mock.calls[0].result;
    assert.ok(timer);
    assert.equal(timer.active, false);
  } finally { room.clock.clear(); }
});
