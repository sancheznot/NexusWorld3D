'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WorldMessages } from '@nexusworld3d/protocol';
import { colyseusClient } from '@/lib/colyseus/client';
import {
  MINEABLE_PROP_ROCKS,
  type MineableRockDef,
} from '@/constants/mineableRocks';
import type { RockSyncPayload } from '@/lib/gameplay/rockMineActions';

interface MineableRocksLayerProps {
  mapId: string;
}

function RockInstance({ def, isRubble }: { def: MineableRockDef; isRubble: boolean }) {
  const s = isRubble ? 0.35 : 0.55;

  return (
    <group
      position={[def.position.x, def.position.y, def.position.z]}
      userData={{ mineableRockId: def.id, mineableProp: true }}
    >
      <group userData={{ mineableRockId: def.id, mineableProp: true }}>
        <mesh position={[0, s * 0.45, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[s, 0]} />
          <meshStandardMaterial
            color={isRubble ? '#6b6b6b' : '#7a7a82'}
            roughness={0.92}
            flatShading
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * ES: Rocas minables + sync `world:rock-sync` (escombros / reaparición).
 * EN: Mineable rocks + server rubble/respawn sync.
 */
export default function MineableRocksLayer({ mapId }: MineableRocksLayerProps) {
  const mapIdRef = useRef(mapId);
  mapIdRef.current = mapId;

  const rocks = useMemo(
    () => MINEABLE_PROP_ROCKS.filter((r) => r.mapId === mapId),
    [mapId]
  );

  const [rubbleUntil, setRubbleUntil] = useState<Record<string, number>>({});
  const lastSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (data: RockSyncPayload) => {
      if (data.mapId !== mapIdRef.current) return;
      setRubbleUntil((prev) => {
        const next = { ...prev };
        if (data.state === 'rubble' && data.respawnAt) {
          next[data.rockId] = data.respawnAt;
        } else if (data.state === 'active') {
          delete next[data.rockId];
        }
        return next;
      });
    };

    const attach = () => {
      const room = colyseusClient.getSocket();
      if (!room?.sessionId || room.sessionId === lastSessionRef.current) return;
      lastSessionRef.current = room.sessionId;
      room.onMessage(WorldMessages.RockSync, handler);
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
      {rocks.map((def) => {
        const until = rubbleUntil[def.id] ?? 0;
        const isRubble = until > wallNow;
        return (
          <RockInstance key={def.id} def={def} isRubble={isRubble} />
        );
      })}
    </>
  );
}
