import { useEffect, useRef, useState } from "react";
import { colyseusClient } from "@/lib/colyseus/client";
import worldClient from "@/lib/colyseus/WorldClient";
import { usePlayerStore } from "@/store/playerStore";
import { useWorldStore } from "@/store/worldStore";
import { useUIStore } from "@/store/uiStore";
import { inventoryService } from "@/lib/services/inventory";
import type { InventoryItem } from "@/types/inventory.types";
import {
  frameworkColyseusRoomName,
  frameworkDefaultWorldId,
} from "@/lib/frameworkBranding";
import type { RpgSyncPayload } from "@/constants/rpgProgression";
import { getPhysicsInstance } from "@/hooks/useCannonPhysics";
import {
  InventoryMessages,
  RpgMessages,
  SceneMessages,
} from "@nexusworld3d/protocol";
import { safeParseSceneDocumentV0_1 } from "@nexusworld3d/content-schema";
import { useSceneAuthoringStore } from "@/store/sceneAuthoringStore";

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
  /** ES: Una vez por sesión de sala: aplicar posición del servidor al store local. EN: Once per room session — apply server pose to local store. */
  const hydratedServerPoseRef = useRef(false);

  const {
    setPlayer,
    updatePosition,
    updateRotation,
    updateHealth,
    updateStamina,
    updateLevel,
    updateExperience,
    updatePlayer: updateLocalPlayer,
    setRpgSync,
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
    roomName: string = frameworkColyseusRoomName,
    joinOptions: Record<string, unknown> = {}
  ) => {
    try {
      setConnectionError(null);
      await colyseusClient.connect(roomName, joinOptions);
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

    hydratedServerPoseRef.current = false;

    const snapPhysicsToServerPose = (
      pos: { x: number; y: number; z: number },
      rot?: { x: number; y: number; z: number }
    ) => {
      const phys = getPhysicsInstance();
      if (!phys) return false;
      try {
        phys.teleportPlayer(pos, rot);
        return true;
      } catch {
        return false;
      }
    };

    const tryHydrateLocalPoseFromServerList = (players: unknown) => {
      if (hydratedServerPoseRef.current || !Array.isArray(players)) return;
      const myId = colyseusClient.getSessionId();
      if (!myId) return;
      const self = players.find(
        (p: { id?: string }) => p && p.id === myId
      ) as
        | {
            position?: { x: number; y: number; z: number };
            rotation?: { x: number; y: number; z: number };
          }
        | undefined;
      if (!self?.position) return;
      const { x, y, z } = self.position;
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof z !== "number"
      ) {
        return;
      }
      const pos = { x, y, z };
      let rot: { x: number; y: number; z: number } | undefined;
      const r = self.rotation;
      if (
        r &&
        typeof r.x === "number" &&
        typeof r.y === "number" &&
        typeof r.z === "number"
      ) {
        rot = { x: r.x, y: r.y, z: r.z };
        updateRotation(rot);
      }
      updatePosition(pos);
      /**
       * ES: Sin esto, el siguiente useFrame de PlayerV2 pone en el store la posición del
       * cuerpo Cannon (spawn fijo) y borra la posición persistida en MariaDB.
       * EN: Otherwise PlayerV2's useFrame overwrites store with Cannon body at fixed spawn.
       */
      if (!snapPhysicsToServerPose(pos, rot)) {
        requestAnimationFrame(() => {
          snapPhysicsToServerPose(pos, rot);
        });
      }
      hydratedServerPoseRef.current = true;
      console.log("📍 Pose local ← servidor:", self.position);
    };

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
        tryHydrateLocalPoseFromServerList(data.players);
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
      const me = colyseusClient.getSessionId();
      if (data.playerId && me && data.playerId !== me) return;
      if (typeof data.newLevel !== "number") return;
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
    // ES: Ignorar `inventory:item-added` para mutar el inventario local — provoca duplicados y carreras
    // con `inventory:updated`. La autoridad es siempre el snapshot completo del servidor.
    // EN: Do not merge item-added locally; use full inventory:updated only.
    colyseusClient
      .getSocket()
      ?.onMessage(
        InventoryMessages.Updated,
        (data: { playerId: string; inventory: unknown }) => {
          const myId = colyseusClient.getSessionId();
          if (data.playerId && myId === data.playerId && data.inventory) {
            inventoryService.setInventorySnapshot(data.inventory as any);
          }
        }
      );

    colyseusClient.getSocket()?.onMessage(
      InventoryMessages.ItemEquipped,
      (data: { playerId: string; item?: InventoryItem }) => {
        const myId = colyseusClient.getSessionId();
        if (data.playerId && myId === data.playerId && data.item) {
          inventoryService.applyInventoryItemPatch(data.item);
        }
      }
    );
    colyseusClient.getSocket()?.onMessage(
      InventoryMessages.ItemUnequipped,
      (data: { playerId: string; item?: InventoryItem }) => {
        const myId = colyseusClient.getSessionId();
        if (data.playerId && myId === data.playerId && data.item) {
          inventoryService.applyInventoryItemPatch(data.item);
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
        tryHydrateLocalPoseFromServerList(data.players);
        setPlayers(data.players);
      }
    });

    const onRpgSync = (raw: unknown) => {
      const p = raw as RpgSyncPayload;
      if (!p || typeof p.level !== "number") return;
      setRpgSync(p);
      inventoryService.applyAuthoritativeCarryCaps(
        p.level,
        p.maxWeight,
        p.maxSlots
      );
    };
    const onRpgError = (raw: unknown) => {
      const msg =
        typeof raw === "object" &&
        raw &&
        "message" in raw &&
        typeof (raw as { message: unknown }).message === "string"
          ? (raw as { message: string }).message
          : "Acción RPG no disponible";
      addNotification({
        id: `rpg-err-${Date.now()}`,
        type: "warning",
        title: "Progresión",
        message: msg,
        duration: 4000,
        timestamp: new Date(),
      });
    };
    colyseusClient.on(RpgMessages.Sync, onRpgSync);
    colyseusClient.on(RpgMessages.Error, onRpgError);

    const onSceneAuthoringApplied = (raw: unknown) => {
      const p = raw as {
        appliedAt?: unknown;
        roomId?: unknown;
        document?: unknown;
      };
      const parsed = safeParseSceneDocumentV0_1(p.document);
      if (!parsed.success) {
        console.warn("[scene-authoring] Ignored invalid broadcast from server");
        return;
      }
      useSceneAuthoringStore.getState().setApplied({
        document: parsed.data,
        appliedAt: typeof p.appliedAt === "number" ? p.appliedAt : Date.now(),
        roomId: typeof p.roomId === "string" ? p.roomId : "",
      });
      addNotification({
        id: `scene-applied-${Date.now()}`,
        type: "info",
        title: "Escena v0.1 / Scene v0.1",
        message: `Aplicada en sala (${parsed.data.entities.length} entidades). Preview en mundo.`,
        duration: 5000,
        timestamp: new Date(),
      });
    };
    colyseusClient.on(SceneMessages.AppliedDocumentV0_1, onSceneAuthoringApplied);

    // ES: `connect()` retrasa `setIsConnected` 500ms; antes no hay listeners y se pierde rpg:sync.
    // EN: connect() delays isConnected — request RPG again once handlers are attached.
    queueMicrotask(() => {
      try {
        const r = colyseusClient.getSocket();
        if (r?.connection.isOpen) {
          r.send(RpgMessages.RequestSync, {});
        }
      } catch {
        /* ignore */
      }
    });

    console.log("✅ Event listeners registrados correctamente");

    // Cleanup function
    return () => {
      colyseusClient.off(RpgMessages.Sync, onRpgSync);
      colyseusClient.off(RpgMessages.Error, onRpgError);
      colyseusClient.off(SceneMessages.AppliedDocumentV0_1, onSceneAuthoringApplied);
      colyseusClient.removeAllListeners();
      worldClient.off("map:changed", handleMapChanged);
      worldClient.off("map:update", handleMapUpdate);
    };
  }, [
    isConnected,
    roomEpoch,
    updatePosition,
    updateRotation,
    setPlayers,
    setRpgSync,
    addNotification,
  ]);

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
