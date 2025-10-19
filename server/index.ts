import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../src/types/socket.types';
import dotenv from 'dotenv';

// Cargar variables de entorno PRIMERO
dotenv.config({ path: '.env.local' });

// Importar Redis DESPUÉS de cargar las variables
import { gameRedis } from '../src/lib/services/redis';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

// Create HTTP server
const httpServer = createServer();

// Create Socket.IO server
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Store connected players
const players = new Map<string, PlayerData>();
const worlds = new Map<string, Set<string>>();

interface PlayerData {
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
  lastUpdate?: number;
}

// Initialize default world
worlds.set('default', new Set());

console.log('🚀 Iniciando servidor Socket.IO...');

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

    // Player join event
    socket.on('player:join', async (data) => {
      console.log(`👤 Jugador ${data.username} se unió al mundo ${data.worldId}`);
      console.log('🔍 Datos recibidos:', data);
    
    // Add player to the room for the specific world
    socket.join(data.worldId);
    
    // Store player data in Redis
    const player = {
      id: socket.id,
      username: data.username,
      position: JSON.stringify({ x: 0, y: 0, z: 0 }),
      rotation: JSON.stringify({ x: 0, y: 0, z: 0 }),
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
      worldId: data.worldId,
      isOnline: true,
      lastSeen: Date.now(),
      lastUpdate: Date.now(),
    };
    
    // Store in Redis
    await gameRedis.addPlayer(socket.id, player);
    // Join Socket.IO room (IMPORTANTE: esto permite que io.to(worldId) funcione)
    socket.join(data.worldId);
    console.log(`🚪 Socket ${socket.id} se unió a la sala ${data.worldId}`);
    
    await gameRedis.joinRoom(data.worldId, socket.id);
    
    // Also store locally for quick access
    players.set(socket.id, { 
      ...player, 
      position: JSON.parse(player.position), 
      rotation: JSON.parse(player.rotation),
      lastSeen: new Date(player.lastSeen)
    });
    
    // Add to world
    if (!worlds.has(data.worldId)) {
      worlds.set(data.worldId, new Set());
    }
    worlds.get(data.worldId)?.add(socket.id);
    
    // Limpiar jugadores duplicados antes de obtener la lista
    await gameRedis.cleanupExpiredData();
    
    // Get all players in the world from Redis
    const worldPlayers = await gameRedis.getAllPlayers();
    const filteredPlayers = worldPlayers.filter((p: any) => p.worldId === data.worldId);
    
    // Eliminar duplicados por username (mantener el más reciente)
    const uniquePlayers = new Map();
    filteredPlayers.forEach((player: any) => {
      const existing = uniquePlayers.get(player.username);
      if (!existing || new Date(player.lastSeen) > new Date(existing.lastSeen)) {
        uniquePlayers.set(player.username, player);
      }
    });
    const deduplicatedPlayers = Array.from(uniquePlayers.values());
    console.log(`🌍 Jugadores en el mundo ${data.worldId}:`, deduplicatedPlayers.length);
    console.log('👥 Lista de jugadores (sin duplicados):', deduplicatedPlayers.map(p => ({ id: p.id, username: p.username })));
    
    // Get map decorations from Redis
    const mapDecorations = await gameRedis.getMapDecorations(data.worldId);
    
    // Broadcast to all players in the world
    const playerData = { ...player, position: JSON.parse(player.position), rotation: JSON.parse(player.rotation), lastSeen: new Date(player.lastSeen) };
    const playersData = deduplicatedPlayers.map((p: any) => ({ 
      ...p, 
      position: typeof p.position === 'string' ? JSON.parse(p.position) : p.position, 
      rotation: typeof p.rotation === 'string' ? JSON.parse(p.rotation) : p.rotation,
      lastSeen: new Date(p.lastSeen)
    }));
    
    // Verificar cuántos sockets hay en la sala
    const roomSize = io.sockets.adapter.rooms.get(data.worldId)?.size || 0;
    console.log(`📡 Sala ${data.worldId} tiene ${roomSize} sockets conectados`);
    console.log('📡 Datos del jugador:', playerData.username);
    console.log('📡 Lista de jugadores:', playersData.map(p => p.username));
    
    // Enviar a TODOS los jugadores en el mundo (incluyendo al que se acaba de unir)
    // Esto asegura que todos tengan la lista completa de jugadores
    io.to(data.worldId).emit('player:joined', {
      player: playerData,
      players: playersData,
    });
    
    // También enviar world:update para sincronizar a todos
    io.to(data.worldId).emit('world:update', {
      world: {
        id: data.worldId,
        name: 'Hotel Humboldt',
        type: 'hotel',
        maxPlayers: 50,
        currentPlayers: deduplicatedPlayers.length,
        spawnPoint: { x: 0, y: 0, z: 0 },
        bounds: {
          min: { x: -100, y: 0, z: -100 },
          max: { x: 100, y: 50, z: 100 }
        },
        isActive: true,
        createdAt: new Date(),
      },
      players: playersData,
      objects: mapDecorations || [],
    });
    
    console.log(`📡 Enviando player:joined a ${roomSize} jugadores en la sala ${data.worldId}`);
    console.log(`📡 Jugador que se unió: ${playerData.username} (${playerData.id})`);
    console.log(`📡 Lista completa enviada:`, playersData.map(p => `${p.username} (${p.id})`));
    
    // Get recent chat messages from Redis
    let recentMessages: any[] = [];
    try {
      recentMessages = await gameRedis.getChatMessages(50); // Last 50 messages
    } catch (error) {
      console.warn('⚠️ Redis no disponible para cargar mensajes de chat');
    }

    // Send current world state to the new player
    socket.emit('world:update', {
      world: {
        id: data.worldId,
        name: 'Hotel Humboldt',
        type: 'hotel',
        maxPlayers: 50,
        currentPlayers: filteredPlayers.length + 1,
        spawnPoint: { x: 0, y: 0, z: 0 },
        bounds: {
          min: { x: -100, y: 0, z: -100 },
          max: { x: 100, y: 50, z: 100 }
        },
        isActive: true,
        createdAt: new Date(),
      },
      players: filteredPlayers.map((p: any) => ({ 
        ...p, 
        position: typeof p.position === 'string' ? JSON.parse(p.position) : p.position, 
        rotation: typeof p.rotation === 'string' ? JSON.parse(p.rotation) : p.rotation,
        lastSeen: new Date(p.lastSeen)
      })),
      objects: mapDecorations, // Decoraciones del mapa desde Redis
      chatMessages: recentMessages, // Mensajes de chat desde Redis
    });

    // Update server stats
    await gameRedis.incrementServerStats('players_joined');
  });

  // Player movement event
  socket.on('player:move', async (data) => {
    const player = players.get(socket.id);
    if (player) {
      // Update player position in Redis
      await gameRedis.updatePlayerPosition(socket.id, data.position);
      
      // Update local player data
      player.position = data.position;
      player.rotation = data.rotation;
      player.lastUpdate = Date.now();
      
      // Broadcast movement to other players in the same world
      socket.to(player.worldId).emit('player:moved', {
        playerId: socket.id,
        movement: data,
      });
    }
  });

  // Player attack event
  socket.on('player:attack', (attackData) => {
    console.log(`⚔️ Jugador ${socket.id} atacó a ${attackData.targetId}`);
    
    const player = players.get(socket.id);
    if (player) {
      // Broadcast attack to all players in the world
      socket.to(player.worldId).emit('player:attacked', {
        attackerId: socket.id,
        targetId: attackData.targetId,
        damage: attackData.damage,
      });
    }
  });

  // Player interact event
  socket.on('player:interact', (interactData) => {
    console.log(`🤝 Jugador ${socket.id} interactuó con ${interactData.objectId}`);
    // TODO: Implement interaction logic
  });

  // Chat message event
  socket.on('chat:message', async (messageData) => {
    console.log(`💬 Chat: ${messageData.message}`);
    
    const player = players.get(socket.id);
    if (player) {
      const chatMessage = {
        id: `msg_${Date.now()}_${socket.id}`,
        playerId: socket.id,
        username: player.username,
        message: messageData.message,
        channel: messageData.channel || 'global',
        timestamp: new Date(),
        type: 'player'
      };

      // Save message to Redis
      try {
        await gameRedis.addChatMessage(chatMessage);
      } catch (error) {
        console.warn('⚠️ Redis no disponible para chat, usando solo memoria local');
      }

      // Broadcast message to all players in the world
      io.to(player.worldId).emit('chat:message', chatMessage);
      
      // Update server stats
      try {
        await gameRedis.incrementServerStats('messages_sent');
      } catch (error) {
        // Redis no disponible, continuar sin estadísticas
      }
    }
  });

  // Inventory events
  socket.on('inventory:update', (_inventoryData) => {
    console.log(`🎒 Inventario actualizado para ${socket.id}`);
    // TODO: Implement inventory sync
  });

  // World change event
  socket.on('world:change', (worldData) => {
    console.log(`🌍 Jugador ${socket.id} cambió al mundo ${worldData.worldId}`);
    
    const player = players.get(socket.id);
    if (player) {
      // Remove from current world
      worlds.get(player.worldId)?.delete(socket.id);
      
      // Add to new world
      if (!worlds.has(worldData.worldId)) {
        worlds.set(worldData.worldId, new Set());
      }
      worlds.get(worldData.worldId)?.add(socket.id);
      
      // Update player world
      player.worldId = worldData.worldId;
      
      // Join new room
      socket.leave(player.worldId);
      socket.join(worldData.worldId);
      
      // Notify player of world change
      socket.emit('world:changed', {
        worldId: worldData.worldId,
        spawnPoint: { x: 0, y: 0, z: 0 },
      });
    }
  });

  // Player disconnect event
  socket.on('disconnect', async (reason) => {
    console.log(`🔌 Cliente desconectado: ${socket.id}, razón: ${reason}`);
    
    const player = players.get(socket.id);
    if (player) {
      // Remove from Redis
      await gameRedis.removePlayer(socket.id);
      await gameRedis.leaveRoom(player.worldId, socket.id);
      
      // Remove from world
      worlds.get(player.worldId)?.delete(socket.id);
      
      // Remove player
      players.delete(socket.id);
      
      // Get remaining players from Redis
      const remainingPlayers = await gameRedis.getAllPlayers();
      const worldPlayers = remainingPlayers.filter((p: any) => p.worldId === player.worldId);
      
      // Broadcast player left to all players in the world
      socket.to(player.worldId).emit('player:left', {
        playerId: socket.id,
        players: worldPlayers.map((p: any) => ({ 
          ...p, 
          position: typeof p.position === 'string' ? JSON.parse(p.position) : p.position, 
          rotation: typeof p.rotation === 'string' ? JSON.parse(p.rotation) : p.rotation,
          lastSeen: new Date(p.lastSeen)
        })),
      });
      
      // Update server stats
      await gameRedis.incrementServerStats('players_left');
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`❌ Error en socket ${socket.id}:`, error);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor Socket.IO ejecutándose en puerto ${PORT}`);
  console.log(`🌐 Cliente URL: ${CLIENT_URL}`);
  console.log(`📡 WebSocket disponible en: ws://localhost:${PORT}`);
  console.log(`🔴 Redis conectado a Upstash`);
});

// Cleanup expired data every 5 minutes
setInterval(async () => {
  try {
    await gameRedis.cleanupExpiredData();
    console.log('🧹 Limpieza de datos expirados completada');
  } catch (error) {
    console.error('❌ Error en limpieza de datos:', error);
  }
}, 5 * 60 * 1000); // 5 minutes

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');
  try {
    await gameRedis.cleanupAllData();
    console.log('🧹 Datos de Redis limpiados');
  } catch (error) {
    console.warn('⚠️ Error limpiando datos:', error);
  }
  process.exit(0);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor Socket.IO...');
  httpServer.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor Socket.IO...');
  httpServer.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

export { io };
