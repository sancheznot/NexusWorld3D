import * as THREE from 'three';

export interface VehicleSpawn {
  id: string;
  object: THREE.Object3D;
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
    spawns.push({ id: obj.name, object: obj, position: { x: p.x, y: p.y, z: p.z }, rotationY: e.y });
  });
  return spawns;
}

export function resolveSpawnSlot(spawn: VehicleSpawn, preferName: string = 'slot_1') {
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  // Buscar hijo preferido dentro del spawn
  let target: THREE.Object3D | null = null;
  spawn.object.traverse((child) => {
    if (target) return;
    if (!child.name) return;
    if (child.name.toLowerCase() === preferName.toLowerCase()) target = child;
  });
  // Si no, buscar cualquier slot_*
  if (!target) {
    spawn.object.traverse((child) => {
      if (target) return;
      if (/^slot_/i.test(child.name || '')) target = child;
    });
  }
  // Si aún no hay target, buscar entre los HERMANOS (por si Slot_1 está junto a Spawn_Car_* y no dentro)
  if (!target && spawn.object.parent) {
    spawn.object.parent.children.forEach((sibling) => {
      if (target) return;
      if (!sibling.name) return;
      if (sibling.name.toLowerCase() === preferName.toLowerCase()) target = sibling;
      else if (/^slot_/i.test(sibling.name)) target = sibling;
    });
  }
  if (target) {
    const obj = target as THREE.Object3D;
    obj.updateMatrixWorld(true);
    obj.getWorldPosition(p);
    obj.getWorldQuaternion(q);
    e.setFromQuaternion(q, 'YXZ');
    return { position: { x: p.x, y: p.y, z: p.z }, rotationY: e.y };
  }
  return { position: spawn.position, rotationY: spawn.rotationY };
}


