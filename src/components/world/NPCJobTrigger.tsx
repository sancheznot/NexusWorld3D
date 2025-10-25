'use client';

import { Vector3 } from 'three';
import TriggerZone from './TriggerZone';
import { modelLoader } from '@/lib/three/modelLoader';
import { useEffect, useRef } from 'react';
import type { Object3D } from 'three';
import type { TriggerZoneData } from '@/types/trigger.types';
import { useUIStore } from '@/store/uiStore';
import jobsClient from '@/lib/colyseus/JobsClient';

interface NPCJobTriggerProps {
  zone: TriggerZoneData;
  playerPosition: Vector3;
  visual?: { path: string; type: 'glb' | 'gltf' | 'fbx' | 'obj'; scale?: number; rotation?: [number, number, number] };
}

export default function NPCJobTrigger({ zone, playerPosition, visual }: NPCJobTriggerProps) {
  const { toggleJobs } = useUIStore();
  const ref = useRef<Object3D | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!visual) return;
      try {
        const obj = await modelLoader.loadModel({
          name: zone.name,
          path: visual.path,
          type: visual.type,
          category: 'prop',
          scale: visual.scale ?? 1,
          rotation: visual.rotation,
          position: [zone.position.x, zone.position.y, zone.position.z],
        });
        if (!cancelled) ref.current = obj;
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [visual, zone]);
  return (
    <group>
      {ref.current && <primitive object={ref.current} />}
      <TriggerZone
        data={zone}
        playerPosition={playerPosition}
        onInteract={() => {
          toggleJobs();
          jobsClient.requestJobs();
        }}
        debug={false}
      />
    </group>
  );
}


