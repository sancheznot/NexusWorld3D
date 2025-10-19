import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents } from '@/types/socket.types';

class SocketClient {
  private static instance: SocketClient;
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const serverUrl = process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_SOCKET_URL || 'https://your-domain.com'
        : 'http://localhost:3001';

      console.log('🔌 Conectando a Socket.IO server:', serverUrl);

      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        autoConnect: true
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ Conectado al servidor Socket.IO');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Desconectado del servidor:', reason);
        this.isConnected = false;
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Intento de reconexión ${attemptNumber}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts = attemptNumber;
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Error de reconexión:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Falló la reconexión después de todos los intentos');
        this.isConnected = false;
      });
    });
  }

  public disconnect(): void {
    if (this.socket) {
      console.log('🔌 Desconectando del servidor Socket.IO');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  public getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  public isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Player events
  public joinPlayer(data: { playerId: string; username: string; worldId: string }): void {
    console.log('📤 Enviando player:join:', data, 'Socket conectado:', this.socket?.connected);
    if (this.socket?.connected) {
      this.socket.emit('player:join', data);
    } else {
      console.log('❌ Socket no conectado, no se puede enviar player:join');
    }
  }

  public leavePlayer(): void {
    if (this.socket?.connected) {
      this.socket.emit('player:leave');
    }
  }

  public movePlayer(data: any): void {
    if (this.socket?.connected) {
      this.socket.emit('player:move', data);
    }
  }

  public attackPlayer(data: { targetId: string; damage: number }): void {
    if (this.socket?.connected) {
      this.socket.emit('player:attack', data);
    }
  }

  public interactWithObject(data: { objectId: string; action: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('player:interact', data);
    }
  }

  // Chat events
  public sendMessage(data: { message: string; channel: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:message', data);
    }
  }

  public joinChannel(data: { channel: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:join-channel', data);
    }
  }

  public leaveChannel(data: { channel: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:leave-channel', data);
    }
  }

  // Inventory events
  public updateInventory(data: { items: any[] }): void {
    if (this.socket?.connected) {
      this.socket.emit('inventory:update', data);
    }
  }

  public useItem(data: { itemId: string; slot: number }): void {
    if (this.socket?.connected) {
      this.socket.emit('inventory:use-item', data);
    }
  }

  public dropItem(data: { itemId: string; position: any }): void {
    if (this.socket?.connected) {
      this.socket.emit('inventory:drop-item', data);
    }
  }

  // World events
  public changeWorld(data: { worldId: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('world:change', data);
    }
  }

  public requestWorldData(data: { worldId: string }): void {
    if (this.socket?.connected) {
      this.socket.emit('world:request-data', data);
    }
  }

  // Event listeners
  public onPlayerJoined(callback: (data: any) => void): void {
    console.log('🔧 Registrando listener para player:joined');
    this.socket?.on('player:joined', (data) => {
      console.log('🔥 EVENTO player:joined RECIBIDO EN SOCKET.IO:', data);
      callback(data);
    });
  }

  public onPlayerLeft(callback: (data: any) => void): void {
    this.socket?.on('player:left', callback);
  }

  public onPlayerMoved(callback: (data: any) => void): void {
    this.socket?.on('player:moved', callback);
  }

  public onPlayerAttacked(callback: (data: any) => void): void {
    this.socket?.on('player:attacked', callback);
  }

  public onPlayerDamaged(callback: (data: any) => void): void {
    this.socket?.on('player:damaged', callback);
  }

  public onPlayerDied(callback: (data: any) => void): void {
    this.socket?.on('player:died', callback);
  }

  public onPlayerRespawned(callback: (data: any) => void): void {
    this.socket?.on('player:respawned', callback);
  }

  public onPlayerLevelUp(callback: (data: any) => void): void {
    this.socket?.on('player:levelup', callback);
  }

  public onChatMessage(callback: (data: any) => void): void {
    this.socket?.on('chat:message', callback);
  }

  public onChatSystem(callback: (data: any) => void): void {
    this.socket?.on('chat:system', callback);
  }

  public onWorldUpdate(callback: (data: any) => void): void {
    this.socket?.on('world:update', callback);
  }

  public onWorldChanged(callback: (data: any) => void): void {
    this.socket?.on('world:changed', callback);
  }

  public onMonsterSpawned(callback: (data: any) => void): void {
    this.socket?.on('monster:spawned', callback);
  }

  public onMonsterDied(callback: (data: any) => void): void {
    this.socket?.on('monster:died', callback);
  }

  public onMonsterMoved(callback: (data: any) => void): void {
    this.socket?.on('monster:moved', callback);
  }

  public onSystemError(callback: (data: any) => void): void {
    this.socket?.on('system:error', callback);
  }

  public onSystemMaintenance(callback: (data: any) => void): void {
    this.socket?.on('system:maintenance', callback);
  }

  // Remove event listeners
  public off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  // Remove all event listeners
  public removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}

// Export singleton instance
export const socketClient = SocketClient.getInstance();
export default socketClient;
