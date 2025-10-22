'use client';

import { Vector3 } from 'three';
import TriggerZone from './TriggerZone';
import type { TriggerZoneData } from '@/types/trigger.types';
import { economy } from '@/lib/services/economy';

interface BankTriggerProps {
  zone: TriggerZoneData;
  playerPosition: Vector3;
  userId: string;
  onOpenUI?: () => void;
}

export default function BankTrigger({ zone, playerPosition, userId, onOpenUI }: BankTriggerProps) {
  return (
    <TriggerZone
      data={zone}
      playerPosition={playerPosition}
      onEnter={() => { /* hint UI could show */ }}
      onExit={() => { /* hide hint */ }}
      onInteract={async () => {
        // For now, just log balance and open UI if provided
        const bal = await economy.getBalance(userId);
        console.log(`🏦 Balance (${economy.currency.symbol}${economy.currency.code}):`, bal);
        onOpenUI?.();
      }}
      debug={false}
    />
  );
}


