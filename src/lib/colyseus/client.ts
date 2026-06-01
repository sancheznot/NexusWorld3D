import { Client, Room } from "colyseus.js";
import {
  WorldMessages,
  HousingMessages,
  RpgMessages,
  FarmMessages,
  StallMessages,
  PlayerMessages,
  ChatMessages,
  MonsterMessages,
  SystemMessages,
  SceneMessages,
} from "@nexusworld3d/protocol";
import { withWorldProtocolJoinOptions } from "@nexusworld3d/engine-client";
import { frameworkColyseusRoomName } from "@/lib/frameworkBranding";
import { useHousingStore } from "@/store/housingStore";
import type { HousingSyncPayload } from "@/types/housing.types";

class ColyseusClient {
  private static instance: ColyseusClient;
  private client: Client | null = null;
  private room: Room | null = null;
  private isConnected: boolean = false;
  private currentJoinedRoom: string | null = null;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  /** ES: Snapshot recibido antes de que useSocket registre handlers. EN: Early join snapshot buffer. */
  private lastPlayersUpdated: { players: unknown[] } | null = null;
  private lastRpgSyncPayload: unknown | null = null;
  private lastChatHistory: unknown[] | null = null;

  private constructor() {}

  public static getInstance(): ColyseusClient {
    if (!ColyseusClient.instance) {
      ColyseusClient.instance = new ColyseusClient();
    }
    return ColyseusClient.instance;
  }

  /** ES: Acepta ws(s):// o http(s):// (muchos .env usan http para el puerto Colyseus). */
  private normalizeWsUrl(raw: string): string | null {
    const t = raw.trim();
    if (!t) return null;
    if (/^wss?:\/\//i.test(t)) return t;
    if (/^https:\/\//i.test(t)) return `wss://${t.slice(8)}`;
    if (/^http:\/\//i.test(t)) return `ws://${t.slice(7)}`;
    return null;
  }

  private getServerUrl(): string {
    const fromEnv =
      process.env.NEXT_PUBLIC_COLYSEUS_URL || process.env.NEXT_PUBLIC_SOCKET_URL;
    const normalized = fromEnv ? this.normalizeWsUrl(fromEnv) : null;
    if (normalized) return normalized;

    if (process.env.NODE_ENV === "production") {
      if (typeof window !== "undefined") {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        return `${protocol}://${window.location.host}`;
      }
      return "wss://localhost";
    }
    return "ws://localhost:3001";
  }

  /**
   * ES: Une o crea la sala Colyseus indicada (lobby elige `roomName`).
   * EN: Join or create the given Colyseus room (lobby passes `roomName`).
   */
  public connect(
    roomName: string = frameworkColyseusRoomName,
    joinOptions: Record<string, unknown> = {},
    forceReconnect = false
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (
        !forceReconnect &&
        this.room?.connection.isOpen &&
        this.currentJoinedRoom === roomName
      ) {
        resolve();
        return;
      }

      const serverUrl = this.getServerUrl();
      console.log("🔌 Conectando a Colyseus server:", serverUrl, "→ sala:", roomName);

      const join = () => {
        if (!this.client) {
          this.client = new Client(serverUrl);
        }
        const mergedJoinOptions =
          roomName === frameworkColyseusRoomName
            ? withWorldProtocolJoinOptions(joinOptions)
            : joinOptions;
        this.client
          .joinOrCreate(roomName, mergedJoinOptions)
          .then((room) => {
            this.room = room;
            this.currentJoinedRoom = roomName;
            this.isConnected = true;
            this.reconnectAttempts = 0;

            console.log("✅ Conectado a Colyseus — sala:", roomName);

            this.setupRoomListeners();
            this.emit("room:connected", { sessionId: this.room?.sessionId });

            resolve();
          })
          .catch((error) => {
            console.error("❌ Error conectando a Colyseus:", error);
            this.isConnected = false;
            this.currentJoinedRoom = null;
            reject(error);
          });
      };

      if (this.room) {
        try {
          this.room.leave();
        } catch {
          /* ignore */
        }
        this.room = null;
        this.isConnected = false;
        this.currentJoinedRoom = null;
      }

      join();
    });
  }

  public getJoinedRoomName(): string | null {
    return this.currentJoinedRoom;
  }

  /**
   * ES: La sala de juego 3D (`frameworkColyseusRoomName`), no el lobby de chat.
   * EN: The 3D game room — not the lobby chat room.
   */
  public isConnectedToWorldRoom(): boolean {
    return (
      !!this.room?.connection.isOpen &&
      this.currentJoinedRoom === frameworkColyseusRoomName
    );
  }

  public disconnect(): void {
    if (this.room) {
      console.log("🔌 Desconectando de Colyseus");
      this.room.leave();
      this.room = null;
      this.isConnected = false;
      this.currentJoinedRoom = null;
      this.lastPlayersUpdated = null;
      this.lastRpgSyncPayload = null;
      this.lastChatHistory = null;
    }
  }

  public getSocket(): Room | null {
    return this.room;
  }

  public isSocketConnected(): boolean {
    return this.isConnected && this.room?.connection.isOpen === true;
  }

  public getSessionId(): string | null {
    return this.room?.sessionId || null;
  }

  private rememberPlayersSnapshot(data: unknown): void {
    if (
      data &&
      typeof data === "object" &&
      "players" in data &&
      Array.isArray((data as { players: unknown }).players)
    ) {
      this.lastPlayersUpdated = data as { players: unknown[] };
    }
  }

  /** ES: Re-aplica snapshots si llegaron durante la carrera de conexión. EN: Replay buffered join snapshots. */
  public replayPendingSnapshots(): void {
    if (this.lastPlayersUpdated) {
      this.emit("players:updated", this.lastPlayersUpdated);
      this.emit(PlayerMessages.Joined, this.lastPlayersUpdated);
    }
    if (this.lastRpgSyncPayload != null) {
      this.emit(RpgMessages.Sync, this.lastRpgSyncPayload);
    }
    if (this.lastChatHistory) {
      this.emit(ChatMessages.History, { messages: this.lastChatHistory });
    }
  }

  public getLastPlayersSnapshot(): { players: unknown[] } | null {
    return this.lastPlayersUpdated;
  }

  private setupRoomListeners() {
    if (!this.room) return;

    this.lastPlayersUpdated = null;
    this.lastRpgSyncPayload = null;
    this.lastChatHistory = null;

    // Room events
    this.room.onLeave((code) => {
      console.log("🔌 Desconectado de la sala:", code);
      this.isConnected = false;
      this.currentJoinedRoom = null;
      this.room = null;
      this.emit("room:left", { code });
    });

    this.room.onError((code, message) => {
      console.error("❌ Error en la sala:", code, message);
    });

    // State change events - sincronización automática de Colyseus (deshabilitada por ahora)
    this.room.onStateChange((state) => {
      console.log(
        "🔄 Estado de la sala actualizado (sincronización automática deshabilitada):",
        state
      );
      // Por ahora usamos eventos manuales en lugar de la sincronización automática
    });

    this.room.onMessage(WorldMessages.TreeChopResult, (data: unknown) => {
      this.emit(WorldMessages.TreeChopResult, data);
    });

    this.room.onMessage(WorldMessages.RockMineResult, (data: unknown) => {
      this.emit(WorldMessages.RockMineResult, data);
    });

    this.room.onMessage(WorldMessages.HarvestNodeResult, (data: unknown) => {
      this.emit(WorldMessages.HarvestNodeResult, data);
    });

    this.room.onMessage(WorldMessages.GenericToolResult, (data: unknown) => {
      this.emit(WorldMessages.GenericToolResult, data);
    });

    this.room.onMessage(SceneMessages.AppliedDocumentV0_1, (data: unknown) => {
      this.emit(SceneMessages.AppliedDocumentV0_1, data);
    });

    this.room.onMessage(RpgMessages.Sync, (data: unknown) => {
      this.lastRpgSyncPayload = data;
      this.emit(RpgMessages.Sync, data);
    });

    this.room.onMessage(RpgMessages.Error, (data: unknown) => {
      this.emit(RpgMessages.Error, data);
    });

    this.room.onMessage(HousingMessages.Sync, (data: unknown) => {
      const p = data as HousingSyncPayload;
      if (!p?.mapId) return;
      useHousingStore
        .getState()
        .setFromSync(
          p.structures ?? [],
          p.pieces ?? [],
          p.ownedPlotId ?? null,
          Array.isArray(p.clearedPlotDebrisIds) ? p.clearedPlotDebrisIds : [],
          Array.isArray(p.farmSlots) ? p.farmSlots : [],
          p.produceStall && typeof p.produceStall === "object"
            ? p.produceStall
            : null
        );
    });

    this.room.onMessage(HousingMessages.Error, (data: unknown) => {
      this.emit(HousingMessages.Error, data);
    });

    this.room.onMessage(HousingMessages.Upgraded, (data: unknown) => {
      this.emit(HousingMessages.Upgraded, data);
    });

    this.room.onMessage(HousingMessages.PieceRemoved, (data: unknown) => {
      this.emit(HousingMessages.PieceRemoved, data);
    });

    this.room.onMessage(HousingMessages.DebrisCleared, (data: unknown) => {
      this.emit(HousingMessages.DebrisCleared, data);
    });

    this.room.onMessage(FarmMessages.Result, (data: unknown) => {
      this.emit(FarmMessages.Result, data);
    });

    this.room.onMessage(StallMessages.Result, (data: unknown) => {
      this.emit(StallMessages.Result, data);
    });

    const playerMessageTypes = [
      PlayerMessages.Joined,
      PlayerMessages.Left,
      PlayerMessages.Moved,
      PlayerMessages.Attacked,
      PlayerMessages.Damaged,
      PlayerMessages.Died,
      PlayerMessages.Respawned,
      PlayerMessages.LevelUp,
      PlayerMessages.Role,
    ] as const;

    for (const type of playerMessageTypes) {
      this.room.onMessage(type, (data: unknown) => {
        if (type === PlayerMessages.Joined) {
          this.rememberPlayersSnapshot(data);
        }
        this.emit(type, data);
      });
    }

    this.room.onMessage("players:updated", (data: unknown) => {
      this.rememberPlayersSnapshot(data);
      this.emit("players:updated", data);
    });

    this.room.onMessage(WorldMessages.Update, (data: unknown) => {
      this.rememberPlayersSnapshot(data);
      this.emit(WorldMessages.Update, data);
    });

    this.room.onMessage(WorldMessages.Changed, (data: unknown) => {
      this.emit(WorldMessages.Changed, data);
    });

    this.room.onMessage(ChatMessages.Message, (data: unknown) => {
      this.emit(ChatMessages.Message, data);
    });

    this.room.onMessage(ChatMessages.History, (data: unknown) => {
      if (
        data &&
        typeof data === "object" &&
        "messages" in data &&
        Array.isArray((data as { messages: unknown }).messages)
      ) {
        this.lastChatHistory = (data as { messages: unknown[] }).messages;
      }
      this.emit(ChatMessages.History, data);
    });

    this.room.onMessage(ChatMessages.System, (data: unknown) => {
      this.emit(ChatMessages.System, data);
    });

    this.room.onMessage(MonsterMessages.Spawned, (data: unknown) => {
      this.emit(MonsterMessages.Spawned, data);
    });

    this.room.onMessage(MonsterMessages.Died, (data: unknown) => {
      this.emit(MonsterMessages.Died, data);
    });

    this.room.onMessage(MonsterMessages.Moved, (data: unknown) => {
      this.emit(MonsterMessages.Moved, data);
    });

    this.room.onMessage(SystemMessages.Error, (data: unknown) => {
      this.emit(SystemMessages.Error, data);
    });

    this.room.onMessage(SystemMessages.Maintenance, (data: unknown) => {
      this.emit(SystemMessages.Maintenance, data);
    });

    // ES: El servidor manda `rpg:sync` en onJoin antes de que exista este handler (carrera).
    // EN: Server may send rpg:sync during onJoin before this handler is registered — re-request.
    queueMicrotask(() => {
      try {
        if (this.room?.connection.isOpen) {
          this.room.send(RpgMessages.RequestSync, {});
        }
      } catch {
        /* ignore */
      }
    });
  }

  // Player events - manteniendo la misma interfaz que SocketClient
  public joinPlayer(data: {
    playerId: string;
    username: string;
    worldId: string;
  }): void {
    console.log(
      "📤 Enviando player:join:",
      data,
      "Room conectada:",
      this.room?.connection.isOpen
    );
    if (!this.isConnectedToWorldRoom()) {
      console.log("❌ No estás en la sala mundo, no se puede enviar player:join");
      return;
    }
    this.room!.send(PlayerMessages.Join, data);
  }

  public leavePlayer(): void {
    if (this.room?.connection.isOpen) {
      this.room.send(PlayerMessages.Leave, {});
    }
  }

  public movePlayer(data: any): void {
    if (this.room?.connection.isOpen) {
      this.room.send(PlayerMessages.Move, data);
    }
  }

  public attackPlayer(data: { targetId: string; damage: number }): void {
    if (this.room?.connection.isOpen) {
      this.room.send(PlayerMessages.Attack, data);
    }
  }

  public interactWithObject(data: { objectId: string; action: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send(PlayerMessages.Interact, data);
    }
  }

  // Chat events
  public sendMessage(data: { message: string; channel: string }): boolean {
    if (this.room?.connection.isOpen) {
      this.room.send(ChatMessages.Message, data);
      return true;
    }
    return false;
  }

  public joinChannel(data: { channel: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send(ChatMessages.JoinChannel, data);
    }
  }

  public leaveChannel(data: { channel: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send(ChatMessages.LeaveChannel, data);
    }
  }

  // World events
  public changeWorld(data: { worldId: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send(WorldMessages.Change, data);
    }
  }

  public requestWorldData(data: { worldId: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send(WorldMessages.RequestData, data);
    }
  }

  // Heartbeat to keep session alive
  public sendHeartbeat(): void {
    if (!this.isConnectedToWorldRoom()) return;
    this.room!.send(PlayerMessages.Heartbeat, { t: Date.now() });
  }

  /**
   * ES: Mensaje genérico (p. ej. lobby:chat). `false` = sala cerrada o aún conectando.
   * EN: Generic room message. `false` = room closed or still connecting.
   */
  public sendRoomMessage(
    type: string,
    payload: Record<string, unknown>
  ): boolean {
    if (this.room?.connection.isOpen) {
      this.room.send(type, payload);
      return true;
    }
    return false;
  }

  // Event listeners — subscribe via emit bus (handlers registered once in setupRoomListeners)
  public onPlayerJoined(callback: (data: any) => void): void {
    this.on(PlayerMessages.Joined, callback as (data: unknown) => void);
  }

  public onPlayerLeft(callback: (data: any) => void): void {
    this.on(PlayerMessages.Left, callback as (data: unknown) => void);
  }

  public onPlayerMoved(callback: (data: any) => void): void {
    this.on(PlayerMessages.Moved, callback as (data: unknown) => void);
  }

  public onPlayerAttacked(callback: (data: any) => void): void {
    this.on(PlayerMessages.Attacked, callback as (data: unknown) => void);
  }

  public onPlayerDamaged(callback: (data: any) => void): void {
    this.on(PlayerMessages.Damaged, callback as (data: unknown) => void);
  }

  public onPlayerDied(callback: (data: any) => void): void {
    this.on(PlayerMessages.Died, callback as (data: unknown) => void);
  }

  public onPlayerRespawned(callback: (data: any) => void): void {
    this.on(PlayerMessages.Respawned, callback as (data: unknown) => void);
  }

  public onPlayerLevelUp(callback: (data: any) => void): void {
    this.on(PlayerMessages.LevelUp, callback as (data: unknown) => void);
  }

  public onPlayerRole(
    callback: (data: { playerId: string; roleId: string | null }) => void
  ): void {
    this.on(PlayerMessages.Role, callback as (data: unknown) => void);
  }

  public onChatMessage(callback: (data: any) => void): void {
    this.on(ChatMessages.Message, callback as (data: unknown) => void);
  }

  public onChatSystem(callback: (data: any) => void): void {
    this.on(ChatMessages.System, callback as (data: unknown) => void);
  }

  public onWorldUpdate(callback: (data: any) => void): void {
    this.on(WorldMessages.Update, callback as (data: unknown) => void);
  }

  public onWorldChanged(callback: (data: any) => void): void {
    this.on(WorldMessages.Changed, callback as (data: unknown) => void);
  }

  public onMonsterSpawned(callback: (data: any) => void): void {
    this.on(MonsterMessages.Spawned, callback as (data: unknown) => void);
  }

  public onMonsterDied(callback: (data: any) => void): void {
    this.on(MonsterMessages.Died, callback as (data: unknown) => void);
  }

  public onMonsterMoved(callback: (data: any) => void): void {
    this.on(MonsterMessages.Moved, callback as (data: unknown) => void);
  }

  public onSystemError(callback: (data: any) => void): void {
    this.on(SystemMessages.Error, callback as (data: unknown) => void);
  }

  public onSystemMaintenance(callback: (data: any) => void): void {
    this.on(SystemMessages.Maintenance, callback as (data: unknown) => void);
  }

  public onPlayersUpdated(callback: (data: any) => void): void {
    this.on("players:updated", callback as (data: unknown) => void);
  }

  // Event system methods
  public emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  public on(event: string, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // Remove event listeners
  public off(event: string, callback?: (...args: any[]) => void): void {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }
    const list = this.eventListeners.get(event);
    if (!list) return;
    const i = list.indexOf(callback as (data: unknown) => void);
    if (i !== -1) list.splice(i, 1);
  }

  // Remove app-level listeners registered via .on() (does not touch Colyseus room handlers)
  public removeAllListeners(): void {
    this.eventListeners.clear();
  }
}

// Export singleton instance
export const colyseusClient = ColyseusClient.getInstance();
export default colyseusClient;
