import { Euler, MathUtils, Quaternion } from 'three';
import { parseSceneDocumentV0_1, type SceneDocumentV0_1, type SceneEntityV0_1 } from '@nexusworld3d/content-schema';

export function sceneRotationDegrees(rotation: SceneEntityV0_1['transform']['rotation']): [number, number, number] {
  const euler = new Euler().setFromQuaternion(new Quaternion(...rotation).normalize(), 'XYZ');
  return [euler.x, euler.y, euler.z].map(MathUtils.radToDeg) as [number, number, number];
}
export function sceneRotationQuaternion(degrees: [number, number, number]): [number, number, number, number] {
  if (!degrees.every(Number.isFinite)) throw new Error('Rotación no finita');
  const [x, y, z] = degrees.map(MathUtils.degToRad);
  return new Quaternion().setFromEuler(new Euler(x, y, z, 'XYZ')).normalize().toArray();
}
export function updateSceneTransform(document: SceneDocumentV0_1, id: string, patch: Partial<SceneEntityV0_1['transform']>) {
  return parseSceneDocumentV0_1({ ...document, entities: document.entities.map(entity => entity.id === id
    ? { ...entity, transform: { ...entity.transform, ...patch } } : entity) });
}
