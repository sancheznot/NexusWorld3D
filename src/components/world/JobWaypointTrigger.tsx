'use client';


import TriggerZone from './TriggerZone';
import type { TriggerZoneData } from '@/types/trigger.types';
import jobsClient from '@/lib/colyseus/JobsClient';

interface JobWaypointTriggerProps {
  zone: TriggerZoneData;
}

export default function JobWaypointTrigger({ zone }: JobWaypointTriggerProps) {
  return (
    <TriggerZone
      data={zone}
      onInteract={() => jobsClient.hitWaypoint(zone.id)}
      debug={false}
    />
  );
}


