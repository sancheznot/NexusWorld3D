'use client';

import { Portal } from '@/types/portal.types';
import TriggerZone from './TriggerZone';
import PortalEffect from './PortalEffect';

interface PortalTriggerProps {
  portal: Portal;
  onPlayerEnter: (portal: Portal) => void;
  onPlayerExit: () => void;
}

export default function PortalTrigger({ portal, onPlayerEnter, onPlayerExit }: PortalTriggerProps) {
  return (
    <group>
      {/* Efecto visual del portal */}
      <PortalEffect
        position={[portal.position.x, portal.position.y, portal.position.z]}
        radius={portal.radius}
        color={portal.icon === '🏨' ? '#ff6b35' : 
               portal.icon === '🚔' ? '#3b82f6' :
               portal.icon === '🏥' ? '#ef4444' :
               portal.icon === '🏦' ? '#10b981' :
               portal.icon === '🛒' ? '#f59e0b' : '#ff6b35'}
        intensity={1} // Reducido de 2 a 1
        icon={portal.icon}
      />
      
      {/* Zona de trigger */}
      <TriggerZone
        data={{
          id: `portal-${portal.id}`,
          kind: 'portal',
          name: portal.name,
          position: portal.position,
          radius: portal.radius,
          data: { portal },
        }}
        onEnter={() => onPlayerEnter(portal)}
        onExit={() => onPlayerExit()}
        onInteract={() => onPlayerEnter(portal)}
        debug={false}
      />
    </group>
  );
}
