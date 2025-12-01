'use client';

import { Vector3 } from 'three';
import TriggerZone from './TriggerZone';
import type { TriggerZoneData } from '@/types/trigger.types';
import { economy } from '@/lib/services/economy';
import { GAME_CONFIG } from '@/constants/game';
import { useUIStore } from '@/store/uiStore';

interface BankTriggerProps {
  zone: TriggerZoneData;
  playerPosition: Vector3;
  userId: string;
  onOpenUI?: () => void;
}

export default function BankTrigger({ zone, playerPosition, userId, onOpenUI }: BankTriggerProps) {
  const { toggleBank } = useUIStore();
  return (
    <TriggerZone
      data={zone}

      onEnter={() => { /* hint UI could show */ }}
      onExit={() => { /* hide hint */ }}
      onInteract={async () => {
        // For now, just log balance and open UI if provided
        const bal = await economy.getBalance(userId);
        console.log(`🏦 Balance (${GAME_CONFIG.currency.symbol}${GAME_CONFIG.currency.code}):`, economy.format(bal));
        onOpenUI?.();
        toggleBank();
      }}
      debug={false}
    />
  );
}


