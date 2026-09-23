import { useEffect, useState } from "react";
import { colyseusClient } from "@/lib/colyseus/client";

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
    console.log(
      "🎮 [LIVE CAMERAS] Conectando a Colyseus para obtener jugadores..."
    );
    let isMounted = true;
    const subscriptions: Array<() => void> = [];
    const scheduledTimeouts: ReturnType<typeof setTimeout>[] = [];

    // Conectar a Colyseus
    colyseusClient
      .connect()
      .then(() => {
        if (!isMounted) return;
        console.log("✅ [LIVE CAMERAS] Conectado a Colyseus");
        setIsConnected(true);

        const room = colyseusClient.getSocket();
        if (!room) {
          console.error("❌ [LIVE CAMERAS] No se pudo obtener la sala");
          return;
        }

        // No necesitamos esperar al estado si usamos eventos manuales
        // Escuchar actualización completa de jugadores
        subscriptions.push(colyseusClient.onPlayersUpdated((data) => {
          if (!isMounted) return;
          const playersList = data.players;
          console.log(
            `📊 [LIVE CAMERAS] Actualización de jugadores recibida: ${playersList.length}`
          );

          setPlayers((prev) => {
            const newPlayers = new Map();
            playersList.forEach((p) => {
              newPlayers.set(p.id, {
                id: p.id,
                username: p.username || "Player",
                position: p.position || { x: 0, y: 0, z: 0 },
                rotation: p.rotation || { x: 0, y: 0, z: 0 },
                model: p.model || "/models/characters/men/men_01.glb",
              });
            });
            return newPlayers;
          });
          setPlayerCount(playersList.length);
        }));

        // Escuchar movimiento de jugadores
        subscriptions.push(colyseusClient.onPlayerMoved((data) => {
          if (!isMounted) return;
          const { playerId, movement } = data;

          setPlayers((prev) => {
            const newPlayers = new Map(prev);
            const player = newPlayers.get(playerId);
            if (player) {
              newPlayers.set(playerId, {
                ...player,
                position: movement.position,
                rotation: movement.rotation,
              });
            }
            return newPlayers;
          });
        }));

        // Escuchar entrada de jugadores
        subscriptions.push(colyseusClient.onPlayerJoined((data) => {
          // La actualización completa suele venir después, pero podemos manejarlo aquí también
          console.log(
            `👤 [LIVE CAMERAS] Jugador unido: ${data.player?.username}`
          );
        }));

        // Escuchar salida de jugadores
        subscriptions.push(colyseusClient.onPlayerLeft((data) => {
          console.log(`👋 [LIVE CAMERAS] Jugador salió: ${data.playerId}`);
          // La actualización completa suele venir después
        }));
      })
      .catch((error) => {
        console.error("❌ [LIVE CAMERAS] Error conectando a Colyseus:", error);
        setIsConnected(false);
      });

    return () => {
      console.log("🔌 [LIVE CAMERAS] Limpiando listeners");
      isMounted = false;
      for (const unsubscribe of subscriptions) unsubscribe();
      scheduledTimeouts.forEach(clearTimeout);
    };
  }, []);

  return {
    players: Array.from(players.values()),
    playerCount,
    isConnected,
  };
}
