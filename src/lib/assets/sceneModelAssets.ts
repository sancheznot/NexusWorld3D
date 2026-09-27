import manifest from '@repo/content/manifest.json';
import { parseContentManifestV1 } from '@nexusworld3d/content-schema';

/** Bundled catalog: client and game server must deploy the same content manifest. */
export const sceneModelAssets = parseContentManifestV1(manifest).modelAssets;
export function resolveSceneModelAsset(id: string) { return sceneModelAssets.find(asset => asset.id === id) ?? null; }
