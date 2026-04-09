'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { getBuildPieceCatalogEntry } from '@/constants/buildPieces';
import { getBuildPlacementPreviewPose } from '@/lib/housing/housingClient';
import { useBuildPreviewStore } from '@/store/buildPreviewStore';
import { useGameWorldStore } from '@/store/gameWorldStore';

/**
 * ES: Fantasma de colocación (Fase 3) — sigue snap + rotación del jugador.
 * EN: Build placement ghost — follows snap + player facing.
 */
export default function BuildPreviewLayer() {
  const groupRef = useRef<THREE.Group>(null);
  const previewPieceId = useBuildPreviewStore((s) => s.previewPieceId);
  const activeMapId = useGameWorldStore((s) => s.activeMapId);

  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g || !previewPieceId || activeMapId !== 'exterior') return;
    const pose = getBuildPlacementPreviewPose();
    if (pose?.mapId === activeMapId) {
      g.position.set(pose.x, pose.y, pose.z);
      g.rotation.set(0, pose.rotY, 0);
    }
  }, [previewPieceId, activeMapId]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g || !previewPieceId || activeMapId !== 'exterior') return;
    const pose = getBuildPlacementPreviewPose();
    if (!pose || pose.mapId !== activeMapId) return;
    g.position.set(pose.x, pose.y, pose.z);
    g.rotation.set(0, pose.rotY, 0);
  });

  if (!previewPieceId || activeMapId !== 'exterior') return null;

  const def = getBuildPieceCatalogEntry(previewPieceId);
  if (!def) return null;

  const { w, h, d } = def.fallback;

  return (
    <group ref={groupRef} name="build-preview-layer">
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color="#5ec8ff"
          transparent
          opacity={0.38}
          depthWrite={false}
          metalness={0.08}
          roughness={0.45}
        />
      </mesh>
    </group>
  );
}
