import manifest from '@repo/content/manifest.json';
import { parseContentManifestV1, type SceneModelAsset } from '@nexusworld3d/content-schema';

/** Bundled catalog: client and game server must deploy the same content manifest. */
export const sceneModelAssets = parseContentManifestV1(manifest).modelAssets;
export function resolveSceneModelAsset(id: string): SceneModelAsset | null {
  const builtIn = sceneModelAssets.find(asset => asset.id === id);
  if (builtIn) return builtIn;
  if (/^upload-[a-f0-9]{64}$/.test(id)) return { id, name: 'Modelo subido', url: `/api/public/scene-models/${id}`, colliders: [] };
  return null;
}
