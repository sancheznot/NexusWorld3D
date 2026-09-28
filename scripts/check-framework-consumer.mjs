import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [join(root, 'scripts/build-framework-packages.mjs')], { cwd: root, stdio: 'inherit' });
const { artifacts } = JSON.parse(readFileSync(join(root, 'dist/framework/latest.json'), 'utf8'));
const consumer = mkdtempSync(join(tmpdir(), 'nexus-package-consumer-'));
// No NODE_PATH, tsx loader or repo tsconfig can rescue missing package exports.
const env = { ...process.env };
delete env.NODE_PATH;
delete env.NODE_OPTIONS;
let succeeded = false;
try {
  cpSync(join(root, 'tests/fixtures/framework-consumer'), consumer, { recursive: true });
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'nexus-external-consumer', private: true, type: 'module' }));
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...artifacts], { cwd: consumer, env, stdio: 'inherit', timeout: 120000 });
  execFileSync(process.execPath, ['smoke.mjs'], { cwd: consumer, env, stdio: 'inherit', timeout: 15000 });
  for (const moduleMode of ['Node16', 'NodeNext']) {
    execFileSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), 'types.ts', '--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2020', '--module', moduleMode, '--moduleResolution', moduleMode], { cwd: consumer, env, stdio: 'inherit', timeout: 30000 });
  }
  succeeded = true;
  console.log('[framework-consumer] PASS: standalone installed tarballs and TypeScript Node16/NodeNext');
} finally {
  if (succeeded) rmSync(consumer, { recursive: true, force: true });
  else console.error(`[framework-consumer] Failed consumer retained for diagnosis: ${consumer}`);
}
