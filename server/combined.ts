import { createServer } from "http";
import next from "next";
import dotenv from "dotenv";
import { Server as ColyseusServer } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { HotelHumboldtRoom } from "./rooms/HotelHumboldtRoom";

// Load envs
dotenv.config({ path: ".env.local" });

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000; // Single public port

// Prepare Next.js
const app = next({ dev });
const handle = app.getRequestHandler();

async function bootstrap() {
  await app.prepare();

  // Create a single HTTP server for both Next and Colyseus
  const httpServer = createServer((req, res) => {
    // Lightweight health check that bypasses Next.js
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
      return;
    }
    handle(req, res);
  });

  // Attach Colyseus using WebSocketTransport on the same httpServer
  const gameServer = new ColyseusServer({
    transport: new WebSocketTransport({ server: httpServer }),
  });

  gameServer
    .define("hotel-humboldt", HotelHumboldtRoom)
    .enableRealtimeListing();

  // Explicitly bind to 0.0.0.0 to ensure Docker/Railway accessibility
  httpServer.listen(port, "0.0.0.0", () => {
    const proto = dev ? "http" : "https";
    console.log(`🚀 Unified server running on ${proto}://0.0.0.0:${port}`);
    console.log(
      `📡 Colyseus WS on ${proto === "https" ? "wss" : "ws"}://0.0.0.0:${port}`
    );
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start unified server:", err);
  process.exit(1);
});
