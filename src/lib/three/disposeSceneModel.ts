import { Mesh, SkinnedMesh, Texture, type Skeleton, type Object3D, type Material, type BufferGeometry } from 'three';

/** Only for independently loaded models; never dispose shared useGLTF cache assets. */
export function disposeSceneModel(roots: Object3D[]) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const skeletons = new Set<Skeleton>();
  const images = new Set<{ close?: () => void }>();
  for (const root of roots) root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    }
  });
  for (const texture of textures) {
    if (texture.image) images.add(texture.image);
    texture.dispose();
  }
  for (const image of images) image.close?.();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
}

/** Late completions after unmount are disposed, never delivered to React. */
export function trackSceneModelLoad<T extends { scenes: Object3D[] }>(request: Promise<T>, ready: (model: T) => void, failed: () => void) {
  let cancelled = false;
  let roots: Object3D[] = [];
  void request.then(model => {
    if (cancelled) { disposeSceneModel(model.scenes); return; }
    roots = model.scenes;
    ready(model);
  }).catch(() => { if (!cancelled) failed(); });
  return () => {
    if (cancelled) return;
    cancelled = true;
    disposeSceneModel(roots);
    roots = [];
  };
}
