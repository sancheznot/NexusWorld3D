import assert from 'node:assert/strict';
import test from 'node:test';
import type { Client } from 'colyseus';
import { NexusWorldRoom } from '../server/rooms/NexusWorldRoom';
import { PlayerMessages } from '../packages/protocol/src';
import { parsePlayerMovement } from '../server/validation/playerMovement';

const pose = { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0 } };

test('movement parser rejects malformed, non-finite and oversized vectors', () => {
  for (const input of [null, [], {}, { ...pose, isRunning: 'true' },
    ...[NaN, Infinity, -Infinity, 1e9, '1'].map(x => ({ ...pose, position: { x, y: 0, z: 0 } }))]) {
    assert.equal(parsePlayerMovement(input), null);
  }
  const parsed = parsePlayerMovement(pose)!;
  assert.deepEqual(parsed, { ...pose, isMoving: false, isRunning: false });
  assert.notEqual(parsed.position, pose.position);
});

test('actual movement handler rejects bad input before mutating or persisting state', () => {
  const room = new NexusWorldRoom();
  const handlers = new Map<string, (client: Client, data: unknown) => void>();
  room.onMessage = ((name: string, handler: (client: Client, data: unknown) => void) => {
    handlers.set(name, handler);
  }) as typeof room.onMessage;
  const internal = room as unknown as {
    setupMessageHandlers(): void;
    players: Map<string, unknown>;
    savePlayerToRedis(): Promise<void>;
  };
  let saves = 0;
  internal.savePlayerToRedis = async () => { saves++; };
  const player = { ...pose, mapId: 'exterior' };
  internal.players.set('p', player);
  room.state = { players: new Map() };
  internal.setupMessageHandlers();
  const handler = handlers.get(PlayerMessages.Move)!;
  for (const input of [null, {}, { ...pose, position: { x: NaN, y: 0, z: 0 } }]) {
    assert.doesNotThrow(() => handler({ sessionId: 'p' } as Client, input));
    assert.deepEqual(player, { ...pose, mapId: 'exterior' });
  }
  assert.equal(saves, 0);
});
