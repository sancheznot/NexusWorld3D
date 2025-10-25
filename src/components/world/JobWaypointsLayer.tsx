'use client';

import { useEffect, useMemo, useState } from 'react';
import { Vector3 } from 'three';
import JobWaypointTrigger from './JobWaypointTrigger';
import jobsClient from '@/lib/colyseus/JobsClient';

interface WaypointInfo {
  waypointId: string;
  label?: string;
  waitSeconds?: number;
  position?: { x: number; y: number; z: number };
  mapId?: string;
}

export default function JobWaypointsLayer({ currentMap, playerPosition }: { currentMap: string; playerPosition: Vector3 }) {
  const [next, setNext] = useState<WaypointInfo | null>(null);

  useEffect(() => {
    const onNext = (data: unknown) => setNext(data as WaypointInfo);
    const onStarted = () => setNext(null);
    jobsClient.on('jobs:next', onNext);
    jobsClient.on('jobs:started', onStarted);
    return () => {
      jobsClient.off('jobs:next', onNext);
      jobsClient.off('jobs:started', onStarted);
    };
  }, []);

  const zone = useMemo(() => {
    if (!next) return null;
    // Si el servidor da posición/mapa del siguiente punto, úsalo para renderizar el gatillo ahí.
    const pos = next.position ?? { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z };
    return {
      id: next.waypointId,
      kind: 'job' as const,
      name: next.label ?? 'Siguiente punto',
      position: { x: pos.x, y: pos.y, z: pos.z },
      radius: 2,
    };
  }, [next, playerPosition.x, playerPosition.y, playerPosition.z]);

  if (!zone) return null;
  return <JobWaypointTrigger zone={zone} playerPosition={playerPosition} />;
}


