'use client';

import { useEffect } from 'react';
import GameCanvas from '@/components/game/GameCanvas';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerStore } from '@/store/playerStore';

export default function GamePage() {
  const { isConnected, connect } = useSocket();
  const { setPlayer } = usePlayerStore();

  // Initialize player data
  useEffect(() => {
    const playerData = {
      id: `player-${Date.now()}`,
      username: 'Jugador Test',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
      worldId: 'default',
      isOnline: true,
      lastSeen: new Date(),
    };

    setPlayer(playerData);
  }, [setPlayer]);

  // Connect to socket when component mounts
  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  return (
    <div className="w-full h-screen overflow-hidden">
      <GameCanvas />
    </div>
  );
}
