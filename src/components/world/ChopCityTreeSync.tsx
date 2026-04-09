'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { WorldMessages } from '@nexusworld3d/protocol';
import { colyseusClient } from '@/lib/colyseus/client';
import { CITY_TREE_CHOP_PREFIX } from '@/constants/choppableTrees';
import type { TreeSyncPayload } from '@/lib/gameplay/treeChopActions';

/**
 * ES: Oculta/muestra meshes del city.glb según `world:tree-sync` (tocón ct_*).
 * EN: Toggles city tree mesh visibility from server stump/respawn sync.
 */
export default function ChopCityTreeSync() {
  const { scene } = useThree();
  const lastSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (data: TreeSyncPayload) => {
      if (!data.treeId?.startsWith(CITY_TREE_CHOP_PREFIX)) return;
      const visible = data.state === 'active';
      scene.traverse((o) => {
        if (o.userData?.choppableTreeId === data.treeId) {
          o.visible = visible;
        }
      });
    };

    const attach = () => {
      const room = colyseusClient.getSocket();
      if (!room?.sessionId || room.sessionId === lastSessionRef.current) return;
      lastSessionRef.current = room.sessionId;
      room.onMessage(WorldMessages.TreeSync, handler);
    };

    colyseusClient.on("room:connected", attach);
    if (colyseusClient.isConnectedToWorldRoom()) attach();
    return () => {
      colyseusClient.off("room:connected", attach);
    };
  }, [scene]);

  return null;
}
