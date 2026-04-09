'use client';

import { useEffect, useRef } from 'react';
import { colyseusClient } from '@/lib/colyseus/client';
import { usePlayerStore } from '@/store/playerStore';

const SYNC_MS = 100;

/**
 * ES: Envía posición/rotación del store al servidor (autoridad para persistencia).
 * PlayerV2+Cannon actualiza el store en useFrame; useKeyboard no siempre coincide.
 * EN: Pushes store pose to server for DB/redis persistence (physics is source of truth).
 */
export function useServerMovementSync(enabled: boolean) {
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!colyseusClient.getSocket()?.connection.isOpen) return;
      const now = Date.now();
      if (now - lastSentRef.current < SYNC_MS) return;
      lastSentRef.current = now;

      const s = usePlayerStore.getState();
      colyseusClient.movePlayer({
        position: s.position,
        rotation: s.rotation,
        velocity: s.velocity,
        isMoving: s.isMoving,
        isRunning: s.isRunning,
        isJumping: s.isJumping,
        animation: s.currentAnimation || 'idle',
        timestamp: now,
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      if (!colyseusClient.getSocket()?.connection.isOpen) return;
      const s = usePlayerStore.getState();
      colyseusClient.movePlayer({
        position: s.position,
        rotation: s.rotation,
        velocity: s.velocity,
        isMoving: s.isMoving,
        isRunning: s.isRunning,
        isJumping: s.isJumping,
        animation: s.currentAnimation || 'idle',
        timestamp: Date.now(),
      });
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
    };
  }, [enabled]);
}
