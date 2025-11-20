import { useEffect, useState } from 'react';
import { colyseusClient } from '@/lib/colyseus/client';

export interface LivePlayer {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  model: string;
}

/**
 * Hook para obtener jugadores en tiempo real desde Colyseus
 * para las cámaras en vivo
 */
export function useLiveCameraPlayers() {
  const [players, setPlayers] = useState<Map<string, LivePlayer>>(new Map());
  const [playerCount, setPlayerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('🎮 [LIVE CAMERAS] Conectando a Colyseus para obtener jugadores...');
    let isMounted = true;
    let listenersAttached = false;
    const scheduledTimeouts: ReturnType<typeof setTimeout>[] = [];

    // Conectar a Colyseus
    colyseusClient.connect()
      .then(() => {
        console.log('✅ [LIVE CAMERAS] Conectado a Colyseus');
        setIsConnected(true);

        const room = colyseusClient.getSocket();
        if (!room) {
          console.error('❌ [LIVE CAMERAS] No se pudo obtener la sala');
          return;
        }

        const ensureStateReady = (attempt = 0) => {
          if (!isMounted || listenersAttached) return;
          if (attempt > 10) {
            console.error('❌ [LIVE CAMERAS] No se obtuvo estado de sala tras múltiples intentos');
            return;
          }

          if (!room.state || !room.state.players) {
            const timeoutId = setTimeout(() => ensureStateReady(attempt + 1), 250 * (attempt + 1));
            scheduledTimeouts.push(timeoutId);
            if (attempt === 0) {
              console.warn('⚠️ [LIVE CAMERAS] Estado de la sala no listo, reintentando...');
            }
            return;
          }

          setupPlayerListeners(room);
        };

        ensureStateReady();
      })
      .catch((error) => {
        console.error('❌ [LIVE CAMERAS] Error conectando a Colyseus:', error);
        setIsConnected(false);
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function setupPlayerListeners(room: any) {
      if (listenersAttached) return;
      if (!room.state || !room.state.players) {
        console.error('❌ [LIVE CAMERAS] Intento de configurar listeners sin estado válido');
        return;
      }

      try {
        listenersAttached = true;
        // Escuchar cambios en el estado de jugadores
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleAdd = (player: any, sessionId: string) => {
          if (!isMounted) return;
          console.log(`👤 [LIVE CAMERAS] Jugador añadido: ${player.username} en (${player.position?.x}, ${player.position?.y}, ${player.position?.z})`);
          
          setPlayers(prev => {
            if (!isMounted) return prev;
            const newPlayers = new Map(prev);
            newPlayers.set(sessionId, {
              id: sessionId,
              username: player.username || 'Player',
              position: { 
                x: player.position?.x ?? 0, 
                y: player.position?.y ?? 1, 
                z: player.position?.z ?? 0 
              },
              rotation: { 
                x: player.rotation?.x ?? 0, 
                y: player.rotation?.y ?? 0, 
                z: player.rotation?.z ?? 0 
              },
              model: player.model || '/models/characters/men/men_01.glb',
            });
            console.log(`📊 [LIVE CAMERAS] Total jugadores: ${newPlayers.size}`);
            return newPlayers;
          });

          setPlayerCount(room.state.players.size ?? 0);

          // Escuchar cambios en la posición del jugador
          if (player.position && player.position.onChange) {
            player.position.onChange(() => {
              if (!isMounted) return;
              setPlayers(prev => {
                if (!isMounted) return prev;
                const newPlayers = new Map(prev);
                const existingPlayer = newPlayers.get(sessionId);
                if (existingPlayer) {
                  newPlayers.set(sessionId, {
                    ...existingPlayer,
                    position: {
                      x: player.position.x,
                      y: player.position.y,
                      z: player.position.z,
                    },
                  });
                }
                return newPlayers;
              });
            });
          }

          // Escuchar cambios en la rotación del jugador
          if (player.rotation && player.rotation.onChange) {
            player.rotation.onChange(() => {
              if (!isMounted) return;
              setPlayers(prev => {
                if (!isMounted) return prev;
                const newPlayers = new Map(prev);
                const existingPlayer = newPlayers.get(sessionId);
                if (existingPlayer) {
                  newPlayers.set(sessionId, {
                    ...existingPlayer,
                    rotation: {
                      x: player.rotation.x,
                      y: player.rotation.y,
                      z: player.rotation.z,
                    },
                  });
                }
                return newPlayers;
              });
            });
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleRemove = (_player: any, sessionId: string) => {
          if (!isMounted) return;
          console.log(`👋 [LIVE CAMERAS] Jugador eliminado: ${_player?.username ?? sessionId}`);
          setPlayers(prev => {
            if (!isMounted) return prev;
            const newPlayers = new Map(prev);
            newPlayers.delete(sessionId);
            console.log(`📊 [LIVE CAMERAS] Total jugadores: ${newPlayers.size}`);
            return newPlayers;
          });
          setPlayerCount(room.state.players.size ?? 0);
        };

        room.state.players.onAdd(handleAdd);
        room.state.players.onRemove(handleRemove);

        const initialCount = room.state.players?.size ?? 0;
        setPlayerCount(initialCount);
        console.log(`📊 [LIVE CAMERAS] Jugadores conectados: ${initialCount}`);
      } catch (error) {
        console.error('❌ [LIVE CAMERAS] Error configurando listeners:', error);
      }
    }

    return () => {
      console.log('🔌 [LIVE CAMERAS] Desconectando de Colyseus');
      isMounted = false;
      scheduledTimeouts.forEach(clearTimeout);
      // No desconectar completamente, solo limpiar listeners
    };
  }, []);

  return {
    players: Array.from(players.values()),
    playerCount,
    isConnected,
  };
}

