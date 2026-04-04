import "@server/env-bootstrap";
import { Server } from "colyseus";
import { registerNexusWorldRooms } from "@server/colyseus/registerRooms";
import { printGameServerDevBanner } from "@server/banners/nexusColyseusBanner";
import { runPendingMigrations } from "@/lib/db/runMigrations";
import { startDedicatedGameMonitorServer } from "@server/metrics/gameMonitorHttp";
import "@/lib/services/redis";

// ES: Puerto del servidor Colyseus (dev). No uses PORT aquí si Next corre en el mismo .env — usa COLYSEUS_PORT o SOCKET_PORT.
// EN: Colyseus listen port (dev). Avoid PORT here when Next shares .env — use COLYSEUS_PORT or SOCKET_PORT.
const PORT: number =
  Number(process.env.COLYSEUS_PORT || process.env.SOCKET_PORT) || 3001;
const CLIENT_URL =
  process.env.CLIENT_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const gameServer = new Server({ greet: false });

registerNexusWorldRooms(gameServer);

void (async () => {
  try {
    const m = await runPendingMigrations({ quiet: false });
    if (!m.ok) {
      console.error("❌ migrations failed:", m.error);
      process.exit(1);
    }
    await gameServer.listen(PORT);
    const monPort = Number(process.env.NEXUS_GAME_MONITOR_PORT || 3020);
    startDedicatedGameMonitorServer(monPort);
    printGameServerDevBanner({ port: PORT, clientUrl: CLIENT_URL });
    const redisNote = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
      ? "Upstash Redis (REST)"
      : "Mock Redis (in-memory)";
    console.log(`🗄️  ${redisNote}\n`);
  } catch (e) {
    console.error("❌ Colyseus listen failed:", e);
    process.exit(1);
  }
})();

process.on("SIGINT", () => {
  console.log("🛑 Shutting down Colyseus…");
  gameServer.gracefullyShutdown();
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down Colyseus…");
  gameServer.gracefullyShutdown();
});

export { gameServer };
