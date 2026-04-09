'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const AXE_URL = '/models/tools/farm/axe_1.glb';

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

interface HeldAxeProps {
  skinnedRoot: THREE.Object3D | null;
  visible: boolean;
}

function buildProceduralAxeGroup(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.85,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x9aa3ad,
    metalness: 0.55,
    roughness: 0.4,
  });
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.32, 8),
    wood
  );
  handle.rotation.z = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.16), metal);
  head.position.set(0.1, 0.015, 0);
  g.add(handle, head);
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

const GLTF_HAND: { withBone: HandOffset; fallback: HandOffset } = {
  withBone: { pos: [0.08, 0.05, -0.02], rot: [-0.2, 0.45, 0.15], scale: 0.035 },
  fallback: { pos: [0.42, 1.15, 0.12], rot: [-0.28, 0.52, 0.14], scale: 0.055 },
};

const PROC_HAND: { withBone: HandOffset; fallback: HandOffset } = {
  withBone: { pos: [0.06, 0.04, -0.02], rot: [-0.25, 0.5, 0.12], scale: 1 },
  fallback: { pos: [0.45, 1.12, 0.1], rot: [-0.3, 0.55, 0.15], scale: 1.2 },
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

function HeldAxeGltf({ skinnedRoot, visible }: HeldAxeProps) {
  const { scene } = useGLTF(AXE_URL);
  const clone = useMemo(() => scene.clone(true), [scene]);
  useAttachToHand(skinnedRoot, visible, clone, GLTF_HAND);
  return null;
}

function HeldAxeProcedural({ skinnedRoot, visible }: HeldAxeProps) {
  const group = useMemo(() => buildProceduralAxeGroup(), []);
  useAttachToHand(skinnedRoot, visible, group, PROC_HAND);
  return null;
}

/**
 * ES: Hacha en mano — GLB si existe en `public/`; si no (404 / carpeta ignorada en git), modelo procedural.
 * EN: Hand axe — GLB when present; procedural fallback when asset is missing.
 */
export default function HeldAxe(props: HeldAxeProps) {
  const [useGltf, setUseGltf] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(AXE_URL, { method: 'HEAD' })
      .then((r) => {
        if (!cancelled) setUseGltf(r.ok);
      })
      .catch(() => {
        if (!cancelled) setUseGltf(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (useGltf === null) return null;
  if (useGltf) return <HeldAxeGltf {...props} />;
  return <HeldAxeProcedural {...props} />;
}
