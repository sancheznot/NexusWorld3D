import assert from 'node:assert/strict';
import test from 'node:test';
import type { Room, Client } from 'colyseus';
import { createWorldRegistries, createResourceNodeRegistry, createItemEffectRegistry, createWorldToolRegistry,
  registerResourceNode, attachGenericWorldToolRouter, type ResourceNodeRegistration } from '@nexusworld3d/engine-server';
import { WorldMessages, InventoryMessages } from '@nexusworld3d/protocol';
import { NexusWorldRoom } from '../server/rooms/NexusWorldRoom';
import { InventoryEvents } from '../resources/inventory/server/InventoryEvents';
import { getWorldResourceNodeById } from '../src/constants/worldResourceNodes';

const node = (id = 'test:node'): ResourceNodeRegistration => ({ id, mapId: 'exterior', position: { x: 1, y: 2, z: 3 }, radius: 2, grants: [{ itemId: 'stone', quantity: 1 }] });

test('resource registries deep-copy inputs, outputs and forks; unregister owns only its entry', () => {
  const source = node();
  const a = createResourceNodeRegistry();
  const remove = a.registerResourceNode(source);
  source.position.x = 999; source.grants[0].quantity = 999;
  const b = a.fork();
  const result = a.getRegisteredResourceNodeById(source.id)!;
  result.position.x = 888; result.grants[0].quantity = 888;
  assert.equal(b.getRegisteredResourceNodeById(source.id)?.position.x, 1);
  assert.equal(a.getRegisteredResourceNodeById(source.id)?.grants[0].quantity, 1);
  const duplicate = a.registerResourceNode(node(' test:node '));
  duplicate();
  assert.equal(a.getRegisteredResourceNodeById(source.id)?.radius, 2);
  a.clearResourceNodeRegistry();
  a.registerResourceNode({ ...node(), radius: 7 });
  remove(); remove();
  assert.equal(a.getRegisteredResourceNodeById(source.id)?.radius, 7);
  a.clearResourceNodeRegistry();
  assert.equal(b.getResourceNodeRegistrations().length, 1);
});

test('effect registrations have independent ownership even for repeated callbacks', () => {
  const a = createItemEffectRegistry();
  const effect = () => {};
  const remove = a.registerItemEffect(' apple ', effect);
  a.registerItemEffect('apple', effect);
  const b = a.fork();
  remove(); remove();
  assert.equal(a.getItemConsumeEffects('apple').length, 1);
  assert.equal(b.getItemConsumeEffects('apple').length, 2);
  a.getItemConsumeEffects('apple').length = 0;
  assert.equal(a.getItemConsumeEffects('apple').length, 1);
  a.clearItemEffectRegistry(); a.registerItemEffect('apple', effect); remove();
  assert.equal(a.getItemConsumeEffects('apple').length, 1);
});

test('tool registries isolate metadata and handlers and never expose callbacks in descriptors', () => {
  const a = createWorldToolRegistry(), b = createWorldToolRegistry();
  const itemIds = ['pick'];
  const hint = { key: 'kind', value: 'rock' };
  const first = () => {}, second = () => {};
  const remove = a.registerWorldTool({ id: 'mine', itemIds, clientTargetUserData: hint, serverOnUse: first });
  b.registerWorldTool({ id: 'mine', itemIds: ['axe'], serverOnUse: second });
  itemIds.push('cheat'); hint.value = 'changed';
  const fork = a.fork();
  assert.deepEqual(a.getWorldToolMeta('mine')?.itemIds, ['pick']);
  assert.equal(fork.getWorldToolMeta('mine')?.clientTargetUserData?.value, 'rock');
  assert.equal('serverOnUse' in a.getWorldToolClientDescriptors()[0], false);
  assert.equal(a.getWorldToolHandler('mine'), first);
  assert.equal(b.getWorldToolHandler('mine'), second);
  a.clearWorldToolRegistry(); a.registerWorldTool({ id: 'mine', itemIds: [], serverOnUse: second }); remove();
  assert.equal(a.getWorldToolHandler('mine'), second);
  assert.equal(fork.getWorldToolHandler('mine'), first);
});

test('new worlds are empty by default; compatibility snapshots do not observe later global changes', () => {
  const remove = registerResourceNode(node('test:template'));
  try {
    const empty = createWorldRegistries();
    const copied = createWorldRegistries({ inheritDefaults: true });
    assert.equal(empty.resources.getRegisteredResourceNodeById('test:template'), undefined);
    assert.ok(copied.resources.getRegisteredResourceNodeById('test:template'));
    remove();
    assert.ok(copied.resources.getRegisteredResourceNodeById('test:template'));
    copied.clear();
    assert.equal(copied.resources.getResourceNodeRegistrations().length, 0);
  } finally { remove(); }
});

test('real room instances own different extension registries', () => {
  const a = new NexusWorldRoom(), b = new NexusWorldRoom();
  try {
    a.worldRegistries.resources.registerResourceNode(node('room:private'));
    assert.equal(b.worldRegistries.resources.getRegisteredResourceNodeById('room:private'), undefined);
    a.worldRegistries.clear();
    b.worldRegistries.resources.registerResourceNode(node('room:private'));
    assert.equal(a.worldRegistries.resources.getRegisteredResourceNodeById('room:private'), undefined);
  } finally { a.worldRegistries.clear(); b.worldRegistries.clear(); }
});

test('resource lookup with an explicit scope never falls back to global extensions', () => {
  const remove = registerResourceNode(node('only:global'));
  try {
    assert.ok(getWorldResourceNodeById('only:global'));
    assert.equal(getWorldResourceNodeById('only:global', createResourceNodeRegistry()), undefined);
  } finally { remove(); }
});

test('inventory consumption executes only its injected item effects', () => {
  const a = createWorldRegistries(), b = createWorldRegistries();
  let callsA = 0, callsB = 0;
  a.effects.registerItemEffect('food_apple', () => { callsA++; });
  b.effects.registerItemEffect('food_apple', () => { callsB++; });
  const handlers = new Map<string, (client: Client, data: unknown) => void>();
  const client = { sessionId: 'scoped-player', send() {} } as unknown as Client;
  const room = { clients: [client], broadcast() {}, onMessage(id: string, fn: (client: Client, data: unknown) => void) { handlers.set(id, fn); } } as unknown as Room;
  const inventory = new InventoryEvents(room, undefined, a.effects.getItemConsumeEffects);
  inventory.createPlayerInventory(client.sessionId);
  inventory.addItemFromWorld(client.sessionId, { itemId: 'food_apple', quantity: 1, name: 'Apple', description: '', type: 'consumable', rarity: 'common', weight: 0.1, maxStack: 99, level: 1, icon: 'apple' });
  handlers.get(InventoryMessages.UseItem)!(client, { itemId: 'food_apple', slot: 0 });
  assert.equal(callsA, 1); assert.equal(callsB, 0);
});

test('tool router uses only the injected scope and removes its handler on cleanup', () => {
  const a = createWorldRegistries(), b = createWorldRegistries();
  let used = 0;
  a.tools.registerWorldTool({ id: 'private', itemIds: ['pick'], serverOnUse: () => { used++; } });
  const handlers = new Map<string, (client: Client, data: Record<string, unknown>) => void>();
  const room = { onMessage(id: string, handler: (client: Client, data: Record<string, unknown>) => void) {
    handlers.set(id, handler); return () => handlers.delete(id);
  } } as unknown as Room;
  const replies: unknown[] = [];
  const client = { sessionId: 'player', send(_id: string, data: unknown) { replies.push(data); } } as Client;
  const stopB = attachGenericWorldToolRouter(room, () => true, b.tools);
  handlers.get(WorldMessages.GenericTool)!(client, { toolId: 'private' });
  assert.equal(used, 0); assert.equal((replies[0] as { ok: boolean }).ok, false);
  stopB(); stopB(); assert.equal(handlers.size, 0);
  const stopA = attachGenericWorldToolRouter(room, () => true, a.tools);
  handlers.get(WorldMessages.GenericTool)!(client, { toolId: 'private' });
  assert.equal(used, 1); stopA();
});
