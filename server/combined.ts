import "@server/env-bootstrap";
import "@server/bootstrap/gameResourceNodes";
import "@server/bootstrap/gameItemEffects";
import "@server/bootstrap/gameWorldTools";
import { createServer } from "http";
import next from "next";
import { Server as ColyseusServer } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { loadContentManifestOrThrow } from "@server/content/loadContentManifest";
import { registerNexusWorldRooms } from "@server/colyseus/registerRooms";
import { printUnifiedServerBanner } from "@server/banners/nexusColyseusBanner";
import { runPendingMigrations } from "@/lib/db/runMigrations";
import { tryHandleGameMonitorRequest } from "@server/metrics/gameMonitorHttp";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000; // Single public port

// Prepare Next.js
const app = next({ dev });
const handle = app.getRequestHandler();

async function bootstrap() {
  const m = await runPendingMigrations({ quiet: false });
  if (!m.ok) {
    console.error("❌ migrations failed:", m.error);
    process.exit(1);
  }

  await app.prepare();

  loadContentManifestOrThrow();

  // Create a single HTTP server for both Next and Colyseus
  const httpServer = createServer((req, res) => {
    void tryHandleGameMonitorRequest(req, res).then((handled) => {
      if (handled) return;
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
        return;
      }
      handle(req, res);
    });
  });

  // Attach Colyseus using WebSocketTransport on the same httpServer
  const gameServer = new ColyseusServer({
    transport: new WebSocketTransport({ server: httpServer }),
  });

  registerNexusWorldRooms(gameServer);

  // Explicitly bind to 0.0.0.0 to ensure Docker/Railway accessibility
  httpServer.listen(port, "0.0.0.0", () => {
    printUnifiedServerBanner({ port, dev });
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start unified server:", err);
  process.exit(1);
});
