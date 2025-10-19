import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '../src/types/socket.types';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

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
const players = new Map<string, any>();
const worlds = new Map<string, Set<string>>();

// Initialize default world
worlds.set('default', new Set());

console.log('🚀 Iniciando servidor Socket.IO...');

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  // Player join event
  socket.on('player:join', (data) => {
    console.log(`👤 Jugador ${data.username} se unió al mundo ${data.worldId}`);
    
    // Add player to the room for the specific world
    socket.join(data.worldId);
    
    // Store player data
    const player = {
      id: socket.id,
      username: data.username,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
      worldId: data.worldId,
      isOnline: true,
      lastSeen: new Date(),
    };
    
    players.set(socket.id, player);
    
    // Add to world
    if (!worlds.has(data.worldId)) {
      worlds.set(data.worldId, new Set());
    }
    worlds.get(data.worldId)?.add(socket.id);
    
    // Get all players in the world
    const worldPlayers = Array.from(worlds.get(data.worldId) || [])
      .map(playerId => players.get(playerId))
      .filter(Boolean);
    
    // Broadcast to all players in the world
    socket.to(data.worldId).emit('player:joined', {
      player,
      players: worldPlayers,
    });
    
    // Send current world state to the new player
    socket.emit('world:update', {
      world: {
        id: data.worldId,
        name: 'Hotel Humboldt',
        type: 'hotel',
        maxPlayers: 50,
        currentPlayers: worldPlayers.length + 1,
        spawnPoint: { x: 0, y: 0, z: 0 },
        bounds: {
          min: { x: -100, y: 0, z: -100 },
          max: { x: 100, y: 50, z: 100 }
        },
        isActive: true,
        createdAt: new Date(),
      },
      players: worldPlayers,
      objects: [],
    });
  });

  // Player movement event
  socket.on('player:move', (data) => {
    const player = players.get(socket.id);
    if (player) {
      // Update player position
      player.position = data.position;
      player.rotation = data.rotation;
      
      // Broadcast movement to other players in the same world
      socket.to(player.worldId).emit('player:moved', {
        playerId: socket.id,
        movement: data,
      });
    }
  });

  // Player attack event
  socket.on('player:attack', (data) => {
    console.log(`⚔️ Jugador ${socket.id} atacó a ${data.targetId}`);
    
    const player = players.get(socket.id);
    if (player) {
      // Broadcast attack to all players in the world
      socket.to(player.worldId).emit('player:attacked', {
        attackerId: socket.id,
        targetId: data.targetId,
        damage: data.damage,
      });
    }
  });

  // Player interact event
  socket.on('player:interact', (data) => {
    console.log(`🤝 Jugador ${socket.id} interactuó con ${data.objectId}`);
    // TODO: Implement interaction logic
  });

  // Chat message event
  socket.on('chat:message', (data) => {
    console.log(`💬 Chat: ${data.message}`);
    
    const player = players.get(socket.id);
    if (player) {
      // Broadcast message to all players in the world
      io.to(player.worldId).emit('chat:message', {
        playerId: socket.id,
        username: player.username,
        message: data.message,
        channel: data.channel,
        timestamp: new Date(),
      });
    }
  });

  // Inventory events
  socket.on('inventory:update', (data) => {
    console.log(`🎒 Inventario actualizado para ${socket.id}`);
    // TODO: Implement inventory sync
  });

  // World change event
  socket.on('world:change', (data) => {
    console.log(`🌍 Jugador ${socket.id} cambió al mundo ${data.worldId}`);
    
    const player = players.get(socket.id);
    if (player) {
      // Remove from current world
      worlds.get(player.worldId)?.delete(socket.id);
      
      // Add to new world
      if (!worlds.has(data.worldId)) {
        worlds.set(data.worldId, new Set());
      }
      worlds.get(data.worldId)?.add(socket.id);
      
      // Update player world
      player.worldId = data.worldId;
      
      // Join new room
      socket.leave(player.worldId);
      socket.join(data.worldId);
      
      // Notify player of world change
      socket.emit('world:changed', {
        worldId: data.worldId,
        spawnPoint: { x: 0, y: 0, z: 0 },
      });
    }
  });

  // Player disconnect event
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Cliente desconectado: ${socket.id}, razón: ${reason}`);
    
    const player = players.get(socket.id);
    if (player) {
      // Remove from world
      worlds.get(player.worldId)?.delete(socket.id);
      
      // Remove player
      players.delete(socket.id);
      
      // Broadcast player left to all players in the world
      socket.to(player.worldId).emit('player:left', {
        playerId: socket.id,
        players: Array.from(worlds.get(player.worldId) || [])
          .map(playerId => players.get(playerId))
          .filter(Boolean),
      });
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
