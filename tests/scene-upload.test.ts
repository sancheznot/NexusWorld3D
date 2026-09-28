import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { NextRequest } from 'next/server';
import { createAdminSession, logoutAdmin } from '../src/core/auth';
import { validateUploadedGlb, MAX_SCENE_ASSET_BYTES } from '../server/scene/validateUploadedGlb';
import { registerUploadedSceneModel, listUploadedSceneModels, getUploadedSceneModel, readUploadedSceneModel } from '../server/scene/uploadedSceneModels';
import { tryHandleGameMonitorRequest } from '../server/metrics/gameMonitorHttp';
import { uploadGlbFixture } from './helpers/uploadGlbFixture';
import { GET as listAssets, POST as uploadAsset } from '../src/app/api/admin/scene-authoring/assets/route';
import { GET as publicAsset } from '../src/app/api/public/scene-models/[id]/route';
import { readSceneUpload } from '../src/lib/sceneAssetProxy';

test('GLB upload validates binary headers, references, budgets and self-contained static content', () => {
  const valid = uploadGlbFixture();
  assert.doesNotThrow(() => validateUploadedGlb(valid));
  for (const mutate of [
    (json: Record<string, unknown>) => { json.buffers = [{ uri: 'https://example.invalid/private', byteLength: 168 }]; },
    (json: Record<string, unknown>) => { json.extensionsUsed = ['KHR_draco_mesh_compression']; },
    (json: Record<string, unknown>) => { json.animations = [{}]; },
    (json: Record<string, unknown>) => { json.nodes = [{ children: [0] }]; },
    (json: Record<string, unknown>) => { json.bufferViews = [{ buffer: 0, byteOffset: 0, byteLength: 999999 }]; },
    (json: Record<string, unknown>) => { json.accessors = [{ bufferView: 0, componentType: 5126, count: 1e9, type: 'VEC3' }]; },
    (json: Record<string, unknown>) => { json.images = [{ uri: 'file:///tmp/secret.png' }]; },
    (json: Record<string, unknown>) => { json.textures = [{ source: 99 }]; },
  ]) assert.throws(() => validateUploadedGlb(uploadGlbFixture(mutate)));
  for (const offset of [0, 4, 8, 12, 16]) {
    const broken = Buffer.from(valid); broken.writeUInt32LE(0xffffffff, offset);
    assert.throws(() => validateUploadedGlb(broken));
  }
  const nonFinite = Buffer.from(valid); nonFinite.writeFloatLE(NaN, 28 + nonFinite.readUInt32LE(12));
  assert.throws(() => validateUploadedGlb(nonFinite), /non-finite/);
  assert.throws(() => validateUploadedGlb(Buffer.alloc(MAX_SCENE_ASSET_BYTES + 1)), /file size/);
});

test('upload storage commits atomically, deduplicates concurrent files and reloads from disk', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexus-upload-'));
  const previous = process.env.NEXUS_SCENE_PERSIST_DIR;
  process.env.NEXUS_SCENE_PERSIST_DIR = directory;
  try {
    const bytes = uploadGlbFixture();
    const results = await Promise.all(Array.from({ length: 3 }, () => registerUploadedSceneModel(bytes, 'Doorway.glb')));
    assert.equal(new Set(results.map(asset => asset.id)).size, 1);
    const asset = results[0];
    assert.deepEqual(await listUploadedSceneModels(), [asset]);
    assert.deepEqual(getUploadedSceneModel(asset.id), asset);
    assert.deepEqual(await readUploadedSceneModel(asset.id), bytes);
    assert.deepEqual(readdirSync(join(directory, 'model-assets-v1')), [asset.id]);
    assert.equal(getUploadedSceneModel('../../secret'), null);
    assert.equal(await readUploadedSceneModel(`upload-${'0'.repeat(64)}`), null);
    await assert.rejects(registerUploadedSceneModel(Buffer.from('not glb'), 'bad.glb'));
    assert.equal((await listUploadedSceneModels()).length, 1);
  } finally {
    if (previous === undefined) delete process.env.NEXUS_SCENE_PERSIST_DIR; else process.env.NEXUS_SCENE_PERSIST_DIR = previous;
    rmSync(directory, { recursive: true });
  }
});

test('admin upload, catalog and public download work across the authenticated game-server proxy', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'nexus-upload-http-'));
  const keys = ['NEXUS_SCENE_PERSIST_DIR', 'NEXUS_GAME_MONITOR_SECRET', 'NEXUS_GAME_MONITOR_URL'] as const;
  const previous = keys.map(key => process.env[key]);
  process.env.NEXUS_SCENE_PERSIST_DIR = directory;
  process.env.NEXUS_GAME_MONITOR_SECRET = 'isolated-upload-test-secret';
  const server = createServer((req, res) => { void tryHandleGameMonitorRequest(req, res).then(handled => { if (!handled) { res.writeHead(404); res.end(); } }); });
  const session = createAdminSession('upload-test');
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    process.env.NEXUS_GAME_MONITOR_URL = `http://127.0.0.1:${address.port}`;
    const url = 'http://localhost/api/admin/scene-authoring/assets?name=Doorway.glb';
    const bytes = uploadGlbFixture();
    const headers = { cookie: `admin_session=${session}`, origin: 'http://localhost' };
    assert.equal((await uploadAsset(new NextRequest(url, { method: 'POST', body: new Uint8Array(bytes) }))).status, 401);
    assert.equal((await uploadAsset(new NextRequest(url, { method: 'POST', headers: { ...headers, origin: 'https://elsewhere.invalid' }, body: new Uint8Array(bytes) }))).status, 403);
    assert.equal((await fetch(`${process.env.NEXUS_GAME_MONITOR_URL}/__nexus-internal/v1/scene-assets`, { method: 'POST', body: new Uint8Array(bytes) })).status, 401);
    const response = await uploadAsset(new NextRequest(url, { method: 'POST', headers, body: new Uint8Array(bytes) }));
    assert.equal(response.status, 201);
    const { asset } = await response.json();
    const catalog = await listAssets(new NextRequest(url, { headers }));
    assert.equal((await catalog.json()).assets[0].id, asset.id);
    const download = await publicAsset(new NextRequest(`http://localhost${asset.url}`), { params: Promise.resolve({ id: asset.id }) });
    assert.equal(download.status, 200);
    assert.match(download.headers.get('cache-control')!, /immutable/);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
    assert.equal((await publicAsset(new NextRequest('http://localhost'), { params: Promise.resolve({ id: '../secret' }) })).status, 404);
    const rejected = await uploadAsset(new NextRequest(url, { method: 'POST', headers, body: 'invalid' }));
    assert.equal(rejected.status, 400);
    const oversized = await fetch(`${process.env.NEXUS_GAME_MONITOR_URL}/__nexus-internal/v1/scene-assets`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.NEXUS_GAME_MONITOR_SECRET}` }, body: new Uint8Array(MAX_SCENE_ASSET_BYTES + 1),
    });
    assert.equal(oversized.status, 413);
  } finally {
    logoutAdmin(session);
    await new Promise<void>(resolve => server.close(() => resolve()));
    keys.forEach((key, index) => { const value = previous[index]; if (value === undefined) delete process.env[key]; else process.env[key] = value; });
    rmSync(directory, { recursive: true });
  }
});

test('Next upload reader enforces the limit even without Content-Length', async () => {
  const chunks = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(MAX_SCENE_ASSET_BYTES)); controller.enqueue(new Uint8Array(1)); controller.close(); } });
  const request = new Request('http://localhost', { method: 'POST', body: chunks, duplex: 'half' } as RequestInit);
  await assert.rejects(readSceneUpload(request), /payload_too_large/);
});
