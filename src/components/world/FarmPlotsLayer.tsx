'use client';

import { useEffect, useMemo, useState } from 'react';
import { Text } from '@react-three/drei';
import TriggerZone from '@/components/world/TriggerZone';
import {
  FARM_CROPS,
  listFarmSlotsForOwnedPlot,
  type FarmSlotTemplate,
} from '@/constants/farmPlots';
import { interactFarmSlot } from '@/lib/housing/housingClient';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useHousingStore } from '@/store/housingStore';
import type { HousingFarmSlotRecord } from '@/types/housing.types';
import type { TriggerZoneData } from '@/types/trigger.types';

function FarmSlotInstance({
  tpl,
  record,
}: {
  tpl: FarmSlotTemplate;
  record: HousingFarmSlotRecord | undefined;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const { progress, ready, label } = useMemo(() => {
    if (!record) {
      return {
        progress: 0,
        ready: false,
        label: 'Vacío [E] sembrar / Empty [E] plant',
      };
    }
    const def = FARM_CROPS.crop_lettuce;
    if (record.cropId !== def.id) {
      return {
        progress: 0,
        ready: false,
        label: 'Cultivo… / Crop',
      };
    }
    const elapsed = Math.max(0, tick - record.plantedAt);
    const p = Math.min(1, elapsed / def.growTimeMs);
    const r = p >= 1;
    return {
      progress: p,
      ready: r,
      label: r ? 'Listo [E] / Ready' : 'Creciendo… / Growing',
    };
  }, [record, tick]);

  const zone: TriggerZoneData = {
    id: `farm_slot_${tpl.slotIndex}`,
    kind: 'farm_slot',
    name: `Huerto ${tpl.slotIndex + 1} / Plot ${tpl.slotIndex + 1}`,
    position: { x: tpl.x, y: tpl.y, z: tpl.z },
    radius: tpl.radius,
  };

  return (
    <TriggerZone
      data={zone}
      interactKeyCapture
      interactStopPropagation
      onInteract={() => {
        interactFarmSlot(tpl.slotIndex);
      }}
      debug={false}
    >
      {!record ? (
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[1.2, 0.12, 0.9]} />
          <meshStandardMaterial color="#5c4d3d" roughness={0.95} metalness={0} />
        </mesh>
      ) : (
        <group>
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[1.2, 0.12, 0.9]} />
            <meshStandardMaterial color="#4a3f35" roughness={0.95} metalness={0} />
          </mesh>
          <mesh
            position={[0, 0.12 + (0.15 + progress * 0.55) / 2, 0]}
            castShadow
          >
            <boxGeometry args={[0.85, 0.15 + progress * 0.55, 0.75]} />
            <meshStandardMaterial
              color={ready ? '#4ade80' : '#22c55e'}
              roughness={0.88}
              metalness={0.02}
              emissive={ready ? '#14532d' : '#000000'}
              emissiveIntensity={ready ? 0.25 : 0}
            />
          </mesh>
        </group>
      )}
      <Text
        position={[0, 1.15, 0]}
        fontSize={0.38}
        color="#ecfccb"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </TriggerZone>
  );
}

/**
 * ES: Huerto Fase 7 — bancales en parcela poseída; [E] planta/cosecha.
 * EN: Phase 7 plot farm — [E] to plant/harvest.
 */
export default function FarmPlotsLayer({ mapId }: { mapId: string }) {
  const ownedPlotId = useHousingStore((s) => s.ownedPlotId);
  const farmSlots = useHousingStore((s) => s.farmSlots);
  const activeMapId = useGameWorldStore((s) => s.activeMapId);

  const slots = useMemo(
    () => listFarmSlotsForOwnedPlot(ownedPlotId, mapId),
    [ownedPlotId, mapId]
  );

  const bySlot = useMemo(() => {
    const m = new Map<number, HousingFarmSlotRecord>();
    for (const s of farmSlots) {
      if (s.mapId === mapId) m.set(s.slotIndex, s);
    }
    return m;
  }, [farmSlots, mapId]);

  if (slots.length === 0 || activeMapId !== mapId) return null;

  return (
    <group name="farm-plots-layer">
      {slots.map((tpl) => (
        <FarmSlotInstance
          key={tpl.slotIndex}
          tpl={tpl}
          record={bySlot.get(tpl.slotIndex)}
        />
      ))}
    </group>
  );
}
