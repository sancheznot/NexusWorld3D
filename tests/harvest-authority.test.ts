import assert from 'node:assert/strict';
import test from 'node:test';
import type { Client, Room } from 'colyseus';
import { TreeChopEvents } from '../server/modules/TreeChopEvents';
import { RockMineEvents } from '../server/modules/RockMineEvents';
import type { InventoryEvents } from '../resources/inventory/server/InventoryEvents';
import { CHOPPABLE_PROP_TREES } from '../src/constants/choppableTrees';
import { MINEABLE_PROP_ROCKS } from '../src/constants/mineableRocks';
import { WorldMessages } from '@nexusworld3d/protocol';

for (const kind of ['tree', 'rock'] as const) {
  test(`${kind} harvesting uses finite server pose and same-map reach, not client pose`, (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
    const handlers = new Map<string, (client: Client, data: unknown) => void>();
    const room = { onMessage(name: string, cb: (client: Client, data: unknown) => void) { handlers.set(name, cb); } } as unknown as Room;
    const def = kind === 'tree' ? CHOPPABLE_PROP_TREES[0] : MINEABLE_PROP_ROCKS[0];
    let position = { ...def.position, x: def.position.x + 100 };
    let mapId = def.mapId;
    let grants = 0;
    let wear = 0;
    let xp = 0;
    const inventory = {
      playerHasAnyChopAxe: () => true, playerHasAnyMinePickaxe: () => true,
      getChopToolCatalogId: () => 'tool_axe', getMineToolCatalogId: () => 'tool_pickaxe',
      addItemFromWorld: () => { grants++; return 1; },
      applyAxeSwingWear() { wear++; }, applyPickaxeSwingWear() { wear++; },
    } as unknown as InventoryEvents;
    const deps = { inventory, getPlayerMapId: () => mapId, getPlayerPosition: () => position, awardExperience: () => { xp++; } };
    if (kind === 'tree') new TreeChopEvents(room, deps);
    else new RockMineEvents(room, deps);
    const handler = handlers.get(kind === 'tree' ? WorldMessages.TreeChop : WorldMessages.RockMine)!;
    const client = { sessionId: 'harvester', send() {} } as unknown as Client;
    const hit = () => {
      t.mock.timers.tick(600);
      handler(client, { ...(kind === 'tree' ? { treeId: def.id } : { rockId: def.id }), clientPlayerPos: def.position });
    };
    hit();
    assert.equal(grants, 0, 'forged remote client pose cannot grant materials');
    position = { ...def.position, x: def.position.x + 10 };
    hit();
    assert.equal(grants, 0, 'client pose inside old trust radius cannot extend reach');
    for (const invalid of [NaN, Infinity, -Infinity]) {
      position = { ...def.position, x: invalid };
      hit();
    }
    position = { ...def.position, y: def.position.y + 50 };
    hit();
    position = { ...def.position };
    mapId = 'other-map';
    hit();
    assert.deepEqual([grants, wear, xp], [0, 0, 0]);
    mapId = def.mapId;
    hit();
    assert.deepEqual([grants, wear, xp], [1, 1, 1], 'valid nearby harvest still works');
  });
}
