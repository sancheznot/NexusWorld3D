'use client';

import TriggerZone from '@/components/world/TriggerZone';
import {
  HOUSING_PLOT_TRIGGERS,
  housingPlotTriggerToZone,
} from '@/constants/housingPlotTriggers';
import { useUIStore } from '@/store/uiStore';

/**
 * ES: Zonas E para abrir modal de lote (Fase 4). EN: E-zones to open plot modal.
 */
export default function HousingPlotTriggerLayer({ mapId }: { mapId: string }) {
  const openHousingPlotModal = useUIStore((s) => s.openHousingPlotModal);
  const triggers = HOUSING_PLOT_TRIGGERS.filter((t) => t.mapId === mapId);

  if (triggers.length === 0) return null;

  return (
    <group name="housing-plot-triggers">
      {triggers.map((def) => (
        <TriggerZone
          key={def.id}
          data={housingPlotTriggerToZone(def)}
          interactKeyCapture
          interactStopPropagation
          onInteract={() => {
            openHousingPlotModal(def.plotId);
          }}
        />
      ))}
    </group>
  );
}
