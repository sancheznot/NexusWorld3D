import assert from 'node:assert/strict';
import test from 'node:test';
import type { Room, Client } from 'colyseus';
import { JobsEvents } from '../resources/jobs/server/JobsEvents';
import { JOBS, type ExtendedJobId } from '../src/constants/jobs';

test('jobs reject forged progress and remote waypoints, but pay server-confirmed work once', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 100_000 });
  const handlers = new Map<string, (client: Client, data: unknown) => void>();
  const client = { sessionId: 'worker', send() {} } as unknown as Client;
  const room = { clients: [client], onMessage(name: string, handler: (client: Client, data: unknown) => void) { handlers.set(name, handler); } } as unknown as Room;
  let role: ExtendedJobId | null = 'car_wash';
  let position = { x: 1000, y: 1, z: 1000 };
  let pay = 0;
  let items = 0;
  const jobs = new JobsEvents(room, { getPlayerMapId: () => 'exterior', getPlayerPosition: () => position,
    getPlayerRole: () => role, setPlayerRole: (_, value) => { role = value; },
    grantItemToPlayer: () => { items++; return 1; }, economy: { creditWalletMajor: (_, amount) => { pay += amount; } } });
  const send = (name: string, data: unknown = {}) => handlers.get(name)!(client, data);
  send('jobs:start', { jobId: 'car_wash' });
  send('jobs:progress', { progress: 5 });
  send('jobs:complete');
  assert.deepEqual([pay, items], [0, 0]);
  assert.equal(jobs.recordProgress(client.sessionId), true);
  send('jobs:complete');
  send('jobs:complete');
  assert.deepEqual([pay, items], [JOBS.car_wash.basePay, 1]);
  role = 'delivery';
  send('jobs:start', { jobId: 'delivery' });
  assert.equal(jobs.recordProgress(client.sessionId), false, 'cannot start remotely');
  position = { ...JOBS.delivery.start!.position };
  send('jobs:start', { jobId: 'delivery' });
  for (const wp of JOBS.delivery.route!.waypoints) send('jobs:waypointHit', { waypointId: wp.id });
  assert.equal(pay, JOBS.car_wash.basePay, 'remote route cannot grant payment');
  for (const wp of JOBS.delivery.route!.waypoints) {
    position = { ...wp.position };
    send('jobs:waypointHit', { waypointId: wp.id });
    if (wp.waitSeconds) { t.mock.timers.tick(wp.waitSeconds * 1000); send('jobs:waypointHit', { waypointId: wp.id }); }
  }
  assert.ok(pay > JOBS.car_wash.basePay);
  const completedPay = pay;
  send('jobs:complete');
  assert.equal(pay, completedPay);
  for (const name of ['jobs:start', 'jobs:request', 'jobs:role:assign']) {
    assert.doesNotThrow(() => send(name, null));
    assert.doesNotThrow(() => send(name, { jobId: '__proto__' }));
  }
});
