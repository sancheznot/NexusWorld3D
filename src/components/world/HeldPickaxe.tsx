'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

function findRightHand(root: THREE.Object3D): THREE.Object3D | null {
  const bones: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.type !== 'Bone') return;
    const n = o.name.toLowerCase().replace(/[:_\s-]/g, '');
    if (
      n.includes('righthand') ||
      (n.includes('right') && n.includes('hand')) ||
      n.includes('rightwrist') ||
      n.includes('wristr') ||
      n.includes('rightforearm') ||
      n.includes('forearmr') ||
      n === 'handr' ||
      n.endsWith('handr') ||
      n.includes('hand.r') ||
      n.includes('hand_r')
    ) {
      bones.push(o);
    }
  });
  const exact = bones.find((b) => /righthand/i.test(b.name));
  return exact ?? bones[0] ?? null;
}

interface HeldPickaxeProps {
  skinnedRoot: THREE.Object3D | null;
  visible: boolean;
}

function buildProceduralPickaxeGroup(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.88,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x8899a8,
    metalness: 0.5,
    roughness: 0.45,
  });
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.34, 8),
    wood
  );
  handle.rotation.z = Math.PI / 2;
  const pick = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), metal);
  pick.rotation.z = -Math.PI / 2;
  pick.position.set(0.11, 0.02, 0);
  g.add(handle, pick);
  g.traverse((ch) => {
    if (ch instanceof THREE.Mesh) {
      ch.castShadow = true;
      ch.frustumCulled = true;
    }
  });
  return g;
}

type HandOffset = {
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
};

const PROC_HAND: { withBone: HandOffset; fallback: HandOffset } = {
  withBone: { pos: [0.06, 0.04, -0.02], rot: [-0.22, 0.48, 0.1], scale: 1 },
  fallback: { pos: [0.45, 1.12, 0.1], rot: [-0.28, 0.52, 0.12], scale: 1.2 },
};

function useAttachToHand(
  skinnedRoot: THREE.Object3D | null,
  visible: boolean,
  object: THREE.Object3D,
  offsets: { withBone: HandOffset; fallback: HandOffset }
) {
  const attachedTo = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (!visible || !skinnedRoot) {
      if (attachedTo.current && object.parent === attachedTo.current) {
        attachedTo.current.remove(object);
      }
      attachedTo.current = null;
      return;
    }

    const hand = findRightHand(skinnedRoot);
    const attachTarget = hand ?? skinnedRoot;
    const off = hand ? offsets.withBone : offsets.fallback;

    object.position.set(...off.pos);
    object.rotation.set(...off.rot);
    object.scale.setScalar(off.scale);

    attachTarget.add(object);
    attachedTo.current = attachTarget;

    return () => {
      if (attachTarget && object.parent === attachTarget) {
        attachTarget.remove(object);
      }
      attachedTo.current = null;
    };
  }, [skinnedRoot, visible, object, offsets]);
}

/**
 * ES: Pico procedural en mano (misma lógica de hueso que la hacha).
 * EN: Procedural hand pickaxe (same bone attach as axe).
 */
export default function HeldPickaxe({ skinnedRoot, visible }: HeldPickaxeProps) {
  const group = useMemo(() => buildProceduralPickaxeGroup(), []);
  useAttachToHand(skinnedRoot, visible, group, PROC_HAND);
  return null;
}
