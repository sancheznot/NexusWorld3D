import { Server } from 'colyseus';
import { createServer } from 'http';
import { HotelHumboldtRoom } from './rooms/HotelHumboldtRoom';

const PORT = 3002;

// Create HTTP server
const httpServer = createServer();

// Create Colyseus server
const gameServer = new Server({
  server: httpServer,
});

// Register the Hotel Humboldt room
gameServer.define('hotel-humboldt', HotelHumboldtRoom);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor Colyseus ejecutándose en puerto ${PORT}`);
  console.log(`📡 WebSocket disponible en: ws://localhost:${PORT}`);
  console.log(`🏨 Hotel Humboldt Room disponible`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor Colyseus...');
  httpServer.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});
