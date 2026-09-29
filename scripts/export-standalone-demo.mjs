import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args[0] === '--check';
if (args.length > 1) throw new Error('Usage: export-standalone-demo.mjs [--check | new-directory]');
const destination = !check && args[0] ? resolve(args[0]) : mkdtempSync(join(tmpdir(), 'nexus-standalone-'));
// A user-specified target must not already exist, even if empty.
if (!check && args[0]) mkdirSync(destination);
execFileSync(process.execPath, [join(root, 'scripts/build-framework-packages.mjs')], { cwd: root, stdio: 'inherit' });
const { artifacts } = JSON.parse(readFileSync(join(root, 'dist/framework/latest.json'), 'utf8'));
cpSync(join(root, 'apps/demo/standalone'), destination, { recursive: true });
mkdirSync(join(destination, 'vendor'));
const manifest = JSON.parse(readFileSync(join(destination, 'package.json'), 'utf8'));
for (const artifact of artifacts) {
  const file = basename(artifact);
  cpSync(artifact, join(destination, 'vendor', file));
  const name = `@nexusworld3d/${file.replace(/^nexusworld3d-/, '').replace(/-\d+\.\d+\.\d+\.tgz$/, '')}`;
  if (!(name in manifest.dependencies)) throw new Error(`Unexpected package: ${name}`);
  manifest.dependencies[name] = `file:vendor/${file}`;
}
writeFileSync(join(destination, 'package.json'), JSON.stringify(manifest, null, 2));
cpSync(join(root, 'LICENSE'), join(destination, 'LICENSE'));
console.log(`[standalone-demo] Exported to ${destination}`);
if (check) {
  const env = { ...process.env };
  delete env.NODE_PATH; delete env.NODE_OPTIONS;
  let success = false;
  try {
    execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: destination, env, stdio: 'inherit', timeout: 120000 });
    execFileSync('npm', ['run', 'build'], { cwd: destination, env, stdio: 'inherit', timeout: 60000 });
    execFileSync('npm', ['test'], { cwd: destination, env, stdio: 'inherit', timeout: 30000 });
    success = true;
    console.log('[standalone-demo] PASS: isolated browser bundle, physics and two real clients');
  } finally {
    if (success) rmSync(destination, { recursive: true, force: true });
    else console.error(`[standalone-demo] Failed project preserved: ${destination}`);
  }
} else console.log('Next: cd into the exported folder, npm install --ignore-scripts, npm run build, npm start');
