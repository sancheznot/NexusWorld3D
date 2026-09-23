import assert from 'node:assert/strict';
import test from 'node:test';
import { SerialWrites } from '../server/persistence/SerialWrites';

test('slow earlier write cannot overwrite the final leave snapshot; unrelated accounts proceed', async () => {
  const queue = new SerialWrites();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const written: number[] = [];
  const old = queue.run('account', async () => { await gate; written.push(1); });
  const final = queue.run('account', async () => { written.push(2); });
  await queue.run('other', async () => { written.push(3); });
  assert.deepEqual(written, [3]);
  release();
  await Promise.all([old, final]);
  assert.deepEqual(written, [3, 1, 2]);
  await assert.rejects(queue.run('account', async () => { throw new Error('database unavailable'); }));
  await queue.run('account', async () => { written.push(4); });
  assert.equal(written.at(-1), 4, 'failed write does not poison later saves');
});
