'use client';

import { Vector3 } from 'three';
import { Portal } from '@/types/portal.types';
import TriggerZone from './TriggerZone';

interface PortalTriggerProps {
  portal: Portal;
  playerPosition: Vector3;
  onPlayerEnter: (portal: Portal) => void;
  onPlayerExit: () => void;
}

export default function PortalTrigger({ portal, playerPosition, onPlayerEnter, onPlayerExit }: PortalTriggerProps) {
  return (
    <TriggerZone
      data={{
        id: `portal-${portal.id}`,
        kind: 'portal',
        name: portal.name,
        position: portal.position,
        radius: portal.radius,
        data: { portal },
      }}
      playerPosition={playerPosition}
      onEnter={() => onPlayerEnter(portal)}
      onExit={() => onPlayerExit()}
      onInteract={() => onPlayerEnter(portal)}
      debug={false}
    />
  );
}
