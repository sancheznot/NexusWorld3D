'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { getHousingPlotById } from '@/constants/housingPlots';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useHousingStore } from '@/store/housingStore';

const Y = 0.07;

/**
 * ES: Rectángulo en suelo del lote que posees (orientación). EN: Ground outline of owned plot.
 */
export default function HousingPlotBoundsLayer() {
  const activeMapId = useGameWorldStore((s) => s.activeMapId);
  const ownedPlotId = useHousingStore((s) => s.ownedPlotId);

  const points = useMemo(() => {
    if (!ownedPlotId) return null;
    const plot = getHousingPlotById(ownedPlotId);
    if (!plot || plot.mapId !== activeMapId) return null;
    const { minX, maxX, minZ, maxZ } = plot;
    return [
      [minX, Y, minZ],
      [maxX, Y, minZ],
      [maxX, Y, maxZ],
      [minX, Y, maxZ],
      [minX, Y, minZ],
    ] as [number, number, number][];
  }, [ownedPlotId, activeMapId]);

  if (!points) return null;

  return (
    <group name="housing-plot-bounds">
      <Line
        points={points}
        color="#4ade80"
        lineWidth={1.5}
        transparent
        opacity={0.75}
      />
    </group>
  );
}
