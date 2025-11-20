'use client';

import { useEffect, useMemo, useState } from 'react';
import { Vector3 } from 'three';
import JobWaypointTrigger from './JobWaypointTrigger';
import TriggerZone from './TriggerZone';
import jobsClient from '@/lib/colyseus/JobsClient';
import { JOBS } from '@/constants/jobs';
import type { ExtendedJobId } from '@/constants/jobs';
import { useUIStore } from '@/store/uiStore';

interface WaypointInfo {
  waypointId: string;
  label?: string;
  waitSeconds?: number;
  position?: { x: number; y: number; z: number };
  mapId?: string;
}

interface StartZoneInfo {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  radius: number;
  jobId: ExtendedJobId;
  requiresVehicle: boolean;
}

interface JobWaypointsLayerProps {
  currentMap: string;
  playerPosition: Vector3;
  playerRoleId: ExtendedJobId | null;
  isDriving: boolean;
}

export default function JobWaypointsLayer({ currentMap, playerPosition, playerRoleId, isDriving }: JobWaypointsLayerProps) {
  const addNotification = useUIStore(state => state.addNotification);
  const [next, setNext] = useState<WaypointInfo | null>(null);
  const [activeJobId, setActiveJobId] = useState<ExtendedJobId | null>(null);

  useEffect(() => {
    const onNext = (data: unknown) => setNext(data as WaypointInfo);
    const onStarted = (data: unknown) => {
      const payload = data as { jobId: string };
      setActiveJobId(payload.jobId as ExtendedJobId);
      setNext(null);
    };
    const onCompleted = () => {
      setActiveJobId(null);
      setNext(null);
    };
    const onCancelled = () => {
      setActiveJobId(null);
      setNext(null);
    };

    jobsClient.on('jobs:next', onNext);
    jobsClient.on('jobs:started', onStarted);
    jobsClient.on('jobs:completed', onCompleted);
    jobsClient.on('jobs:cancelled', onCancelled);

    return () => {
      jobsClient.off('jobs:next', onNext);
      jobsClient.off('jobs:started', onStarted);
      jobsClient.off('jobs:completed', onCompleted);
      jobsClient.off('jobs:cancelled', onCancelled);
    };
  }, []);

  const startZone = useMemo<StartZoneInfo | null>(() => {
    if (!playerRoleId) return null;
    if (activeJobId) return null;
    const cfg = JOBS[playerRoleId];
    if (!cfg) return null;
    if (cfg.mapId !== currentMap) return null;
    if (!cfg.start) return null;
    return {
      id: cfg.start.id,
      name: cfg.start.label ?? `Inicio ${cfg.name}`,
      position: cfg.start.position,
      radius: cfg.start.radius ?? 2,
      jobId: cfg.id,
      requiresVehicle: cfg.start.requiresVehicle ?? false,
    };
  }, [playerRoleId, activeJobId, currentMap]);

  const nextZone = useMemo(() => {
    if (!next) return null;
    if (next.mapId && next.mapId !== currentMap) return null;
    const pos = next.position ?? { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z };
    return {
      id: next.waypointId,
      kind: 'job' as const,
      name: next.label ?? 'Siguiente punto',
      position: { x: pos.x, y: pos.y, z: pos.z },
      radius: 2,
    };
  }, [next, currentMap, playerPosition.x, playerPosition.y, playerPosition.z]);

  const handleStartInteract = () => {
    if (!startZone) return;
    if (startZone.requiresVehicle && !isDriving) {
      addNotification({
        id: `job-start-${Date.now()}`,
        type: 'warning',
        title: 'Necesitas un vehículo',
        message: 'Debes estar conduciendo para iniciar esta ruta.',
        duration: 4000,
        timestamp: new Date(),
      });
      return;
    }
    jobsClient.start(startZone.jobId);
  };

  if (!startZone && !nextZone) return null;

  return (
    <>
      {startZone && (
        <TriggerZone
          key={startZone.id}
          data={{
            id: startZone.id,
            kind: 'job',
            name: startZone.name,
            position: startZone.position,
            radius: startZone.radius,
          }}
          playerPosition={playerPosition}
          onInteract={handleStartInteract}
          debug={false}
        />
      )}
      {nextZone && <JobWaypointTrigger zone={nextZone} playerPosition={playerPosition} />}
    </>
  );
}
