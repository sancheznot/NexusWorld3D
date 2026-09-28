import { z } from 'zod';
import { Euler, Quaternion } from 'three';
import { parseSceneDocumentV0_1, type SceneModelAsset } from '@nexusworld3d/content-schema';
const vector = z.object({ x: z.number().finite(), y: z.number().finite(), z: z.number().finite() });
const legacySchema = z.object({
  id: z.string().min(1), spawnPoint: vector,
  objects: z.array(z.object({ id: z.string().min(1), model: z.string().min(1), position: vector, rotation: vector, scale: vector, hasCollision: z.boolean() })),
});
/** Import is pure: preserves the source and refuses guessed asset/collider mappings. */
export function importSceneDocument(raw: unknown, assets: SceneModelAsset[]) {
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw) return { document: parseSceneDocumentV0_1(raw), warnings: [] as string[] };
  const legacy = legacySchema.parse(raw);
  const tuple = (v: z.infer<typeof vector>): [number, number, number] => [v.x, v.y, v.z];
  const document = parseSceneDocumentV0_1({ schemaVersion: 1, worldId: legacy.id,
    spawn: { mapId: 'exterior', position: [legacy.spawnPoint.x, Math.max(1.05, legacy.spawnPoint.y), legacy.spawnPoint.z], yaw: 0 },
    entities: legacy.objects.map(object => {
      const asset = assets.find(asset => asset.url === object.model);
      if (!asset) throw new Error(`Modelo no registrado: ${object.model}. Registra el asset y usa su URL exacta antes de importar.`);
      if (object.hasCollision && !asset.colliders.length) throw new Error(`El modelo ${asset.name} no tiene colliders registrados; no se puede convertir hasCollision sin inventar geometría.`);
      return { id: object.id, parentId: null, transform: { position: tuple(object.position), scale: tuple(object.scale),
        rotation: new Quaternion().setFromEuler(new Euler(...tuple(object.rotation), 'XYZ')).normalize().toArray() },
        components: [{ type: 'nexus:model', props: { assetId: asset.id, mapId: 'exterior', colliders: object.hasCollision ? structuredClone(asset.colliders) : [] } }] };
    }) });
  return { document, warnings: ['Importación legacy: conserva modelos/transformaciones y spawn. No migra skybox, iluminación, gravedad, metadatos ni lógica interactiva; revisa el resultado en Play. La altura del spawn se ajusta al centro del jugador (mínimo 1.05).'] };
}
