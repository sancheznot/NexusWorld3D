import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist', 'framework');
mkdirSync(output, { recursive: true });
// A unique build avoids stale emitted files and never deletes previous artifacts.
const build = mkdtempSync(join(output, 'build-'));
const names = ['protocol', 'content-schema', 'engine-client', 'engine-server'];
const manifests = names.map(name => JSON.parse(readFileSync(join(root, 'packages', name, 'package.json'), 'utf8')));
const paths = {};
const artifacts = [];
const formatHost = { getCanonicalFileName: file => file, getCurrentDirectory: () => root, getNewLine: () => '\n' };

for (const [index, name] of names.entries()) {
  const source = join(root, 'packages', name, 'src');
  const target = join(build, name);
  const options = {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10, strict: true,
    esModuleInterop: true, skipLibCheck: true, declaration: true,
    noEmitOnError: true, rootDir: source, outDir: join(target, 'dist'),
    types: [], paths: { ...paths },
  };
  const config = ts.parseJsonConfigFileContent({ include: ['**/*.ts'] }, ts.sys, source, options);
  const program = ts.createProgram(config.fileNames, options);
  const diagnostics = [...config.errors, ...ts.getPreEmitDiagnostics(program)];
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost));
  const emitted = program.emit();
  if (emitted.emitSkipped) throw new Error(`Cannot emit ${name}`);
  const original = manifests[index];
  const exports = Object.fromEntries(Object.entries(original.exports).map(([key, file]) => {
    const base = file.replace('./src/', './dist/').replace(/\.ts$/, '');
    return [key, { types: `${base}.d.ts`, default: `${base}.js` }];
  }));
  const dependencies = Object.fromEntries(Object.entries(original.dependencies ?? {}).map(([dependency, version]) =>
    [dependency, manifests.find(manifest => manifest.name === dependency)?.version ?? version]));
  writeFileSync(join(target, 'package.json'), JSON.stringify({
    ...original, private: true, type: 'commonjs', main: './dist/index.js',
    types: './dist/index.d.ts', exports, dependencies, files: ['dist'],
  }, null, 2));
  cpSync(join(root, 'LICENSE'), join(target, 'LICENSE'));
  const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', build], { cwd: target, encoding: 'utf8' }))[0];
  if (packed.files.some(file => !/^(dist\/.*\.(js|d\.ts)|package\.json|LICENSE)$/.test(file.path))) {
    throw new Error(`Unexpected files in ${name} archive`);
  }
  paths[original.name] = [join(target, 'dist', 'index.d.ts')];
  for (const [key, entry] of Object.entries(exports)) {
    if (key !== '.') paths[`${original.name}${key.slice(1)}`] = [join(target, entry.types)];
  }
  artifacts.push(join(build, packed.filename));
}
writeFileSync(join(output, 'latest.json'), JSON.stringify({ build, artifacts }, null, 2));
console.log(`[framework-packages] Built ${artifacts.length} archives in ${build}`);
