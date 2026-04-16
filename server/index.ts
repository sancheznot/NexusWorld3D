import "@server/env-bootstrap";
import "@server/bootstrap/gameResourceNodes";
import "@server/bootstrap/gameItemEffects";
import "@server/bootstrap/gameWorldTools";
import { Server } from "colyseus";
import { loadContentManifestOrThrow } from "@server/content/loadContentManifest";
import { registerNexusWorldRooms } from "@server/colyseus/registerRooms";
import { printGameServerDevBanner } from "@server/banners/nexusColyseusBanner";
import { runPendingMigrations } from "@/lib/db/runMigrations";
import { startDedicatedGameMonitorServer } from "@server/metrics/gameMonitorHttp";
import "@server/persistence/gameRedis";
import { describeRedisBackend } from "@server/persistence/redisClient";

// ES: Puerto del servidor Colyseus (dev). No uses PORT aquí si Next corre en el mismo .env — usa COLYSEUS_PORT o SOCKET_PORT.
// EN: Colyseus listen port (dev). Avoid PORT here when Next shares .env — use COLYSEUS_PORT or SOCKET_PORT.
const PORT: number =
  Number(process.env.COLYSEUS_PORT || process.env.SOCKET_PORT) || 3001;
const CLIENT_URL =
  process.env.CLIENT_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

loadContentManifestOrThrow();

const gameServer = new Server({ greet: false });

registerNexusWorldRooms(gameServer);

void (async () => {
  try {
    const m = await runPendingMigrations({ quiet: false });
    if (!m.ok) {
      console.error("❌ migrations failed:", m.error);
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ migrations threw (unexpected):", e);
    process.exit(1);
  }

  try {
    await gameServer.listen(PORT);
    const monPort = Number(process.env.NEXUS_GAME_MONITOR_PORT || 3020);
    startDedicatedGameMonitorServer(monPort);
    printGameServerDevBanner({ port: PORT, clientUrl: CLIENT_URL });
    console.log(`🗄️  ${describeRedisBackend()}\n`);
  } catch (e) {
    console.error("❌ Colyseus listen failed (WebSocket port " + PORT + "):", e);
    process.exit(1);
  }
})();

let colyseusShuttingDown = false;
function shutdownColyseus(): void {
  if (colyseusShuttingDown) return;
  colyseusShuttingDown = true;
  console.log("🛑 Shutting down Colyseus…");
  try {
    void gameServer.gracefullyShutdown();
  } catch {
    /* ignore duplicate shutdown */
  }
}

process.on("SIGINT", () => shutdownColyseus());
process.on("SIGTERM", () => shutdownColyseus());

export { gameServer };
