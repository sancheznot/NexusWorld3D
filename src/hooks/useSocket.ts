import { useEffect, useRef, useState } from "react";
import { colyseusClient } from "@/lib/colyseus/client";
import worldClient from "@/lib/colyseus/WorldClient";
import { usePlayerStore } from "@/store/playerStore";
import { useWorldStore } from "@/store/worldStore";
import { useUIStore } from "@/store/uiStore";
import { inventoryService } from "@/lib/services/inventory";
import {
  frameworkColyseusRoomName,
  frameworkDefaultWorldId,
} from "@/lib/frameworkBranding";

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
  /** ES: Incrementa al unirse a una sala (re-registrar listeners al cambiar de room). EN: Bumps on room join. */
  const [roomEpoch, setRoomEpoch] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    setPlayer,
    updatePosition,
    updateHealth,
    updateStamina,
    updateLevel,
    updateExperience,
    updatePlayer: updateLocalPlayer,
  } = usePlayerStore();
  const {
    addPlayer,
    removePlayer,
    updatePlayer: updateWorldPlayer,
    setPlayers,
    players,
  } = useWorldStore();
  const { addChatMessage, addNotification } = useUIStore();

  const connect = async (
    roomName: string = frameworkColyseusRoomName
  ) => {
    try {
      setConnectionError(null);
      await colyseusClient.connect(roomName);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsConnected(true);
      setRoomEpoch((n) => n + 1);
      console.log("✅ Conectado al servidor Colyseus — sala:", roomName);
    } catch (error) {
      console.error("❌ Error conectando al servidor:", error);
      setConnectionError(
        error instanceof Error ? error.message : "Error desconocido"
      );
      setIsConnected(false);
    }
  };

  // Join game with player data
  const joinGame = (
    playerId: string,
    username: string,
    worldId: string = frameworkDefaultWorldId
  ) => {
    console.log("🎮 joinGame llamado:", {
      playerId,
      username,
      worldId,
      isConnected,
    });
    if (colyseusClient.isSocketConnected()) {
      colyseusClient.joinPlayer({
        playerId,
        username,
        worldId,
      });
    } else {
      console.log("❌ Colyseus no conectado, no se puede unir al juego");
    }
  };

  // Disconnect from Colyseus server
  const disconnect = () => {
    colyseusClient.disconnect();
    setIsConnected(false);
  };

  // Setup event listeners
  useEffect(() => {
    console.log("🔧 Registrando event listeners en useSocket...", {
      isConnected,
      hasSocket: !!colyseusClient.getSocket(),
    });
    if (!isConnected || !colyseusClient.getSocket()) return;

    // Player events
    colyseusClient.onPlayerJoined((data) => {
      console.log("🔥 EVENTO player:joined RECIBIDO EN COLYSEUS CLIENT:", data);
      console.log("🔥 data.player:", data.player);
      console.log("🔥 data.players:", data.players);

      // Solo usar setPlayers para establecer la lista completa de jugadores
      if (data.players) {
        console.log(
          "🔥 Estableciendo lista completa de jugadores:",
          data.players.length,
          "jugadores:",
          data.players.map((p: any) => ({ id: p.id, username: p.username }))
        );
        setPlayers(data.players);
      }
    });

    colyseusClient.onPlayerLeft((data) => {
      console.log("👤 Jugador salió:", data);
      if (data.playerId) {
        removePlayer(data.playerId);
      }
      if (data.players) {
        setPlayers(data.players);
      }
    });

    colyseusClient.onPlayerMoved((data) => {
      console.log("🚶 Jugador se movió:", data);
      if (data.playerId && data.movement) {
        updateWorldPlayer(data.playerId, {
          position: data.movement.position,
          rotation: data.movement.rotation,
          isMoving: data.movement.isMoving,
          isRunning: data.movement.isRunning,
          animation:
            data.movement.animation ||
            (data.movement.isRunning
              ? "running"
              : data.movement.isMoving
              ? "walking"
              : "idle"),
        });
      }
    });

    colyseusClient.onPlayerAttacked((data) => {
      console.log("⚔️ Ataque:", data);
      addNotification({
        id: `attack-${Date.now()}`,
        type: "info",
        title: "Ataque",
        message: `Jugador atacó por ${data.damage} de daño`,
        duration: 3000,
        timestamp: new Date(),
      });
    });

    colyseusClient.onPlayerDamaged((data) => {
      console.log("💥 Daño recibido:", data);
      if (data.playerId) {
        updateWorldPlayer(data.playerId, { health: data.newHealth });
      }
      updateHealth(data.newHealth);
    });

    colyseusClient.onPlayerDied((data) => {
      console.log("💀 Jugador murió:", data);
      addNotification({
        id: `death-${Date.now()}`,
        type: "error",
        title: "Muerte",
        message: `Jugador murió. Respawn en ${data.respawnTime}s`,
        duration: 5000,
        timestamp: new Date(),
      });
    });

    colyseusClient.onPlayerRespawned((data) => {
      console.log("🔄 Jugador respawned:", data);
      if (data.playerId) {
        updateWorldPlayer(data.playerId, {
          position: data.position,
          health: 100,
        });
      }
    });

    colyseusClient.onPlayerLevelUp((data) => {
      console.log("📈 Level up:", data);
      updateLevel(data.newLevel);
      addNotification({
        id: `levelup-${Date.now()}`,
        type: "success",
        title: "¡Level Up!",
        message: `¡Subiste al nivel ${data.newLevel}!`,
        duration: 5000,
        timestamp: new Date(),
      });
    });

    colyseusClient.onPlayerRole((data) => {
      console.log("🎭 Role assigned:", data);
      const myId = colyseusClient.getSessionId();

      // Update local player if it's me
      if (data.playerId === myId) {
        console.log("✅ Updating local player role to:", data.roleId);
        // We need to cast roleId to any because ExtendedJobId might not be fully compatible with string in the store update signature
        // although the store expects ExtendedJobId | null, data.roleId comes as string | null
        updateLocalPlayer({ roleId: data.roleId as any });

        addNotification({
          id: `role-${Date.now()}`,
          type: "success",
          title: "Nuevo Rol Asignado",
          message: `Ahora eres: ${data.roleId}`,
          duration: 5000,
          timestamp: new Date(),
        });
      }

      // Also update world store for other players
      updateWorldPlayer(data.playerId, { roleId: data.roleId as any });
    });

    // Chat events
    colyseusClient.onChatMessage((data) => {
      console.log("💬 Mensaje de chat RECIBIDO en useSocket:", data);
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
      console.log("🔧 Mensaje del sistema:", data);
      addChatMessage({
        id: `system-${Date.now()}`,
        playerId: "system",
        username: "Sistema",
        message: data.message,
        channel: "system",
        timestamp: new Date(),
        type: "system",
      });
    });

    // World events
    colyseusClient.onWorldUpdate((data) => {
      console.log("🌍 Actualización del mundo:", data);
      if (data.players) {
        setPlayers(data.players);
      }
    });

    colyseusClient.onWorldChanged((data) => {
      console.log("🌍 Mundo cambiado:", data);
      addNotification({
        id: `world-change-${Date.now()}`,
        type: "info",
        title: "Cambio de Mundo",
        message: `Te has unido al mundo ${data.worldId}`,
        duration: 3000,
        timestamp: new Date(),
      });
    });

    // Inventory server-authoritative sync
    colyseusClient
      .getSocket()
      ?.onMessage(
        "inventory:item-added",
        (data: { playerId: string; item: unknown }) => {
          const myId = colyseusClient.getSessionId();
          if (data.playerId && myId === data.playerId) {
            inventoryService.addItem(data.item as any);
          }
        }
      );
    colyseusClient
      .getSocket()
      ?.onMessage(
        "inventory:updated",
        (data: { playerId: string; inventory: unknown }) => {
          const myId = colyseusClient.getSessionId();
          if (data.playerId && myId === data.playerId && data.inventory) {
            inventoryService.setInventorySnapshot(data.inventory as any);
          }
        }
      );

    // WorldClient events (map sync)
    const handleMapChanged = (data: any) => {
      console.log("🗺️ map:changed recibido", data);
      // Actualizar mapId y posición del jugador que cambió
      updateWorldPlayer(data.playerId, {
        position: data.position,
        rotation: data.rotation,
        mapId: data.mapId as any,
      } as any);
    };
    worldClient.onMapChanged(handleMapChanged);

    const handleMapUpdate = (data: any) => {
      console.log("🗺️ map:update recibido", data);
      // Refrescar jugadores presentes en este mapa (sin perder campos extra)
      // Mezcla conservadora: solo aseguramos mapId/position/rotation de los reportados
      data.players.forEach((p: any) => {
        updateWorldPlayer(p.id, {
          position: p.position,
          rotation: p.rotation,
          mapId: p.mapId as any,
        } as any);
      });
    };
    worldClient.onMapUpdate(handleMapUpdate);

    // Monster events
    colyseusClient.onMonsterSpawned((data) => {
      console.log("👹 Monstruo apareció:", data);
    });

    colyseusClient.onMonsterDied((data) => {
      console.log("💀 Monstruo murió:", data);
      addNotification({
        id: `monster-death-${Date.now()}`,
        type: "success",
        title: "Monstruo Derrotado",
        message: "¡Has derrotado al monstruo!",
        duration: 3000,
        timestamp: new Date(),
      });
    });

    // System events
    colyseusClient.onSystemError((data) => {
      console.error("❌ Error del sistema:", data);
      addNotification({
        id: `system-error-${Date.now()}`,
        type: "error",
        title: "Error del Sistema",
        message: data.message,
        duration: 5000,
        timestamp: new Date(),
      });
    });

    colyseusClient.onSystemMaintenance((data) => {
      console.log("🔧 Mantenimiento:", data);
      addNotification({
        id: `maintenance-${Date.now()}`,
        type: "warning",
        title: "Mantenimiento Programado",
        message: data.message,
        duration: 10000,
        timestamp: new Date(),
      });
    });

    // Sincronización de jugadores desde el servidor
    colyseusClient.onPlayersUpdated((data) => {
      console.log("🔥 EVENTO players:updated RECIBIDO DEL SERVIDOR:", data);
      console.log("🔥 data.players:", data.players);
      if (data.players) {
        console.log(
          "🔥 Estableciendo jugadores desde servidor:",
          data.players.length,
          "jugadores"
        );
        setPlayers(data.players);
      }
    });

    console.log("✅ Event listeners registrados correctamente");

    // Cleanup function
    return () => {
      colyseusClient.removeAllListeners();
      worldClient.off("map:changed", handleMapChanged);
      worldClient.off("map:update", handleMapUpdate);
    };
  }, [isConnected, roomEpoch]);

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
