'use client';

import { Vector3 } from 'three';
import TriggerZone from './TriggerZone';
import type { TriggerZoneData } from '@/types/trigger.types';
import jobsClient from '@/lib/colyseus/JobsClient';

interface JobWaypointTriggerProps {
  zone: TriggerZoneData;
  playerPosition: Vector3;
}

export default function JobWaypointTrigger({ zone, playerPosition }: JobWaypointTriggerProps) {
  return (
    <TriggerZone
      data={zone}
      playerPosition={playerPosition}
      onInteract={() => jobsClient.hitWaypoint(zone.id)}
      debug={false}
    />
  );
}


