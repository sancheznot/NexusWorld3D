import * as THREE from "three";

const NAME_HINT =
  /tree|arbol|árbol|pino|palm|birch|oak|elm|poplar|canopy|follaje|vegetation|vegetacion|bosque|forest|kousa|cedar|spruce|jungle|sapling/i;

/**
 * ES: Marca meshes del GLB de ciudad como talables (`userData.choppableTreeId` = ct_*).
 * EN: Tags likely tree meshes in city GLB for chop raycast + server sync id.
 */
export function tagCityChoppableTrees(root: THREE.Object3D): number {
  let count = 0;
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;
    if (obj.userData?.choppableTreeId) return;
    const n = obj.name || "";
    if (!NAME_HINT.test(n)) return;
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    if (size.y < 1.0 && Math.max(size.x, size.z) < 0.9) return;

    const id = `ct_${obj.uuid.replace(/-/g, "").slice(0, 14)}`;
    let o: THREE.Object3D | null = obj;
    for (let i = 0; i < 6 && o; i++) {
      o.userData.choppableTreeId = id;
      o = o.parent;
    }
    count += 1;
  });
  if (count > 0) {
    console.log(`🪓 [City] ${count} meshes etiquetados como talables (ct_*)`);
  }
  return count;
}
