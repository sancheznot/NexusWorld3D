import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile, rename, rm, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sceneModelAssetSchema, type SceneModelAsset } from '@nexusworld3d/content-schema';
import { validateUploadedGlb, MAX_SCENE_ASSET_BYTES } from './validateUploadedGlb';

export const uploadedModelIdPattern = /^upload-[a-f0-9]{64}$/;
function root() {
  return join(process.env.NEXUS_SCENE_PERSIST_DIR?.trim() || join(process.cwd(), 'content', 'scenes', 'persisted'), 'model-assets-v1');
}
function assetDirectory(id: string) {
  if (!uploadedModelIdPattern.test(id)) throw new Error('invalid_asset_id');
  return join(root(), id);
}
export function getUploadedSceneModel(id: string): SceneModelAsset | null {
  if (!uploadedModelIdPattern.test(id)) return null;
  const dir = assetDirectory(id);
  try {
    const asset = sceneModelAssetSchema.parse(JSON.parse(readFileSync(join(dir, 'asset.json'), 'utf8')));
    if (asset.id !== id || asset.url !== `/api/public/scene-models/${id}` || statSync(join(dir, 'model.glb')).size > MAX_SCENE_ASSET_BYTES) return null;
    return asset;
  } catch { return null; }
}
export async function listUploadedSceneModels() {
  if (!existsSync(root())) return [];
  const names = await readdir(root());
  return names.filter(id => uploadedModelIdPattern.test(id)).map(getUploadedSceneModel).filter((asset): asset is SceneModelAsset => asset !== null);
}
export async function registerUploadedSceneModel(bytes: Buffer, name: string): Promise<SceneModelAsset> {
  validateUploadedGlb(bytes);
  const id = `upload-${createHash('sha256').update(bytes).digest('hex')}`;
  const existing = getUploadedSceneModel(id);
  if (existing) return existing;
  const asset = sceneModelAssetSchema.parse({ id, name: name.trim().slice(0, 120) || 'Modelo GLB', url: `/api/public/scene-models/${id}`, colliders: [] });
  await mkdir(root(), { recursive: true });
  const temporary = join(root(), `.upload-${randomUUID()}`);
  await mkdir(temporary);
  try {
    await writeFile(join(temporary, 'model.glb'), bytes, { flag: 'wx' });
    await writeFile(join(temporary, 'asset.json'), JSON.stringify(asset), { flag: 'wx' });
    try { await rename(temporary, assetDirectory(id)); }
    catch (error) { if (!getUploadedSceneModel(id)) throw error; }
  } finally { await rm(temporary, { recursive: true, force: true }); }
  return getUploadedSceneModel(id)!;
}
export async function readUploadedSceneModel(id: string) {
  if (!getUploadedSceneModel(id)) return null;
  const bytes = await readFile(join(assetDirectory(id), 'model.glb'));
  // Detect corruption without ever returning changed content under an immutable URL.
  if (`upload-${createHash('sha256').update(bytes).digest('hex')}` !== id) throw new Error('asset_integrity_failure');
  return bytes;
}
