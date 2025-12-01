import { Client, Room } from "colyseus.js";

class ColyseusClient {
  private static instance: ColyseusClient;
  private client: Client | null = null;
  private room: Room | null = null;
  private isConnected: boolean = false;
  private eventListeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  private constructor() {}

  public static getInstance(): ColyseusClient {
    if (!ColyseusClient.instance) {
      ColyseusClient.instance = new ColyseusClient();
    }
    return ColyseusClient.instance;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.room?.connection.isOpen) {
        resolve();
        return;
      }

      // Resolve WebSocket server URL
      let serverUrl: string;
      if (process.env.NODE_ENV === "production") {
        const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
        if (envUrl && /^wss?:\/\//.test(envUrl)) {
          serverUrl = envUrl;
        } else if (typeof window !== "undefined") {
          const protocol = window.location.protocol === "https:" ? "wss" : "ws";
          serverUrl = `${protocol}://${window.location.host}`; // same domain/port as frontend (unified server)
        } else {
          serverUrl = "wss://localhost";
        }
      } else {
        serverUrl = "ws://localhost:3001"; // dev: separate Colyseus server
      }

      console.log("🔌 Conectando a Colyseus server:", serverUrl);

      if (!this.client) {
        this.client = new Client(serverUrl);
      }

      // Intentar conectar a la sala del Hotel Humboldt
      this.client
        .joinOrCreate("hotel-humboldt", {})
        .then((room) => {
          this.room = room;
          this.isConnected = true;
          this.reconnectAttempts = 0;

          console.log("✅ Conectado a Colyseus - Hotel Humboldt Room");

          // Configurar event listeners una sola vez por room
          this.setupRoomListeners();
          // Notificar a consumidores externos que hay una room conectada
          this.emit("room:connected", { sessionId: this.room?.sessionId });

          resolve();
        })
        .catch((error) => {
          console.error("❌ Error conectando a Colyseus:", error);
          this.isConnected = false;
          reject(error);
        });
    });
  }

  public disconnect(): void {
    if (this.room) {
      console.log("🔌 Desconectando de Colyseus");
      this.room.leave();
      this.room = null;
      this.isConnected = false;
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

  private setupRoomListeners() {
    if (!this.room) return;

    // Room events
    this.room.onLeave((code) => {
      console.log("🔌 Desconectado de la sala:", code);
      this.isConnected = false;
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
    if (this.room?.connection.isOpen) {
      this.room.send("player:join", data);
    } else {
      console.log("❌ Room no conectada, no se puede enviar player:join");
    }
  }

  public leavePlayer(): void {
    if (this.room?.connection.isOpen) {
      this.room.send("player:leave", {});
    }
  }

  public movePlayer(data: any): void {
    if (this.room?.connection.isOpen) {
      this.room.send("player:move", data);
    }
  }

  public attackPlayer(data: { targetId: string; damage: number }): void {
    if (this.room?.connection.isOpen) {
      this.room.send("player:attack", data);
    }
  }

  public interactWithObject(data: { objectId: string; action: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send("player:interact", data);
    }
  }

  // Chat events
  public sendMessage(data: { message: string; channel: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send("chat:message", data);
    }
  }

  public joinChannel(data: { channel: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send("chat:join-channel", data);
    }
  }

  public leaveChannel(data: { channel: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send("chat:leave-channel", data);
    }
  }

  // World events
  public changeWorld(data: { worldId: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send("world:change", data);
    }
  }

  public requestWorldData(data: { worldId: string }): void {
    if (this.room?.connection.isOpen) {
      this.room.send("world:request-data", data);
    }
  }

  // Heartbeat to keep session alive
  public sendHeartbeat(): void {
    if (this.room?.connection.isOpen) {
      this.room.send("player:heartbeat", { t: Date.now() });
    }
  }

  // Event listeners - manteniendo la misma interfaz
  public onPlayerJoined(callback: (data: any) => void): void {
    console.log("🔧 Registrando listener para player:joined");
    this.room?.onMessage("player:joined", (data) => {
      console.log("🔥 EVENTO player:joined RECIBIDO EN COLYSEUS:", data);
      callback(data);
    });
  }

  public onPlayerLeft(callback: (data: any) => void): void {
    this.room?.onMessage("player:left", callback);
  }

  public onPlayerMoved(callback: (data: any) => void): void {
    this.room?.onMessage("player:moved", callback);
  }

  public onPlayerAttacked(callback: (data: any) => void): void {
    this.room?.onMessage("player:attacked", callback);
  }

  public onPlayerDamaged(callback: (data: any) => void): void {
    this.room?.onMessage("player:damaged", callback);
  }

  public onPlayerDied(callback: (data: any) => void): void {
    this.room?.onMessage("player:died", callback);
  }

  public onPlayerRespawned(callback: (data: any) => void): void {
    this.room?.onMessage("player:respawned", callback);
  }

  public onPlayerLevelUp(callback: (data: any) => void): void {
    this.room?.onMessage("player:levelup", callback);
  }

  public onPlayerRole(
    callback: (data: { playerId: string; roleId: string | null }) => void
  ): void {
    this.room?.onMessage("player:role", callback);
  }

  public onChatMessage(callback: (data: any) => void): void {
    this.room?.onMessage("chat:message", callback);
  }

  public onChatSystem(callback: (data: any) => void): void {
    this.room?.onMessage("chat:system", callback);
  }

  public onWorldUpdate(callback: (data: any) => void): void {
    this.room?.onMessage("world:update", callback);
  }

  public onWorldChanged(callback: (data: any) => void): void {
    this.room?.onMessage("world:changed", callback);
  }

  public onMonsterSpawned(callback: (data: any) => void): void {
    this.room?.onMessage("monster:spawned", callback);
  }

  public onMonsterDied(callback: (data: any) => void): void {
    this.room?.onMessage("monster:died", callback);
  }

  public onMonsterMoved(callback: (data: any) => void): void {
    this.room?.onMessage("monster:moved", callback);
  }

  public onSystemError(callback: (data: any) => void): void {
    this.room?.onMessage("system:error", callback);
  }

  public onSystemMaintenance(callback: (data: any) => void): void {
    this.room?.onMessage("system:maintenance", callback);
  }

  public onPlayersUpdated(callback: (data: any) => void): void {
    console.log(
      "🔧 Registrando listener para players:updated en ColyseusClient"
    );
    this.room?.onMessage("players:updated", (data) => {
      console.log(
        "🔥 EVENTO players:updated RECIBIDO EN COLYSEUS CLIENT:",
        data
      );
      callback(data);
    });
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
    // Colyseus no tiene un método off directo, pero podemos ignorar esto por ahora
    console.log(`🔧 Removiendo listener para ${event}`);
  }

  // Remove all event listeners
  public removeAllListeners(): void {
    // Colyseus maneja esto automáticamente
    console.log("🔧 Removiendo todos los listeners");
  }
}

// Export singleton instance
export const colyseusClient = ColyseusClient.getInstance();
export default colyseusClient;
