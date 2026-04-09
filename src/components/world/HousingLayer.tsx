'use client';

import { useMemo } from 'react';
import { useHousingStore } from '@/store/housingStore';
import { useGameWorldStore } from '@/store/gameWorldStore';

/**
 * ES: Cabañas / estructuras Fase 1 (primitiva + material). EN: Phase 1 structures (primitive mesh).
 */
export default function HousingLayer() {
  const activeMapId = useGameWorldStore((s) => s.activeMapId);
  const structures = useHousingStore((s) => s.structures);
  const visible = useMemo(
    () => structures.filter((s) => s.mapId === activeMapId),
    [structures, activeMapId]
  );

  if (visible.length === 0) return null;

  return (
    <group name="housing-layer">
      {visible.map((s) => {
        const tier = s.tier === 2 ? 2 : 1;
        const wall =
          tier === 2
            ? { main: "#6b6b6e", door: "#3a3a3d" }
            : { main: "#5c4033", door: "#3d2918" };
        return (
          <group
            key={s.id}
            position={[s.x, s.y, s.z]}
            rotation={[0, s.rotY, 0]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[4, 2.6, 4]} />
              <meshStandardMaterial
                color={wall.main}
                metalness={tier === 2 ? 0.12 : 0.05}
                roughness={tier === 2 ? 0.72 : 0.88}
              />
            </mesh>
            <mesh position={[0, 1.35, 2.05]}>
              <boxGeometry args={[1.1, 1.4, 0.12]} />
              <meshStandardMaterial color={wall.door} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
