import { useEffect, useRef, useState } from 'react';
import { socketClient } from '@/lib/socket/client';
import { usePlayerStore } from '@/store/playerStore';
import { useWorldStore } from '@/store/worldStore';
import { useUIStore } from '@/store/uiStore';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { setPlayer, updatePosition, updateHealth, updateStamina, updateLevel, updateExperience } = usePlayerStore();
  const { addPlayer, removePlayer, updatePlayer, setPlayers } = useWorldStore();
  const { addChatMessage, addNotification } = useUIStore();

  // Connect to socket server
  const connect = async () => {
    try {
      setConnectionError(null);
      await socketClient.connect();
      setIsConnected(true);
      console.log('✅ Conectado al servidor Socket.IO');
    } catch (error) {
      console.error('❌ Error conectando al servidor:', error);
      setConnectionError(error instanceof Error ? error.message : 'Error desconocido');
      setIsConnected(false);
    }
  };

  // Join game with player data
  const joinGame = (playerId: string, username: string, worldId: string = 'default') => {
    if (isConnected) {
      socketClient.joinPlayer({
        playerId,
        username,
        worldId
      });
    }
  };

  // Disconnect from socket server
  const disconnect = () => {
    socketClient.disconnect();
    setIsConnected(false);
  };

  // Setup event listeners
  useEffect(() => {
    if (!socketClient.getSocket()) return;

    // Player events
    socketClient.onPlayerJoined((data) => {
      console.log('👤 Jugador se unió:', data);
      if (data.player) {
        addPlayer(data.player);
      }
      if (data.players) {
        setPlayers(data.players);
      }
    });

    socketClient.onPlayerLeft((data) => {
      console.log('👤 Jugador salió:', data);
      if (data.playerId) {
        removePlayer(data.playerId);
      }
      if (data.players) {
        setPlayers(data.players);
      }
    });

    socketClient.onPlayerMoved((data) => {
      console.log('🚶 Jugador se movió:', data);
      if (data.playerId && data.movement) {
        updatePlayer(data.playerId, {
          position: data.movement.position,
          rotation: data.movement.rotation,
        });
      }
    });

    socketClient.onPlayerAttacked((data) => {
      console.log('⚔️ Ataque:', data);
      addNotification({
        id: `attack-${Date.now()}`,
        type: 'info',
        title: 'Ataque',
        message: `Jugador atacó por ${data.damage} de daño`,
        duration: 3000,
        timestamp: new Date(),
      });
    });

    socketClient.onPlayerDamaged((data) => {
      console.log('💥 Daño recibido:', data);
      if (data.playerId) {
        updatePlayer(data.playerId, { health: data.newHealth });
      }
      updateHealth(data.newHealth);
    });

    socketClient.onPlayerDied((data) => {
      console.log('💀 Jugador murió:', data);
      addNotification({
        id: `death-${Date.now()}`,
        type: 'error',
        title: 'Muerte',
        message: `Jugador murió. Respawn en ${data.respawnTime}s`,
        duration: 5000,
        timestamp: new Date(),
      });
    });

    socketClient.onPlayerRespawned((data) => {
      console.log('🔄 Jugador respawned:', data);
      if (data.playerId) {
        updatePlayer(data.playerId, { position: data.position, health: 100 });
      }
    });

    socketClient.onPlayerLevelUp((data) => {
      console.log('📈 Level up:', data);
      updateLevel(data.newLevel);
      addNotification({
        id: `levelup-${Date.now()}`,
        type: 'success',
        title: '¡Level Up!',
        message: `¡Subiste al nivel ${data.newLevel}!`,
        duration: 5000,
        timestamp: new Date(),
      });
    });

    // Chat events
    socketClient.onChatMessage((data) => {
      console.log('💬 Mensaje de chat:', data);
      addChatMessage({
        id: `msg-${Date.now()}-${Math.random()}`,
        playerId: data.playerId,
        username: data.username,
        message: data.message,
        channel: data.channel,
        timestamp: data.timestamp,
        type: 'player',
      });
    });

    socketClient.onChatSystem((data) => {
      console.log('🔧 Mensaje del sistema:', data);
      addChatMessage({
        id: `system-${Date.now()}`,
        playerId: 'system',
        username: 'Sistema',
        message: data.message,
        channel: 'system',
        timestamp: new Date(),
        type: 'system',
      });
    });

    // World events
    socketClient.onWorldUpdate((data) => {
      console.log('🌍 Actualización del mundo:', data);
      if (data.players) {
        setPlayers(data.players);
      }
    });

    socketClient.onWorldChanged((data) => {
      console.log('🌍 Mundo cambiado:', data);
      addNotification({
        id: `world-change-${Date.now()}`,
        type: 'info',
        title: 'Cambio de Mundo',
        message: `Te has unido al mundo ${data.worldId}`,
        duration: 3000,
        timestamp: new Date(),
      });
    });

    // Monster events
    socketClient.onMonsterSpawned((data) => {
      console.log('👹 Monstruo apareció:', data);
    });

    socketClient.onMonsterDied((data) => {
      console.log('💀 Monstruo murió:', data);
      addNotification({
        id: `monster-death-${Date.now()}`,
        type: 'success',
        title: 'Monstruo Derrotado',
        message: '¡Has derrotado al monstruo!',
        duration: 3000,
        timestamp: new Date(),
      });
    });

    // System events
    socketClient.onSystemError((data) => {
      console.error('❌ Error del sistema:', data);
      addNotification({
        id: `system-error-${Date.now()}`,
        type: 'error',
        title: 'Error del Sistema',
        message: data.message,
        duration: 5000,
        timestamp: new Date(),
      });
    });

    socketClient.onSystemMaintenance((data) => {
      console.log('🔧 Mantenimiento:', data);
      addNotification({
        id: `maintenance-${Date.now()}`,
        type: 'warning',
        title: 'Mantenimiento Programado',
        message: data.message,
        duration: 10000,
        timestamp: new Date(),
      });
    });


    // Cleanup function
    return () => {
      socketClient.removeAllListeners();
    };
  }, [addChatMessage]);

  // Auto-reconnect logic
  useEffect(() => {
    if (!isConnected && !connectionError) {
      connect();
    }
  }, [isConnected, connectionError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, []);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    joinGame,
    socket: socketClient.getSocket(),
  };
};
