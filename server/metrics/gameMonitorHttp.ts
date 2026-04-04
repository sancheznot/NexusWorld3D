/**
 * ES: HTTP interno para snapshot + SSE (solo con secreto). Usar 127.0.0.1 en dev.
 * EN: Internal HTTP for snapshot + SSE (secret required). Bind 127.0.0.1 in dev.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { matchMaker } from "colyseus";
import {
  broadcastGameMonitorStats,
  getGameMonitorLogs,
  pushGameMonitorLog,
  subscribeGameMonitorSse,
} from "@server/metrics/gameMonitor";

const PREFIX = "/__nexus-internal/v1";

function getSecret(): string {
  return process.env.NEXUS_GAME_MONITOR_SECRET?.trim() || "";
}

function queryToken(req: IncomingMessage): string | null {
  const u = req.url || "";
  const i = u.indexOf("?");
  if (i < 0) return null;
  return new URLSearchParams(u.slice(i + 1)).get("token");
}

function isAuthorized(req: IncomingMessage): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    return auth.slice(7) === secret;
  }
  return queryToken(req) === secret;
}

async function buildSnapshot(): Promise<Record<string, unknown>> {
  let rooms: unknown[] = [];
  try {
    const list = await matchMaker.query({});
    rooms = list.map((r) => ({
      roomId: r.roomId,
      name: r.name,
      clients: r.clients,
      maxClients: r.maxClients,
      locked: r.locked,
      private: r.private,
      processId: r.processId,
    }));
  } catch (e) {
    pushGameMonitorLog(
      "warn",
      "monitor",
      "matchMaker.query failed",
      e instanceof Error ? { error: e.message } : {}
    );
  }

  const st = matchMaker.stats;
  const local = st?.local ?? { roomCount: 0, ccu: 0 };

  return {
    ts: Date.now(),
    processId: matchMaker.processId,
    stats: {
      roomCount: local.roomCount,
      ccu: local.ccu,
    },
    rooms,
    logs: getGameMonitorLogs(),
  };
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function handleStream(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(":ok\n\n");

  const unsub = subscribeGameMonitorSse((chunk) => {
    try {
      res.write(chunk);
    } catch {
      unsub();
    }
  });

  const tick = setInterval(() => {
    void (async () => {
      try {
        const snap = await buildSnapshot();
        broadcastGameMonitorStats({
          stats: snap.stats,
          rooms: snap.rooms,
          ts: snap.ts,
        });
      } catch {
        /* ignore */
      }
    })();
  }, 3000);

  req.on("close", () => {
    clearInterval(tick);
    unsub();
    try {
      res.end();
    } catch {
      /* ignore */
    }
  });
}

/**
 * ES: Si maneja la petición, responde y devuelve true.
 * EN: If handled, responds and returns true.
 */
export async function tryHandleGameMonitorRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  if (!getSecret()) return false;

  const url = req.url?.split("?")[0] || "";
  if (!url.startsWith(PREFIX)) return false;

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return true;
  }

  if (req.method === "GET" && url === `${PREFIX}/snapshot`) {
    try {
      const body = await buildSnapshot();
      sendJson(res, 200, body);
    } catch (e) {
      sendJson(res, 500, {
        error: e instanceof Error ? e.message : "snapshot_failed",
      });
    }
    return true;
  }

  if (req.method === "GET" && url === `${PREFIX}/stream`) {
    handleStream(req, res);
    return true;
  }

  if (req.method === "GET" && url === `${PREFIX}/export.ndjson`) {
    try {
      const snap = await buildSnapshot();
      res.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.write(JSON.stringify({ kind: "snapshot", ...snap }) + "\n");
      for (const line of getGameMonitorLogs()) {
        res.write(JSON.stringify({ kind: "log", ...line }) + "\n");
      }
      res.end();
    } catch (e) {
      sendJson(res, 500, {
        error: e instanceof Error ? e.message : "export_failed",
      });
    }
    return true;
  }

  sendJson(res, 404, { error: "Not found" });
  return true;
}

/**
 * ES: Servidor dedicado (dev: Next y Colyseus en procesos distintos).
 * EN: Dedicated server (dev: Next and Colyseus separate processes).
 */
export function startDedicatedGameMonitorServer(port: number): void {
  if (!getSecret()) {
    console.warn(
      "⚠️  NEXUS_GAME_MONITOR_SECRET unset — internal game monitor HTTP disabled."
    );
    return;
  }

  const srv = createServer((req, res) => {
    void tryHandleGameMonitorRequest(req, res).then((handled) => {
      if (!handled) {
        res.writeHead(404);
        res.end();
      }
    });
  });
  srv.listen(port, "127.0.0.1", () => {
    pushGameMonitorLog(
      "info",
      "monitor",
      `Dedicated monitor listening on 127.0.0.1:${port}`,
      { prefix: PREFIX }
    );
    console.log(
      `📡 Game monitor: http://127.0.0.1:${port}${PREFIX}/snapshot (Bearer secret)`
    );
  });
}
