import assert from 'node:assert/strict';
import test from 'node:test';
import type { Client } from 'colyseus';
import { NexusWorldRoom } from '../server/rooms/NexusWorldRoom';
import { ChatMessages, PlayerMessages, SystemMessages } from '../packages/protocol/src';

test('chat validates content and limits floods; legacy attacks never relay client damage', () => {
  const room = new NexusWorldRoom();
  const handlers = new Map<string, (client: Client, data: unknown) => void>();
  const sent: string[] = [];
  const broadcast: { type: string; data: unknown }[] = [];
  room.onMessage = ((type: string, fn: (client: Client, data: unknown) => void) => {
    handlers.set(type, fn);
  }) as typeof room.onMessage;
  room.broadcast = ((type: string, data: unknown) => { broadcast.push({ type, data }); }) as typeof room.broadcast;
  const internal = room as unknown as {
    players: Map<string, unknown>; setupMessageHandlers(): void; persistChatMessages(): Promise<void>;
  };
  internal.players.set('p', { username: 'Verified name', isOnline: true });
  internal.persistChatMessages = async () => {};
  internal.setupMessageHandlers();
  const client = { sessionId: 'p', send: (type: string) => { sent.push(type); } } as unknown as Client;
  const chat = handlers.get(ChatMessages.Message)!;
  for (const data of [null, {}, { message: {} }, { message: ' ' },
    { message: 'x'.repeat(1001) }, { message: 'hello', channel: 'admin' }]) {
    assert.doesNotThrow(() => chat(client, data));
  }
  assert.equal(broadcast.length, 0);
  for (let i = 0; i < 100; i++) chat(client, { message: ' hello ', username: 'Forged' });
  assert.equal(broadcast.length, 1);
  assert.equal((broadcast[0].data as { username: string }).username, 'Verified name');
  for (const data of [null, { targetId: 'victim', damage: 1e9 }]) {
    handlers.get(PlayerMessages.Attack)!(client, data);
  }
  assert.equal(broadcast.length, 1);
  assert.equal(sent.filter(type => type === SystemMessages.Error).length, 2);
});
