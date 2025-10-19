import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

// Global variable to store the Socket.IO server instance
let io: SocketIOServer | null = null;

export async function GET() {
  // This endpoint is used to initialize the Socket.IO server
  // The actual Socket.IO server will be created in the SocketProvider
  return new Response('Socket.IO server endpoint', { status: 200 });
}

export async function POST(request :NextRequest) {
  // This endpoint can be used for additional Socket.IO configuration
  return new Response('Socket.IO server configured', { status: 200 });
}

// Function to get or create the Socket.IO server
export function getSocketIOServer() {
  if (!io) {
    throw new Error('Socket.IO server not initialized');
  }
  return io;
}

// Function to initialize the Socket.IO server
export function initializeSocketIOServer(server: HttpServer) {
  if (!io) {
    io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXT_PUBLIC_APP_URL 
          : "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Socket.IO event handlers
    io.on('connection', (socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      // Player join event
      socket.on('player:join', (data) => {
        console.log(`👤 Jugador ${data.username} se unió al mundo ${data.worldId}`);
        
        // Add player to the room for the specific world
        socket.join(data.worldId);
        
        // Broadcast to all players in the world
        socket.to(data.worldId).emit('player:joined', {
          player: {
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
            lastSeen: new Date()
          },
          players: [] // This would be populated with actual players
        });
      });

      // Player movement event
      socket.on('player:move', (data) => {
        // Broadcast movement to other players in the same world
        socket.to(data.worldId || 'default').emit('player:moved', {
          playerId: socket.id,
          movement: data
        });
      });

      // Player attack event
      socket.on('player:attack', (data) => {
        console.log(`⚔️ Jugador ${socket.id} atacó a ${data.targetId}`);
        
        // Broadcast attack to all players in the world
        socket.to(data.worldId || 'default').emit('player:attacked', {
          attackerId: socket.id,
          targetId: data.targetId,
          damage: data.damage
        });
      });

      // Chat message event
      socket.on('chat:message', (data) => {
        console.log(`💬 Chat: ${data.message}`);
        
        // Broadcast message to all players in the world
        io?.to(data.worldId || 'default').emit('chat:message', {
          playerId: socket.id,
          username: 'Player', // This would come from player data
          message: data.message,
          channel: data.channel,
          timestamp: new Date()
        });
      });

      // Player disconnect event
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Cliente desconectado: ${socket.id}, razón: ${reason}`);
        
        // Broadcast player left to all players in all rooms
        socket.rooms.forEach(room => {
          socket.to(room).emit('player:left', {
            playerId: socket.id,
            players: [] // This would be populated with remaining players
          });
        });
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`❌ Error en socket ${socket.id}:`, error);
      });
    });

    console.log('🚀 Socket.IO server inicializado');
  }

  return io;
}

// Export the server instance
export { io };
