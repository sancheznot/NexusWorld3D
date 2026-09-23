import assert from 'node:assert/strict';
import test from 'node:test';
import { NexusWorldRoom } from '../server/rooms/NexusWorldRoom';

test('room cleanup interval belongs to its clock and is cancelled on dispose', (t) => {
  // Prevent the broken implementation from leaving a real five-minute interval.
  const globalInterval = t.mock.method(globalThis, 'setInterval', () => ({ unref() {} }));
  const room = new NexusWorldRoom();
  const interval = t.mock.method(room.clock, 'setInterval');
  (room as unknown as { setupCleanup(): void }).setupCleanup();
  try {
    assert.equal(globalInterval.mock.callCount(), 0, 'no unmanaged process timer');
    assert.equal(interval.mock.callCount(), 1);
    const timer = interval.mock.calls[0].result;
    assert.ok(timer);
    assert.equal(timer.active, true);
    room.onDispose();
    assert.equal(timer.active, false);
    assert.doesNotThrow(() => room.onDispose());
  } finally { room.clock.clear(); }
});
