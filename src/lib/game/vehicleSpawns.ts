import * as THREE from 'three';

export interface VehicleSpawn {
  id: string;
  position: { x: number; y: number; z: number };
  rotationY: number; // heading in radians
}

export function scanVehicleSpawns(root: THREE.Object3D): VehicleSpawn[] {
  const spawns: VehicleSpawn[] = [];
  root.traverse((obj) => {
    if (!obj.name || !/^Spawn_Car_/i.test(obj.name)) return;
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    obj.updateMatrixWorld(true);
    obj.getWorldPosition(p);
    obj.getWorldQuaternion(q);
    const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
    spawns.push({ id: obj.name, position: { x: p.x, y: p.y, z: p.z }, rotationY: e.y });
  });
  return spawns;
}


