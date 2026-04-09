'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WorldMessages } from '@nexusworld3d/protocol';
import { colyseusClient } from '@/lib/colyseus/client';
import {
  CHOPPABLE_PROP_TREES,
  type ChoppableTreeDef,
} from '@/constants/choppableTrees';
import type { TreeSyncPayload } from '@/lib/gameplay/treeChopActions';

interface ChoppableTreesLayerProps {
  mapId: string;
}

function TreeInstance({ def, isStump }: { def: ChoppableTreeDef; isStump: boolean }) {
  const r = def.trunkRadius ?? 0.35;
  const crownH = def.crownHeight ?? 3;

  if (isStump) {
    return (
      <group position={[def.position.x, def.position.y, def.position.z]}>
        <mesh position={[0, r * 0.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r * 1.1, r * 1.2, r * 1.2, 10]} />
          <meshStandardMaterial color="#4a3728" roughness={0.9} />
        </mesh>
      </group>
    );
  }

  return (
    <group
      position={[def.position.x, def.position.y, def.position.z]}
      userData={{ choppableTreeId: def.id, choppableProp: true }}
    >
      <group userData={{ choppableTreeId: def.id, choppableProp: true }}>
        <mesh position={[0, crownH * 0.55, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r * 0.45, r * 0.55, crownH, 10]} />
          <meshStandardMaterial color="#2d5016" roughness={0.85} />
        </mesh>
        <mesh position={[0, r * 1.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r * 0.95, r * 2.4, 10]} />
          <meshStandardMaterial color="#5c4033" roughness={0.88} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * ES: Árboles talables + sync `world:tree-sync` del servidor.
 * EN: Choppable trees + server stump/respawn sync.
 */
export default function ChoppableTreesLayer({ mapId }: ChoppableTreesLayerProps) {
  const mapIdRef = useRef(mapId);
  mapIdRef.current = mapId;

  const trees = useMemo(
    () => CHOPPABLE_PROP_TREES.filter((t) => t.mapId === mapId),
    [mapId]
  );

  const [stumpUntil, setStumpUntil] = useState<Record<string, number>>({});
  const lastSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (data: TreeSyncPayload) => {
      if (data.mapId !== mapIdRef.current) return;
      setStumpUntil((prev) => {
        const next = { ...prev };
        if (data.state === 'stump' && data.respawnAt) {
          next[data.treeId] = data.respawnAt;
        } else if (data.state === 'active') {
          delete next[data.treeId];
        }
        return next;
      });
    };

    const attach = () => {
      const room = colyseusClient.getSocket();
      if (!room?.sessionId || room.sessionId === lastSessionRef.current) return;
      lastSessionRef.current = room.sessionId;
      room.onMessage(WorldMessages.TreeSync, handler);
    };

    colyseusClient.on('room:connected', attach);
    if (colyseusClient.isConnectedToWorldRoom()) attach();
    return () => {
      colyseusClient.off('room:connected', attach);
    };
  }, []);

  const wallNow = Date.now();

  return (
    <>
      {trees.map((def) => {
        const until = stumpUntil[def.id] ?? 0;
        const isStump = until > wallNow;
        return (
          <TreeInstance
            key={def.id}
            def={def}
            isStump={isStump}
          />
        );
      })}
    </>
  );
}
