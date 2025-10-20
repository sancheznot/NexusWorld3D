import { createServer } from 'http';
import { Server } from 'colyseus';
import { HotelHumboldtRoom } from './rooms/HotelHumboldtRoom';
import dotenv from 'dotenv';

// Cargar variables de entorno PRIMERO
dotenv.config({ path: '.env.local' });

// Importar Redis DESPUÉS de cargar las variables
import { gameRedis } from '../src/lib/services/redis';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

// Create Colyseus server
const gameServer = new Server();

// Register the Hotel Humboldt room
gameServer.define('hotel-humboldt', HotelHumboldtRoom)
  .enableRealtimeListing();

console.log('🚀 Iniciando servidor Colyseus...');

// CORS is handled by Colyseus automatically

// Start server
gameServer.listen(PORT, () => {
  console.log(`🚀 Servidor Colyseus ejecutándose en puerto ${PORT}`);
  console.log(`🌐 Cliente URL: ${CLIENT_URL}`);
  console.log(`📡 WebSocket disponible en: ws://localhost:${PORT}`);
  console.log(`🏨 Hotel Humboldt Room disponible`);
  console.log(`🔴 Redis conectado a Upstash`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor Colyseus...');
  gameServer.gracefullyShutdown();
});

process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor Colyseus...');
  gameServer.gracefullyShutdown();
});

export { gameServer };
