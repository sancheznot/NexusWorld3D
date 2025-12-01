// import { Redis } from '@upstash/redis';

// Variable para almacenar la instancia de Redis
// let redis: Redis | null = null;

// Función para obtener la instancia de Redis (lazy initialization)
// function getRedis(): Redis {
//   if (!redis) {
//     const url = process.env.UPSTASH_REDIS_REST_URL;
//     const token = process.env.UPSTASH_REDIS_REST_TOKEN;

//     if (!url || !token) {
//       throw new Error('Redis credentials not found. Please check your .env.local file.');
//     }

//     redis = new Redis({
//       url: url,
//       token: token,
//     });
//   }

//   return redis;
// }

// export default getRedis;

// Mock implementation for "dumb" mode
export class GameRedis {
  private players = new Map<string, any>();
  private onlinePlayers = new Set<string>();
  private chatMessages: any[] = [];
  private worldStates = new Map<string, any>();
  private mapDecorations = new Map<string, any[]>();
  private rooms = new Map<string, any>();
  private roomPlayers = new Map<string, Set<string>>();
  private serverStats = new Map<string, number>();

  constructor() {
    console.log("⚠️ Running with Mock Redis (In-Memory)");
  }

  // Jugadores online
  async addPlayer(playerId: string, playerData: any) {
    this.players.set(playerId, playerData);
    this.onlinePlayers.add(playerId);
  }

  async removePlayer(playerId: string) {
    this.players.delete(playerId);
    this.onlinePlayers.delete(playerId);
  }

  async getPlayer(playerId: string) {
    return this.players.get(playerId) || null;
  }

  async getAllPlayers() {
    const players = [];
    for (const playerId of this.onlinePlayers) {
      const data = this.players.get(playerId);
      if (data) players.push({ id: playerId, ...data });
    }
    return players;
  }

  // Chat messages
  async addChatMessage(message: any) {
    const messageId = `msg:${Date.now()}:${Math.random()}`;
    this.chatMessages.push({ id: messageId, ...message });
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
    return messageId;
  }

  async getChatMessages(limit: number = 50) {
    return [...this.chatMessages].reverse().slice(0, limit);
  }

  // World state
  async saveWorldState(worldId: string, worldData: any) {
    this.worldStates.set(worldId, { ...worldData, lastUpdate: Date.now() });
  }

  async getWorldState(worldId: string) {
    return this.worldStates.get(worldId) || null;
  }

  // Decoraciones del mapa
  async saveMapDecorations(worldId: string, decorations: any[]) {
    this.mapDecorations.set(worldId, decorations);
  }

  async getMapDecorations(worldId: string) {
    return this.mapDecorations.get(worldId) || [];
  }

  // Posiciones de jugadores
  async updatePlayerPosition(playerId: string, position: any) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.set(playerId, {
        ...player,
        position: JSON.stringify(position),
        lastUpdate: Date.now(),
      });
    }
  }

  async getPlayerPosition(playerId: string) {
    const player = this.players.get(playerId);
    return player?.position ? JSON.parse(player.position) : null;
  }

  // Salas de juego
  async createRoom(roomId: string, roomData: any) {
    this.rooms.set(roomId, {
      ...roomData,
      createdAt: Date.now(),
      playerCount: 0,
    });
    this.roomPlayers.set(roomId, new Set());
  }

  async joinRoom(roomId: string, playerId: string) {
    const players = this.roomPlayers.get(roomId);
    if (players) players.add(playerId);

    const room = this.rooms.get(roomId);
    if (room) room.playerCount = (room.playerCount || 0) + 1;
  }

  async leaveRoom(roomId: string, playerId: string) {
    const players = this.roomPlayers.get(roomId);
    if (players) players.delete(playerId);

    const room = this.rooms.get(roomId);
    if (room) room.playerCount = Math.max(0, (room.playerCount || 0) - 1);
  }

  async getRoomPlayers(roomId: string) {
    return Array.from(this.roomPlayers.get(roomId) || []);
  }

  // Estadísticas del servidor
  async incrementServerStats(stat: string, value: number = 1) {
    const current = this.serverStats.get(stat) || 0;
    this.serverStats.set(stat, current + value);
  }

  async getServerStats() {
    return Object.fromEntries(this.serverStats);
  }

  // Limpieza automática
  async cleanupExpiredData() {
    console.log("🧹 Mock Redis cleanup (noop)");
  }

  async cleanupAllData() {
    this.players.clear();
    this.onlinePlayers.clear();
    this.chatMessages = [];
    this.worldStates.clear();
    this.mapDecorations.clear();
    this.rooms.clear();
    this.roomPlayers.clear();
    this.serverStats.clear();
    console.log("🧹 Mock Redis cleared");
  }
}

// Crear instancia global de forma lazy
let gameRedisInstance: GameRedis | null = null;

export function getGameRedis(): GameRedis {
  if (!gameRedisInstance) {
    gameRedisInstance = new GameRedis();
  }
  return gameRedisInstance;
}

// Para compatibilidad con el código existente
export const gameRedis = {
  addPlayer: (id: string, data: any) => getGameRedis().addPlayer(id, data),
  removePlayer: (id: string) => getGameRedis().removePlayer(id),
  getPlayer: (id: string) => getGameRedis().getPlayer(id),
  getAllPlayers: () => getGameRedis().getAllPlayers(),
  addChatMessage: (message: any) => getGameRedis().addChatMessage(message),
  getChatMessages: (limit?: number) => getGameRedis().getChatMessages(limit),
  saveWorldState: (worldId: string, state: any) =>
    getGameRedis().saveWorldState(worldId, state),
  getWorldState: (worldId: string) => getGameRedis().getWorldState(worldId),
  saveMapDecorations: (worldId: string, decorations: any) =>
    getGameRedis().saveMapDecorations(worldId, decorations),
  getMapDecorations: (worldId: string) =>
    getGameRedis().getMapDecorations(worldId),
  updatePlayerPosition: (id: string, position: any) =>
    getGameRedis().updatePlayerPosition(id, position),
  getPlayerPosition: (id: string) => getGameRedis().getPlayerPosition(id),
  createRoom: (roomId: string, data: any) =>
    getGameRedis().createRoom(roomId, data),
  joinRoom: (roomId: string, playerId: string) =>
    getGameRedis().joinRoom(roomId, playerId),
  leaveRoom: (roomId: string, playerId: string) =>
    getGameRedis().leaveRoom(roomId, playerId),
  getRoomPlayers: (roomId: string) => getGameRedis().getRoomPlayers(roomId),
  incrementServerStats: (key: string, value: number) =>
    getGameRedis().incrementServerStats(key, value),
  getServerStats: () => getGameRedis().getServerStats(),
  cleanupExpiredData: () => getGameRedis().cleanupExpiredData(),
  cleanupAllData: () => getGameRedis().cleanupAllData(),
};
