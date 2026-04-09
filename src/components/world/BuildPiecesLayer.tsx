'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  getBuildPieceCatalogEntry,
  getBuildPieceGlbUrl,
  isBuildPieceId,
} from '@/constants/buildPieces';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useHousingStore } from '@/store/housingStore';
import type { BuildPieceRecord } from '@/types/housing.types';

/** ES: Cache HEAD por URL en sesión. EN: Per-session HEAD cache by URL. */
const glbHeadOk = new Map<string, boolean>();

function pieceGlbLikelyExists(pieceId: string): Promise<boolean> {
  if (!isBuildPieceId(pieceId)) return Promise.resolve(false);
  const url = getBuildPieceGlbUrl(pieceId);
  if (glbHeadOk.has(url)) return Promise.resolve(glbHeadOk.get(url)!);
  return fetch(url, { method: 'HEAD' })
    .then((r) => {
      const ok = r.ok;
      glbHeadOk.set(url, ok);
      return ok;
    })
    .catch(() => {
      glbHeadOk.set(url, false);
      return false;
    });
}

function FallbackBox({ piece }: { piece: BuildPieceRecord }) {
  const def = getBuildPieceCatalogEntry(piece.pieceId);
  if (!def) return null;
  const { w, h, d, color } = def.fallback;
  return (
    <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

function GltfAtUrl({ pieceId }: { pieceId: string }) {
  const url = getBuildPieceGlbUrl(pieceId);
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clone} dispose={null} />;
}

function BuildPieceInstance({ piece }: { piece: BuildPieceRecord }) {
  const [gltfOk, setGltfOk] = useState(false);
  useEffect(() => {
    void pieceGlbLikelyExists(piece.pieceId).then(setGltfOk);
  }, [piece.pieceId]);

  return (
    <group position={[piece.x, piece.y, piece.z]}>
      {!gltfOk ? (
        <group rotation={[0, piece.rotY, 0]}>
          <FallbackBox piece={piece} />
        </group>
      ) : (
        <Suspense
          fallback={
            <group rotation={[0, piece.rotY, 0]}>
              <FallbackBox piece={piece} />
            </group>
          }
        >
          <group rotation={[0, piece.rotY, 0]}>
            <GltfAtUrl pieceId={piece.pieceId} />
          </group>
        </Suspense>
      )}
    </group>
  );
}

/**
 * ES: Piezas modulares Fase 3 — GLB en `/models/build/{pieceId}.glb` o primitivo del catálogo.
 * EN: Phase 3 modular pieces — GLB at `/models/build/{pieceId}.glb` or catalog primitive.
 */
export default function BuildPiecesLayer() {
  const activeMapId = useGameWorldStore((s) => s.activeMapId);
  const pieces = useHousingStore((s) => s.pieces);
  const visible = pieces.filter((q) => q.mapId === activeMapId);

  if (visible.length === 0) return null;

  return (
    <group name="build-pieces-layer">
      {visible.map((p) => (
        <BuildPieceInstance key={p.id} piece={p} />
      ))}
    </group>
  );
}
