import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import type { Client } from 'colyseus';
import {
  authenticateWorldJoin, createGuestIdentity, identityStorageKey,
  issueWorldTicket, verifyWorldTicket, type WorldIdentity,
} from '../src/lib/auth/worldIdentity';
import { NexusWorldRoom } from '../server/rooms/NexusWorldRoom';
import { PlayerMessages, PROTOCOL_VERSION } from '../packages/protocol/src';
import { InventoryEvents } from '../resources/inventory/server/InventoryEvents';
import { EconomyEvents } from '../resources/economy/server/EconomyEvents';

const secret = 'test-only-shared-secret-with-at-least-32-characters';
const roomName = 'identity-test';
const now = 1_800_000_000_000;
const identity: WorldIdentity = { kind: 'account', subject: 'account-A', displayName: 'Alice', worldId: 'world-A' };

test('account ticket binds identity and room with a short expiry', () => {
  const ticket = issueWorldTicket(identity, roomName, secret, now);
  assert.deepEqual(verifyWorldTicket(ticket, roomName, secret, now + 59000), identity);
  assert.throws(() => verifyWorldTicket(ticket, roomName, secret, now + 60000));
  assert.throws(() => verifyWorldTicket(ticket, 'another-room', secret, now));
  assert.throws(() => verifyWorldTicket(ticket, roomName, 'wrong-secret', now));
  assert.throws(() => verifyWorldTicket(ticket, roomName, secret, now - 1000));
});

test('tampering with subject, name or world invalidates the signature', () => {
  const ticket = issueWorldTicket(identity, roomName, secret, now);
  const [body, signature] = ticket.split('.');
  for (const field of ['subject', 'displayName', 'worldId']) {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    claims[field] = 'forged';
    const forged = Buffer.from(JSON.stringify(claims)).toString('base64url') + '.' + signature;
    assert.throws(() => verifyWorldTicket(forged, roomName, secret, now));
  }
});

test('malformed and oversized tickets fail closed', () => {
  for (const ticket of [null, true, {}, '', 'a.b.c', 'a.b', 'x'.repeat(5000)]) {
    assert.throws(() => verifyWorldTicket(ticket, roomName, secret, now));
  }
  const body = Buffer.from(JSON.stringify({ ...identity, purpose: 'other-token', aud: roomName })).toString('base64url');
  const signed = body + '.' + createHmac('sha256', secret).update(body).digest('base64url');
  assert.throws(() => verifyWorldTicket(signed, roomName, secret, now));
});

test('ownership survives renaming but separates accounts and worlds', () => {
  const key = identityStorageKey(identity);
  assert.equal(identityStorageKey({ ...identity, displayName: 'Renamed' }), key);
  assert.notEqual(identityStorageKey({ ...identity, subject: 'account-B' }), key);
  assert.notEqual(identityStorageKey({ ...identity, worldId: 'world-B' }), key);
  assert.notEqual(identityStorageKey({ ...identity, kind: 'guest' }), key);
  assert.ok(key.length <= 100);
});

test('guests cannot select an account identity or persistence key', () => {
  const guest = authenticateWorldJoin({ username: 'Alice', subject: 'account-A', worldId: 'world-A' }, roomName, 'default-world');
  assert.equal(guest.kind, 'guest');
  assert.equal(guest.worldId, 'default-world');
  assert.notEqual(guest.subject, identity.subject);
  assert.notEqual(guest.displayName, 'Alice');
  assert.notEqual(identityStorageKey(guest), identityStorageKey(identity));
  assert.notEqual(guest.subject, createGuestIdentity('default-world').subject);
});

test('a bad supplied ticket never downgrades to guest', () => {
  assert.throws(() => authenticateWorldJoin({ gameTicket: 'invalid' }, roomName, 'default-world'));
});

test('a room cannot mix signed identities from different worlds', () => {
  const previous = process.env.NEXUS_GAME_AUTH_SECRET;
  process.env.NEXUS_GAME_AUTH_SECRET = secret;
  const room = new NexusWorldRoom();
  room.roomName = roomName;
  const client = { sessionId: 'world-isolation' } as Client;
  try {
    const gameTicket = issueWorldTicket(identity, roomName, secret);
    assert.throws(() => room.onAuth(client, { gameTicket, worldId: 'forged' }), /World identity/);
    assert.equal(room.onAuth(client, { gameTicket, worldId: identity.worldId }).worldId, identity.worldId);
    const otherTicket = issueWorldTicket({ ...identity, worldId: 'world-B' }, roomName, secret);
    assert.throws(() => room.onAuth(client, { gameTicket: otherTicket, worldId: 'world-B' }), /world/i);
  } finally {
    if (previous === undefined) delete process.env.NEXUS_GAME_AUTH_SECRET;
    else process.env.NEXUS_GAME_AUTH_SECRET = previous;
  }
});

test('world room requires its authentication hook before joining', async () => {
  const room = new NexusWorldRoom();
  const client = { sessionId: 'unauthenticated' } as Client;
  await assert.rejects(room.onJoin(client, { username: 'Alice' }), /authentication required/);
});

test('world room authentication ignores forged usernames for guests', () => {
  const room = new NexusWorldRoom();
  const result = room.onAuth({ sessionId: 'guest-test' } as Client, { username: 'Alice' });
  assert.equal(result.kind, 'guest');
  assert.notEqual(result.displayName, 'Alice');
});

test('world room verifies an account ticket and rejects a simultaneous session', async () => {
  const previous = process.env.NEXUS_GAME_AUTH_SECRET;
  process.env.NEXUS_GAME_AUTH_SECRET = secret;
  const room = new NexusWorldRoom();
  room.roomName = roomName;
  const client = { sessionId: 'second-session' } as Client;
  const active = (NexusWorldRoom as unknown as { activeOwners: Map<string, string> }).activeOwners;
  const key = identityStorageKey(identity);
  try {
    const gameTicket = issueWorldTicket(identity, roomName, secret);
    assert.deepEqual(room.onAuth(client, { gameTicket, username: 'Victim' }), identity);
    active.set(key, 'first-session');
    await assert.rejects(room.onJoin(client, { protocolVersion: PROTOCOL_VERSION } as never), /sesión activa/);
    await room.onLeave(client, true);
    assert.equal(active.get(key), 'first-session', 'rejected session must not release the first session');
  } finally {
    active.delete(key);
    if (previous === undefined) delete process.env.NEXUS_GAME_AUTH_SECRET;
    else process.env.NEXUS_GAME_AUTH_SECRET = previous;
  }
});

test('a guest can join fully without loading or saving persistent account data', async () => {
  const room = new NexusWorldRoom();
  room.roomName = roomName;
  room.state = { players: new Map() };
  room.onMessage = (() => {}) as typeof room.onMessage;
  room.broadcast = (() => {}) as typeof room.broadcast;
  room.frameworkServices.inventory = new InventoryEvents(room);
  room.frameworkServices.economy = new EconomyEvents(room);
  let touchedPersistence = false;
  const failPersistence = () => { touchedPersistence = true; throw new Error('Guests must not access persistence'); };
  const internal = room as unknown as {
    playerStore: unknown; redis: unknown; rpgProgression: unknown; housingEvents: unknown;
    players: Map<string, { username: string; worldId: string }>;
  };
  internal.playerStore = { loadSnapshot: failPersistence, saveSnapshot: failPersistence };
  internal.redis = { getPlayer: failPersistence, addPlayer: failPersistence };
  internal.rpgProgression = { hydrate: () => {} };
  internal.housingEvents = { hydrateFromProfile: () => {}, afterPlayerJoined: () => {} };
  const client = { sessionId: 'full-guest', send: () => {} } as unknown as Client;
  assert.throws(() => room.onAuth(client, { username: 'Alice', worldId: 'forged-world' }), /World identity/);
  const guest = room.onAuth(client, { username: 'Alice' });
  try {
    await room.onJoin(client, { username: 'Alice', protocolVersion: PROTOCOL_VERSION } as never);
    assert.equal(internal.players.get(client.sessionId)?.username, guest.displayName);
    assert.equal(internal.players.get(client.sessionId)?.worldId, guest.worldId);
    assert.equal(touchedPersistence, false);
  } finally {
    room.onDispose();
  }
});

test('legacy player:join cannot rename an authenticated player or change its world', () => {
  const room = new NexusWorldRoom();
  const handlers = new Map<string, (client: Client, data: unknown) => void>();
  room.onMessage = ((type: string, handler: (client: Client, data: unknown) => void) => {
    handlers.set(type, handler);
  }) as typeof room.onMessage;
  room.broadcast = (() => {}) as typeof room.broadcast;
  const internal = room as unknown as {
    setupMessageHandlers(): void;
    savePlayerToRedis(): Promise<void>;
    players: Map<string, { username: string; worldId: string }>;
  };
  internal.savePlayerToRedis = async () => {};
  const player = { username: 'Alice', worldId: 'world-A' };
  internal.players.set('account-session', player);
  room.state = { players: new Map() };
  internal.setupMessageHandlers();
  handlers.get(PlayerMessages.Join)!({ sessionId: 'account-session' } as Client, { username: 'Victim', worldId: 'world-B' });
  assert.deepEqual(player, { username: 'Alice', worldId: 'world-A' });
});
