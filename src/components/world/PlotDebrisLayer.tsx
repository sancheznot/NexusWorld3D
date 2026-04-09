'use client';

import { useMemo } from 'react';
import {
  PLOT_DEBRIS_TEMPLATES,
  type PlotDebrisTemplateItem,
} from '@/constants/housingPlotDebris';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useHousingStore } from '@/store/housingStore';

function DebrisMesh({ item }: { item: PlotDebrisTemplateItem }) {
  if (item.kind === 'rock') {
    return (
      <group position={[item.x, item.y, item.z]}>
        <mesh
          castShadow
          receiveShadow
          rotation={[0.25, item.x * 0.08, 0.12]}
        >
          <dodecahedronGeometry args={[0.52, 0]} />
          <meshStandardMaterial
            color="#64748b"
            roughness={0.92}
            metalness={0.08}
          />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[item.x, item.y, item.z]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.42, 0.48, 6]} />
        <meshStandardMaterial
          color="#4d7c0f"
          roughness={0.96}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

/**
 * ES: Escombros de plantilla en parcela (Fase 5) — ocultos cuando `clearedPlotDebrisIds` los incluye.
 * EN: Template plot debris (Phase 5) — hidden when cleared in sync payload.
 */
export default function PlotDebrisLayer() {
  const activeMapId = useGameWorldStore((s) => s.activeMapId);
  const cleared = useHousingStore((s) => s.clearedPlotDebrisIds);
  const clearedSet = useMemo(() => new Set(cleared), [cleared]);
  const visible = PLOT_DEBRIS_TEMPLATES.filter(
    (d) => d.mapId === activeMapId && !clearedSet.has(d.id)
  );

  if (visible.length === 0) return null;

  return (
    <group name="plot-debris-layer">
      {visible.map((d) => (
        <DebrisMesh key={d.id} item={d} />
      ))}
    </group>
  );
}
