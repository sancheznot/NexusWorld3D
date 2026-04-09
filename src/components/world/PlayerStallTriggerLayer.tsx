'use client';

import TriggerZone from '@/components/world/TriggerZone';
import { PRODUCE_STALL_KIOSK } from '@/constants/playerStall';
import { useUIStore } from '@/store/uiStore';
import type { TriggerZoneData } from '@/types/trigger.types';

const ZONE: TriggerZoneData = {
  id: 'produce_stall_kiosk',
  kind: 'custom',
  name: 'Puesto de productos / Produce stand',
  position: PRODUCE_STALL_KIOSK.position,
  radius: PRODUCE_STALL_KIOSK.radius,
};

/**
 * ES: Fase 8 — mostrador en parcela A1; abre modal de compra / gestión.
 * EN: Phase 8 — produce stand kiosk on plot A1.
 */
export default function PlayerStallTriggerLayer({ mapId }: { mapId: string }) {
  const openProduceStallModal = useUIStore((s) => s.openProduceStallModal);

  if (mapId !== PRODUCE_STALL_KIOSK.mapId) return null;

  return (
    <TriggerZone
      data={ZONE}
      interactKeyCapture
      interactStopPropagation
      onInteract={() => {
        openProduceStallModal();
      }}
      debug={false}
    />
  );
}
