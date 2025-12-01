'use client';

import TriggerZone from '@/components/world/TriggerZone';
import { jobsClient } from '@/lib/colyseus/JobsClient';
import PortalEffect from '@/components/world/PortalEffect';

interface TruckSpawnerProps {
  position: [number, number, number];
  onSpawn: () => void;
}

export default function TruckSpawner({ position, onSpawn }: TruckSpawnerProps) {
  // Check if player has the trucker role
  
  const hasTruckerRole = jobsClient.getCurrentJob()?.id === 'trucker';

  if (!hasTruckerRole) return null;

  return (
    <TriggerZone
      data={{
        id: 'truck_spawner',
        name: 'Spawnear Camión',
        position: { x: position[0], y: position[1], z: position[2] },
        radius: 3,
        kind: 'custom',
      }}
      onInteract={() => {
        console.log('🚚 Spawning truck...');
        onSpawn();
      }}
      debug={false}
      visibleRadius={20}
    >
      {/* Visual Marker for Truck Spawner */}
      <group position={[0, 1, 0]}>
        {/* Floating Icon or Text */}
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.5} />
        </mesh>
        {/* Add a small PortalEffect for the spawner too? User asked for 3D effects. */}
        <PortalEffect 
          position={[0, -1, 0]} 
          radius={2} 
          color="#f97316" 
          intensity={1}
          icon="🚛"
        />
      </group>
    </TriggerZone>
  );
}
