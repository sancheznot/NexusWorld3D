'use client';

import { create } from 'zustand';
import { DayPhase, TimeState } from '@/types/time-sync.types';

interface TimeStateStore extends TimeState {
  offsetMs: number;
  lastSyncClientMs: number;
  setFromServer: (state: TimeState) => void;
  getEstimatedServerDate: () => Date;
}

const defaultNow = new Date();

export const useTimeStore = create<TimeStateStore>((set, get) => ({
  serverTimestamp: defaultNow.getTime(),
  iso: defaultNow.toISOString(),
  hour: defaultNow.getHours(),
  minute: defaultNow.getMinutes(),
  second: defaultNow.getSeconds(),
  dayOfWeek: defaultNow.getDay(),
  phase: 'day' as DayPhase,
  ambientFactor: 1,
  sunFactor: 1,
  offsetMs: 0,
  lastSyncClientMs: defaultNow.getTime(),

  setFromServer: (state: TimeState) => {
    const clientNow = Date.now();
    const offsetMs = state.serverTimestamp - clientNow;
    set({
      ...state,
      offsetMs,
      lastSyncClientMs: clientNow,
    });
  },

  getEstimatedServerDate: () => {
    const { serverTimestamp, lastSyncClientMs } = get();
    const clientNow = Date.now();
    const drift = clientNow - lastSyncClientMs;
    const est = serverTimestamp + drift;
    return new Date(est);
  },
}));

export function computePhaseFromHour(hour: number): DayPhase {
  if (hour < 5) return 'night';
  if (hour < 7) return 'dawn';
  if (hour < 18) return 'day';
  if (hour < 20) return 'dusk';
  return 'night';
}
