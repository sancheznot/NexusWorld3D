import { Redis } from '@upstash/redis';

// Variable para almacenar la instancia de Redis
let redis: Redis | null = null;

// Función para obtener la instancia de Redis (lazy initialization)
function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      throw new Error('Redis credentials not found. Please check your .env.local file.');
    }
    
    redis = new Redis({
      url: url,
      token: token,
    });
  }
  
  return redis;
}

export default getRedis;

// Funciones helper para el juego
export class GameRedis {
  private redis: Redis;

  constructor() {
    this.redis = getRedis();
  }

  // Jugadores online
  async addPlayer(playerId: string, playerData: any) {
    await this.redis.hset(`player:${playerId}`, playerData);
    await this.redis.sadd('online_players', playerId);
    await this.redis.expire(`player:${playerId}`, 3600); // 1 hora
  }

  async removePlayer(playerId: string) {
    await this.redis.del(`player:${playerId}`);
    await this.redis.srem('online_players', playerId);
  }

  async getPlayer(playerId: string) {
    return await this.redis.hgetall(`player:${playerId}`);
  }

  async getAllPlayers() {
    const playerIds = await this.redis.smembers('online_players');
    const players = [];
    
    for (const playerId of playerIds) {
      const playerData = await this.redis.hgetall(`player:${playerId}`);
      if (playerData && Object.keys(playerData).length > 0) {
        players.push({ id: playerId, ...playerData });
      }
    }
    
    return players;
  }

  // Chat messages
  async addChatMessage(message: any) {
    const messageId = `msg:${Date.now()}:${Math.random()}`;
    await this.redis.hset(`chat:${messageId}`, message);
    await this.redis.lpush('chat:messages', messageId);
    await this.redis.ltrim('chat:messages', 0, 99); // Keep last 100 messages
    return messageId;
  }

  async getChatMessages(limit: number = 50) {
    const messageIds = await this.redis.lrange('chat:messages', 0, limit - 1);
    const messages = [];
    
    for (const messageId of messageIds) {
      const message = await this.redis.hgetall(`chat:${messageId}`);
      if (message && Object.keys(message).length > 0) {
        messages.push({ id: messageId, ...message });
      }
    }
    
    return messages.reverse(); // Most recent first
  }

  // World state - Información del mapa
  async saveWorldState(worldId: string, worldData: any) {
    await this.redis.hset(`world:${worldId}`, {
      ...worldData,
      lastUpdate: Date.now()
    });
    await this.redis.expire(`world:${worldId}`, 86400); // 24 horas
  }

  async getWorldState(worldId: string) {
    return await this.redis.hgetall(`world:${worldId}`);
  }

  // Decoraciones del mapa - Para que sean iguales para todos
  async saveMapDecorations(worldId: string, decorations: any[]) {
    await this.redis.set(`map:${worldId}:decorations`, JSON.stringify(decorations));
    await this.redis.expire(`map:${worldId}:decorations`, 86400); // 24 horas
  }

  async getMapDecorations(worldId: string) {
    const decorations = await this.redis.get(`map:${worldId}:decorations`);
    return decorations ? JSON.parse(decorations as string) : [];
  }

  // Posiciones de jugadores
  async updatePlayerPosition(playerId: string, position: any) {
    await this.redis.hset(`player:${playerId}`, {
      position: JSON.stringify(position),
      lastUpdate: Date.now()
    });
  }

  async getPlayerPosition(playerId: string) {
    const data = await this.redis.hget(`player:${playerId}`, 'position');
    return data ? JSON.parse(data as string) : null;
  }

  // Salas de juego
  async createRoom(roomId: string, roomData: any) {
    await this.redis.hset(`room:${roomId}`, {
      ...roomData,
      createdAt: Date.now(),
      playerCount: 0
    });
    await this.redis.expire(`room:${roomId}`, 7200); // 2 horas
  }

  async joinRoom(roomId: string, playerId: string) {
    await this.redis.sadd(`room:${roomId}:players`, playerId);
    await this.redis.hincrby(`room:${roomId}`, 'playerCount', 1);
  }

  async leaveRoom(roomId: string, playerId: string) {
    await this.redis.srem(`room:${roomId}:players`, playerId);
    await this.redis.hincrby(`room:${roomId}`, 'playerCount', -1);
  }

  async getRoomPlayers(roomId: string) {
    return await this.redis.smembers(`room:${roomId}:players`);
  }

  // Estadísticas del servidor
  async incrementServerStats(stat: string, value: number = 1) {
    await this.redis.hincrby('server:stats', stat, value);
  }

  async getServerStats() {
    return await this.redis.hgetall('server:stats');
  }

  // Limpieza automática
  async cleanupExpiredData() {
    const now = Date.now();
    
    // Limpiar jugadores inactivos (más de 5 minutos)
    const playerIds = await this.redis.smembers('online_players');
    for (const playerId of playerIds) {
      const lastUpdate = await this.redis.hget(`player:${playerId}`, 'lastUpdate');
      if (lastUpdate && now - parseInt(lastUpdate as string) > 300000) {
        await this.redis.del(`player:${playerId}`);
        await this.redis.srem('online_players', playerId);
      }
    }

    // Limpiar salas vacías (más de 1 hora sin actividad)
    const roomKeys = await this.redis.keys('room:*');
    for (const roomKey of roomKeys) {
      if (roomKey.includes(':players')) continue;
      
      const roomData = await this.redis.hgetall(roomKey);
      if (roomData && roomData.playerCount === '0' && now - parseInt(roomData.createdAt as string) > 3600000) {
        const roomId = roomKey.replace('room:', '');
        await this.redis.del(roomKey);
        await this.redis.del(`room:${roomId}:players`);
      }
    }
  }

  async cleanupAllData() {
    try {
      // Limpiar todos los datos de jugadores
      const playerKeys = await this.redis.keys('player:*');
      if (playerKeys.length > 0) {
        await this.redis.del(...playerKeys);
        console.log(`🧹 ${playerKeys.length} jugadores eliminados`);
      }
      
      // Limpiar todas las salas
      const roomKeys = await this.redis.keys('room:*');
      if (roomKeys.length > 0) {
        await this.redis.del(...roomKeys);
        console.log(`🧹 ${roomKeys.length} salas eliminadas`);
      }
      
      // Limpiar jugadores en línea
      await this.redis.del('online_players');
      console.log('🧹 Jugadores en línea eliminados');
      
      // Limpiar estadísticas del servidor
      await this.redis.del('server:stats');
      console.log('🧹 Estadísticas del servidor eliminadas');
      
      console.log('✅ Limpieza completa de Redis realizada');
    } catch (error) {
      console.error('❌ Error en limpieza completa:', error);
      throw error;
    }
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
  saveWorldState: (worldId: string, state: any) => getGameRedis().saveWorldState(worldId, state),
  getWorldState: (worldId: string) => getGameRedis().getWorldState(worldId),
  saveMapDecorations: (worldId: string, decorations: any) => getGameRedis().saveMapDecorations(worldId, decorations),
  getMapDecorations: (worldId: string) => getGameRedis().getMapDecorations(worldId),
  updatePlayerPosition: (id: string, position: any) => getGameRedis().updatePlayerPosition(id, position),
  getPlayerPosition: (id: string) => getGameRedis().getPlayerPosition(id),
  createRoom: (roomId: string, data: any) => getGameRedis().createRoom(roomId, data),
  joinRoom: (roomId: string, playerId: string) => getGameRedis().joinRoom(roomId, playerId),
  leaveRoom: (roomId: string, playerId: string) => getGameRedis().leaveRoom(roomId, playerId),
  getRoomPlayers: (roomId: string) => getGameRedis().getRoomPlayers(roomId),
  incrementServerStats: (key: string, value: number) => getGameRedis().incrementServerStats(key, value),
  getServerStats: () => getGameRedis().getServerStats(),
  cleanupExpiredData: () => getGameRedis().cleanupExpiredData(),
  cleanupAllData: () => getGameRedis().cleanupAllData(),
};
