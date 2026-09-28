/**
 * ES: HTTP interno para snapshot + SSE (solo con secreto). Usar 127.0.0.1 en dev.
 * EN: Internal HTTP for snapshot + SSE (secret required). Bind 127.0.0.1 in dev.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { matchMaker } from "colyseus";
import { executeSceneLibraryCommand, SceneLibraryError } from '@server/scene/sceneLibrary';
import { listUploadedSceneModels, registerUploadedSceneModel, readUploadedSceneModel } from '@server/scene/uploadedSceneModels';
import { MAX_SCENE_ASSET_BYTES } from '@server/scene/validateUploadedGlb';
import { listPublicWorlds, readPublicWorld, readWorldAccess, saveWorldAccess } from '@server/scene/publicWorlds';
import {
  broadcastGameMonitorStats,
  getGameMonitorLogs,
  pushGameMonitorLog,
  subscribeGameMonitorSse,
} from "@server/metrics/gameMonitor";
import { collectNexusWorldRoomInspectSnapshots } from "@server/metrics/nexusWorldRoomInspectRegistry";
import {
  applySceneDocumentToNexusWorldRoom,
  getSceneDocumentFromNexusWorldRoom,
  mergeSceneEntitiesToNexusWorldRoom,
} from "@server/metrics/nexusWorldRoomSceneAuthoringRegistry";

const MAX_SCENE_POST_BYTES = 512 * 1024;

async function readBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      req.resume();
      throw new Error("payload_too_large");
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}
async function readJsonBody(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  const raw = (await readBody(req, maxBytes)).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

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
    nexusWorldRooms: collectNexusWorldRoomInspectSnapshots(),
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

  if (url === `${PREFIX}/scene-assets` || url.startsWith(`${PREFIX}/scene-assets/`)) {
    try {
      if (url === `${PREFIX}/scene-assets` && req.method === 'GET') {
        sendJson(res, 200, { assets: await listUploadedSceneModels() });
      } else if (url === `${PREFIX}/scene-assets` && req.method === 'POST') {
        const name = new URL(req.url!, 'http://localhost').searchParams.get('name') || 'Modelo GLB';
        sendJson(res, 201, { asset: await registerUploadedSceneModel(await readBody(req, MAX_SCENE_ASSET_BYTES), name) });
      } else if (req.method === 'GET') {
        const bytes = await readUploadedSceneModel(url.slice(`${PREFIX}/scene-assets/`.length));
        if (!bytes) sendJson(res, 404, { error: 'asset_not_found' });
        else { res.writeHead(200, { 'Content-Type': 'model/gltf-binary', 'Content-Length': bytes.length, 'X-Content-Type-Options': 'nosniff' }); res.end(bytes); }
      } else sendJson(res, 405, { error: 'method_not_allowed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'asset_failed';
      sendJson(res, message === 'payload_too_large' ? 413 : 400, { error: message });
    }
    return true;
  }

  if (url === `${PREFIX}/world-access` || url === `${PREFIX}/public-worlds`) {
    try {
      const worldId = new URL(req.url!, 'http://localhost').searchParams.get('worldId');
      if (url.endsWith('/public-worlds') && req.method === 'GET') {
        sendJson(res, 200, { worlds: worldId ? [readPublicWorld(worldId)].filter(Boolean) : listPublicWorlds() });
      } else if (url.endsWith('/world-access') && req.method === 'GET' && worldId) {
        sendJson(res, 200, { world: readWorldAccess(worldId) });
      } else if (url.endsWith('/world-access') && req.method === 'POST') {
        sendJson(res, 200, { world: saveWorldAccess(await readJsonBody(req, 4096)) });
      } else sendJson(res, 405, { error: 'method_not_allowed' });
    } catch (error) { sendJson(res, 400, { error: error instanceof Error ? error.message : 'world_access_failed' }); }
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

  if (req.method === 'POST' && url === `${PREFIX}/scene-library-v1`) {
    try {
      const body = await readJsonBody(req, MAX_SCENE_POST_BYTES);
      sendJson(res, 200, { ok: true, state: executeSceneLibraryCommand(body) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'scene_library_failed';
      sendJson(res, error instanceof SceneLibraryError ? error.status : message === 'payload_too_large' ? 413 : 400,
        { ok: false, error: message });
    }
    return true;
  }

  if (req.method === "GET" && url === `${PREFIX}/scene-state-v0_1`) {
    try {
      const q = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      const roomId = new URLSearchParams(q).get("roomId") || undefined;
      const result = getSceneDocumentFromNexusWorldRoom(roomId);
      if (!result.ok) {
        sendJson(res, 400, { ok: false, error: result.error });
        return true;
      }
      sendJson(res, 200, {
        ok: true,
        roomId: result.roomId,
        document: result.document,
      });
    } catch (e) {
      sendJson(res, 500, {
        ok: false,
        error: e instanceof Error ? e.message : "scene_state_failed",
      });
    }
    return true;
  }

  if (req.method === "POST" && url === `${PREFIX}/scene-merge-entities-v0_1`) {
    try {
      const body = (await readJsonBody(req, MAX_SCENE_POST_BYTES)) as {
        roomId?: string;
        entities?: unknown[];
      };
      const result = mergeSceneEntitiesToNexusWorldRoom(body.roomId, body);
      if (!result.ok) {
        sendJson(res, 400, { ok: false, error: result.error });
        return true;
      }
      sendJson(res, 200, {
        ok: true,
        roomId: result.roomId,
        worldId: result.worldId,
        entityCount: result.entityCount,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "scene_merge_failed";
      const status = msg === "payload_too_large" ? 413 : 400;
      sendJson(res, status, { ok: false, error: msg });
    }
    return true;
  }

  if (req.method === "POST" && url === `${PREFIX}/scene-apply-v0_1`) {
    try {
      const body = (await readJsonBody(req, MAX_SCENE_POST_BYTES)) as {
        roomId?: string;
        document?: unknown;
      };
      const result = applySceneDocumentToNexusWorldRoom(body.roomId, body.document);
      if (!result.ok) {
        sendJson(res, 400, { ok: false, error: result.error });
        return true;
      }
      sendJson(res, 200, {
        ok: true,
        roomId: result.roomId,
        worldId: result.worldId,
        entityCount: result.entityCount,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "scene_apply_failed";
      const status = msg === "payload_too_large" ? 413 : 400;
      sendJson(res, status, { ok: false, error: msg });
    }
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
