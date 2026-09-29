import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('demo exporter refuses an existing directory before generating or overwriting files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexus-export-guard-'));
  try {
    const sentinel = join(directory, 'package.json');
    writeFileSync(sentinel, 'user-owned');
    assert.throws(() => execFileSync(process.execPath, ['scripts/export-standalone-demo.mjs', directory], { stdio: 'pipe' }));
    assert.equal(readFileSync(sentinel, 'utf8'), 'user-owned');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
