import assert from 'node:assert/strict';
import test from 'node:test';
import type { Room } from 'colyseus';
import { installRuntimePlugins, PluginCleanupError, attachNexusRoomPlugins, attachContextRoomPlugins } from '@nexusworld3d/engine-server';
import { createWorldResourceNodesPlugin, createFrameworkDemoCubePlugin } from '../server/room/nexusRoomPlugins';

test('plugins install dependencies first, dispose dependants first, and remain instance-local', () => {
  const calls: string[] = [];
  const plugins = [
    { id: 'game:feature', version: '1.0.0', requires: ['core:base'], setup(ctx: string[]) { ctx.push('feature'); return () => { ctx.push('-feature'); }; } },
    { id: 'core:base', setup(ctx: string[]) { ctx.push('base'); return () => { ctx.push('-base'); }; } },
  ];
  const dispose = installRuntimePlugins(calls, plugins);
  const other: string[] = [];
  const disposeOther = installRuntimePlugins(other, plugins);
  assert.deepEqual(calls, ['base', 'feature']);
  dispose(); dispose();
  assert.deepEqual(calls, ['base', 'feature', '-feature', '-base']);
  assert.deepEqual(other, ['base', 'feature']);
  disposeOther();
});

test('all plugin metadata and dependencies validate before side effects', () => {
  let attached = 0;
  const setup = () => { attached++; };
  for (const plugins of [
    [{ id: 'a', setup }, { id: 'a', setup }],
    [{ id: 'a', requires: ['missing'], setup }],
    [{ id: 'a', requires: ['b'], setup }, { id: 'b', requires: ['a'], setup }],
    [{ id: 'a', setup }, { id: 'b', version: 'invalid', setup }],
    [{ id: ' ', setup }],
  ]) assert.throws(() => installRuntimePlugins({}, plugins));
  assert.equal(attached, 0);
});

test('plugin setup failure unwinds installed dependencies; cleanup errors do not stop remaining cleanup', () => {
  let removed = 0;
  assert.throws(() => installRuntimePlugins({}, [
    { id: 'a', setup: () => () => { removed++; } },
    { id: 'b', setup: () => { throw new Error('setup failed'); } },
  ]), /setup failed/);
  assert.equal(removed, 1);
  const dispose = installRuntimePlugins({}, ['a', 'b'].map(id => ({ id, setup: () => () => { removed++; throw new Error(id); } })));
  assert.throws(dispose, (error: unknown) => error instanceof PluginCleanupError && error.errors.length === 2);
  assert.equal(removed, 3);
  assert.doesNotThrow(dispose);
});

test('both legacy room plugin adapters preserve context and return cleanup', () => {
  const room = {} as Room;
  const ctx = { getPlayerPosition: () => null };
  let removed = 0;
  const dispose = attachNexusRoomPlugins(room, [{ id: 'base', attach(actual) { assert.equal(actual, room); return () => { removed++; }; } }]);
  const disposeContext = attachContextRoomPlugins(room, ctx, [{ id: 'context', attach(actual, context) {
    assert.equal(actual, room); assert.equal(context, ctx); return () => { removed++; };
  } }]);
  dispose(); disposeContext();
  assert.equal(removed, 2);
});

test('existing game plugins unregister their message handlers on disposal', () => {
  const handlers = new Map<string, unknown>();
  const room = { onMessage(id: string, handler: unknown) {
    handlers.set(id, handler);
    return () => handlers.delete(id);
  } } as unknown as Room;
  const inventory = {} as Parameters<typeof createWorldResourceNodesPlugin>[0]['inventory'];
  const ctx = { getPlayerPosition: () => null };
  const resource = attachNexusRoomPlugins(room, [createWorldResourceNodesPlugin({ inventory,
    getPlayerMapId: () => 'exterior', getPlayerPosition: ctx.getPlayerPosition })]);
  const demo = attachContextRoomPlugins(room, ctx, [createFrameworkDemoCubePlugin({ inventory })]);
  assert.equal(handlers.size, 2);
  resource(); demo(); resource(); demo();
  assert.equal(handlers.size, 0);
});
