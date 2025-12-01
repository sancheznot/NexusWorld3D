'use client';

import TriggerZone from './TriggerZone';
import { jobsClient } from '@/lib/colyseus/JobsClient';
import PortalEffect from './PortalEffect';
import { TriggerZoneData } from '@/types/trigger.types';

interface JobWaypointTriggerProps {
  zone: TriggerZoneData;
}

export default function JobWaypointTrigger({ zone }: JobWaypointTriggerProps) {
  return (
    <TriggerZone
      data={zone}
      // Auto-trigger when entering the zone
      onEnter={() => {
        console.log('🚚 Arrived at waypoint:', zone.id);
        jobsClient.hitWaypoint(zone.id);
      }}
      debug={false}
      visibleRadius={50} // Visible from far away
    >
      {/* Visual Effect */}
      <PortalEffect 
        position={[0, 0, 0]} 
        radius={zone.radius} 
        color="#f97316" // Orange
        intensity={2}
        icon="🚚"
      />
    </TriggerZone>
  );
}


