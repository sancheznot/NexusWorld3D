import assert from 'node:assert/strict';
import test from 'node:test';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Client } from 'colyseus.js';
import { withWorldProtocolJoinOptions } from '@nexusworld3d/engine-client';
import { document, startDemo } from './server.mjs';
import { createDemoPhysics } from './physics.mjs';

test('framework dependencies resolve to installed artifacts, never the source workspace', () => {
  const require = createRequire(import.meta.url);
  for (const name of ['protocol', 'content-schema', 'engine-client', 'engine-server']) {
    const path = realpathSync(require.resolve(`@nexusworld3d/${name}`));
    assert.ok(path.startsWith(`${process.cwd()}/node_modules/`));
    assert.ok(path.endsWith('/dist/index.js'));
  }
});

test('packaged scene creates physical obstacles, jump and leak-free teardown', () => {
  const physics = createDemoPhysics(document);
  const body = physics.add('test');
  const inputs = new Map([['test', { x: 0, z: -1, jump: false }]]);
  try {
    for (let i = 0; i < 240; i++) physics.step(inputs);
    assert.ok(body.position.z > 0.9 && body.position.z < 1.2, `wall must stop movement: ${body.position.z}`);
    assert.ok(body.position.y > 0.4 && body.position.y < 0.6);
    inputs.set('test', { x: 0, z: 0, jump: true });
    for (let i = 0; i < 10; i++) physics.step(inputs);
    assert.ok(body.position.y > 1, 'jump should leave the ground');
    body.position.y = -20; physics.step(inputs);
    assert.ok(body.position.y > 1, 'falling respawns at authored spawn');
  } finally { physics.dispose(); physics.dispose(); }
  assert.equal(physics.world.bodies.length, 0);
});

async function waitUntil(predicate, message) {
  const until = Date.now() + 4000;
  while (!predicate()) {
    if (Date.now() >= until) throw new Error(message);
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

test('standalone HTTP + two websocket clients use server physics and release sessions', { timeout: 15000 }, async () => {
  const server = await startDemo();
  const base = `http://127.0.0.1:${server.port}`;
  const rooms = [];
  try {
    assert.match(await (await fetch(base)).text(), /Laboratorio de mundo/);
    const bundle = await fetch(`${base}/client.js`);
    assert.equal(bundle.status, 200);
    assert.ok((await bundle.text()).length > 1000);
    assert.deepEqual(await (await fetch(`${base}/scene`)).json(), document);
    assert.equal((await fetch(`${base}/not-a-route`)).status, 404);
    const client = new Client(base.replace('http:', 'ws:'));
    await assert.rejects(client.joinOrCreate('demo', { worldId: document.worldId, protocolVersion: -1 }));
    const options = withWorldProtocolJoinOptions({ worldId: document.worldId });
    const a = await client.joinOrCreate('demo', options); rooms.push(a);
    const b = await client.joinOrCreate('demo', options); rooms.push(b);
    assert.equal(a.roomId, b.roomId);
    let stateA = [], stateB = [];
    a.onMessage('demo:snapshot', state => { stateA = state; });
    b.onMessage('demo:snapshot', state => { stateB = state; });
    a.send('demo:ready'); b.send('demo:ready');
    await waitUntil(() => stateA.length === 2 && stateB.length === 2, 'missing multiplayer snapshot');
    const startX = stateB.find(player => player.id === a.sessionId).position[0];
    const movement = setInterval(() => a.send('demo:input', { x: 1, z: 0, jump: false }), 50);
    try { await waitUntil(() => stateB.find(player => player.id === a.sessionId)?.position[0] > startX + 0.8, 'remote player did not move'); }
    finally { clearInterval(movement); }
    a.send('demo:input', { x: 999, z: 0, jump: false, position: [999, 999, 999] });
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.ok(stateB.find(player => player.id === a.sessionId).position[0] < 5, 'forged position/axis cannot teleport');
    await b.leave(); rooms.pop();
    await waitUntil(() => stateA.length === 1, 'departed player still in snapshots');
  } finally {
    await Promise.all(rooms.map(room => room.leave()));
    await server.close();
  }
});
