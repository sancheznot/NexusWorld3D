import assert from 'node:assert/strict';
import test from 'node:test';
import { colyseusClient } from '../src/lib/colyseus/client';
import { PlayerMessages } from '@nexusworld3d/protocol';
import { worldClient } from '../src/lib/colyseus/WorldClient';
import { timeClient } from '../src/lib/colyseus/TimeClient';
import { useSceneAuthoringStore } from '../src/store/sceneAuthoringStore';
import { SceneMessages } from '@nexusworld3d/protocol';

test('repeated client subscriptions unsubscribe idempotently without growing listeners', () => {
  const baseline = colyseusClient.getListenerCount();
  let deliveries = 0;
  for (let i = 0; i < 100; i++) {
    const remove = colyseusClient.onPlayerMoved(() => { deliveries++; });
    colyseusClient.emit(PlayerMessages.Moved, {});
    assert.equal(deliveries, i + 1);
    remove();
    remove();
    assert.equal(colyseusClient.getListenerCount(), baseline);
  }
});

test('world and clock subscriptions survive room switches without duplicate network handlers', t => {
  const network = new Map<string, Set<(data: unknown) => void>>();
  const fakeRoom = {
    onMessage(event: string, callback: (data: unknown) => void) {
      if (!network.has(event)) network.set(event, new Set());
      network.get(event)!.add(callback);
      return () => { network.get(event)!.delete(callback); };
    },
  };
  t.mock.method(colyseusClient, 'isConnectedToWorldRoom', () => true);
  t.mock.method(colyseusClient, 'getSocket', () => fakeRoom);
  let maps = 0;
  let times = 0;
  const onMap = () => { maps++; };
  const onTime = () => { times++; };
  worldClient.onMapChanged(onMap);
  timeClient.onTimeUpdate(onTime);
  try {
    for (let cycle = 1; cycle <= 20; cycle++) {
      colyseusClient.emit('room:connected', {});
      colyseusClient.emit('room:connected', {});
      for (const handlers of network.values()) assert.equal(handlers.size, 1);
      network.get('map:changed')!.forEach(cb => cb({}));
      network.get('time:update')!.forEach(cb => cb({}));
      assert.equal(maps, cycle);
      assert.equal(times, cycle);
      colyseusClient.emit('room:left', {});
      for (const handlers of network.values()) assert.equal(handlers.size, 0);
    }
  } finally {
    worldClient.off('map:changed', onMap);
    timeClient.off('time:update', onTime);
    colyseusClient.emit('room:left', {});
  }
});

test('concurrent joins share work and disconnect cancels an in-flight ticket', async t => {
  let release!: (response: Response) => void;
  let requests = 0;
  t.mock.method(globalThis, 'fetch', () => {
    requests++;
    return new Promise<Response>(resolve => { release = resolve; });
  });
  const first = colyseusClient.connect();
  const second = colyseusClient.connect();
  assert.equal(first, second);
  assert.equal(requests, 1);
  colyseusClient.disconnect();
  release(new Response(JSON.stringify({ ticket: null, worldId: 'default' })));
  await assert.rejects(first, /Connection cancelled/);
  assert.equal(colyseusClient.getSocket(), null);
  assert.equal(colyseusClient.isSocketConnected(), false);
});

test('early scene snapshots replay and leaving clears scene colliders source state', () => {
  const internal = colyseusClient as unknown as {
    lastScenePayload: unknown; room: unknown;
  };
  const payload = { document: { schemaVersion: 1 as const, worldId: 'test', entities: [] },
    roomId: 'room', appliedAt: 1 };
  internal.lastScenePayload = payload;
  internal.room = { leave: async () => {} };
  useSceneAuthoringStore.getState().setApplied(payload);
  let replays = 0;
  const unsubscribe = colyseusClient.on(SceneMessages.AppliedDocumentV0_1, () => { replays++; });
  try {
    colyseusClient.replayPendingSnapshots();
    assert.equal(replays, 1);
    colyseusClient.disconnect();
    assert.equal(useSceneAuthoringStore.getState().document, null);
    colyseusClient.replayPendingSnapshots();
    assert.equal(replays, 1);
  } finally { unsubscribe(); }
});
