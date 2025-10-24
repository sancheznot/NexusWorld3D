'use client';

import { useEffect, useState } from 'react';
import { useTimeStore } from '@/store/timeStore';
import timeClient from '@/lib/colyseus/TimeClient';
import { colyseusClient } from '@/lib/colyseus/client';
import { TimeStateResponse, TimeUpdateResponse } from '@/types/time-sync.types';

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

export default function ServerClock({ className = '' }: { className?: string }) {
  const setFromServer = useTimeStore((s) => s.setFromServer);
  const phase = useTimeStore((s) => s.phase);
  const baseHour = useTimeStore((s) => s.hour);
  const baseMinute = useTimeStore((s) => s.minute);
  const baseSecond = useTimeStore((s) => s.second);
  const lastSyncClientMs = useTimeStore((s) => s.lastSyncClientMs);

  const [isHydrated, setIsHydrated] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setIsHydrated(true);
    const onState = (data: TimeStateResponse) => setFromServer(data);
    const onUpdate = (data: TimeUpdateResponse) => setFromServer(data);
    timeClient.onTimeState(onState);
    timeClient.onTimeUpdate(onUpdate);
    const onConnected = () => timeClient.requestTime();
    colyseusClient.on('room:connected', onConnected);
    timeClient.requestTime();
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      timeClient.off('time:state', onState as unknown as (d: unknown) => void);
      timeClient.off('time:update', onUpdate as unknown as (d: unknown) => void);
      colyseusClient.off('room:connected', onConnected as unknown as (...args: unknown[]) => void);
      clearInterval(interval);
    };
  }, [setFromServer]);

  // During SSR (not hydrated), render a stable placeholder to avoid mismatches
  if (!isHydrated) {
    const phaseEmoji = phase === 'day' ? '🌞' : phase === 'night' ? '🌙' : phase === 'dawn' ? '🌅' : '🌇';
    return (
      <div className={`bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded font-mono border border-gray-700 ${className}`}>
        <span className="mr-2">{phaseEmoji}</span>
        <span suppressHydrationWarning>—:—:—</span>
      </div>
    );
  }

  let hh = baseHour, mm = baseMinute, ss = baseSecond;
  if (lastSyncClientMs) {
    const elapsed = Math.floor((Date.now() - lastSyncClientMs) / 1000);
    let total = (baseHour * 3600) + (baseMinute * 60) + baseSecond + elapsed;
    total = ((total % 86400) + 86400) % 86400; // wrap 0..86399
    hh = Math.floor(total / 3600);
    mm = Math.floor((total % 3600) / 60);
    ss = total % 60;
  }

  const timeText = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
  const phaseEmoji = phase === 'day' ? '🌞' : phase === 'night' ? '🌙' : phase === 'dawn' ? '🌅' : '🌇';

  return (
    <div className={`bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded font-mono border border-gray-700 ${className}`}>
      <span className="mr-2">{phaseEmoji}</span>
      <span suppressHydrationWarning>{timeText}</span>
    </div>
  );
}
