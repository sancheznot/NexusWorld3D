import assert from 'node:assert/strict';
import test from 'node:test';
import type { Room } from 'colyseus';
import { TimeEvents } from '../resources/time/server/TimeEvents';

test('disposing time resource before startup never creates a later interval', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 0 });
  let broadcasts = 0;
  const room = { onMessage() {}, broadcast() { broadcasts++; } } as unknown as Room;
  const time = new TimeEvents(room);
  time.dispose();
  t.mock.timers.tick(180_000);
  assert.equal(broadcasts, 0);
});

test('time resource still broadcasts while active and stops after disposal', t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 0 });
  let broadcasts = 0;
  const room = { onMessage() {}, broadcast() { broadcasts++; } } as unknown as Room;
  const time = new TimeEvents(room);
  t.mock.timers.tick(60_050);
  assert.equal(broadcasts, 1);
  t.mock.timers.tick(60_000);
  assert.equal(broadcasts, 2);
  time.dispose();
  time.dispose();
  t.mock.timers.tick(180_000);
  assert.equal(broadcasts, 2);
});
