import { useEffect, useRef, useState } from 'react';
import { colyseusClient } from '@/lib/colyseus/client';
import { usePlayerStore } from '@/store/playerStore';
import { useWorldStore } from '@/store/worldStore';
import { useUIStore } from '@/store/uiStore';

interface Player {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  level: number;
  experience: number;
  worldId: string;
  isOnline: boolean;
  lastSeen: Date;
}


export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { setPlayer, updatePosition, updateHealth, updateStamina, updateLevel, updateExperience } = usePlayerStore();
  const { addPlayer, removePlayer, updatePlayer, setPlayers, players } = useWorldStore();
  const { addChatMessage, addNotification } = useUIStore();

  // Connect to Colyseus server
  const connect = async () => {
    try {
      setConnectionError(null);
      await colyseusClient.connect();
      
      // Esperar un poco para que el servidor esté listo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsConnected(true);
      console.log('✅ Conectado al servidor Colyseus');
    } catch (error) {
      console.error('❌ Error conectando al servidor:', error);
      setConnectionError(error instanceof Error ? error.message : 'Error desconocido');
      setIsConnected(false);
    }
  };

  // Join game with player data
  const joinGame = (playerId: string, username: string, worldId: string = 'default') => {
    console.log('🎮 joinGame llamado:', { playerId, username, worldId, isConnected });
    if (isConnected) {
      colyseusClient.joinPlayer({
        playerId,
        username,
        worldId
      });
    } else {
      console.log('❌ Colyseus no conectado, no se puede unir al juego');
    }
  };

  // Disconnect from Colyseus server
  const disconnect = () => {
    colyseusClient.disconnect();
    setIsConnected(false);
  };

  // Setup event listeners
  useEffect(() => {
    console.log('🔧 Registrando event listeners en useSocket...', { isConnected, hasSocket: !!colyseusClient.getSocket() });
    if (!isConnected || !colyseusClient.getSocket()) return;

    // Player events
    colyseusClient.onPlayerJoined((data) => {
      console.log('🔥 EVENTO player:joined RECIBIDO EN COLYSEUS CLIENT:', data);
      console.log('🔥 data.player:', data.player);
      console.log('🔥 data.players:', data.players);
      
      // Solo usar setPlayers para establecer la lista completa de jugadores
      if (data.players) {
        console.log('🔥 Estableciendo lista completa de jugadores:', data.players.length, 'jugadores:', data.players.map((p: any) => ({ id: p.id, username: p.username })));
        setPlayers(data.players);
      }
    });

    colyseusClient.onPlayerLeft((data) => {
      console.log('👤 Jugador salió:', data);
      if (data.playerId) {
        removePlayer(data.playerId);
      }
      if (data.players) {
        setPlayers(data.players);
      }
    });

    colyseusClient.onPlayerMoved((data) => {
      console.log('🚶 Jugador se movió:', data);
      if (data.playerId && data.movement) {
        updatePlayer(data.playerId, {
          position: data.movement.position,
          rotation: data.movement.rotation,
          isMoving: data.movement.isMoving,
          isRunning: data.movement.isRunning,
          animation: data.movement.animation || (data.movement.isRunning ? 'running' : data.movement.isMoving ? 'walking' : 'idle'),
        });
      }
    });

    colyseusClient.onPlayerAttacked((data) => {
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

    colyseusClient.onPlayerDamaged((data) => {
      console.log('💥 Daño recibido:', data);
      if (data.playerId) {
        updatePlayer(data.playerId, { health: data.newHealth });
      }
      updateHealth(data.newHealth);
    });

    colyseusClient.onPlayerDied((data) => {
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

    colyseusClient.onPlayerRespawned((data) => {
      console.log('🔄 Jugador respawned:', data);
      if (data.playerId) {
        updatePlayer(data.playerId, { position: data.position, health: 100 });
      }
    });

    colyseusClient.onPlayerLevelUp((data) => {
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
    colyseusClient.onChatMessage((data) => {
      console.log('💬 Mensaje de chat RECIBIDO en useSocket:', data);
      addChatMessage({
        id: data.id, // Usar el ID generado por el servidor
        playerId: data.playerId,
        username: data.username,
        message: data.message,
        channel: data.channel,
        timestamp: new Date(data.timestamp), // Asegurarse de que sea un objeto Date
        type: data.type,
      });
    });

    colyseusClient.onChatSystem((data) => {
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
    colyseusClient.onWorldUpdate((data) => {
      console.log('🌍 Actualización del mundo:', data);
      if (data.players) {
        setPlayers(data.players);
      }
    });

    colyseusClient.onWorldChanged((data) => {
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
    colyseusClient.onMonsterSpawned((data) => {
      console.log('👹 Monstruo apareció:', data);
    });

    colyseusClient.onMonsterDied((data) => {
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
    colyseusClient.onSystemError((data) => {
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

    colyseusClient.onSystemMaintenance((data) => {
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

        // Sincronización de jugadores desde el servidor
        colyseusClient.onPlayersUpdated((data) => {
          console.log('🔥 EVENTO players:updated RECIBIDO DEL SERVIDOR:', data);
          console.log('🔥 data.players:', data.players);
          if (data.players) {
            console.log('🔥 Estableciendo jugadores desde servidor:', data.players.length, 'jugadores');
            setPlayers(data.players);
          }
        });

    console.log('✅ Event listeners registrados correctamente');
    
    // Cleanup function
    return () => {
      colyseusClient.removeAllListeners();
    };
  }, [isConnected]);

  // Auto-reconnect logic
  useEffect(() => {
    if (!isConnected && !connectionError) {
      connect();
    }
  }, [isConnected, connectionError]);

  // Cleanup on unmount
  useEffect(() => {
    const timeout = reconnectTimeoutRef.current;
    return () => {
      if (timeout) {
        clearTimeout(timeout);
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
    socket: colyseusClient.getSocket(),
  };
};
