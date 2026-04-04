/**
 * ES: Logs en anillo + suscriptores SSE para el monitor del juego (proceso Colyseus).
 * EN: Ring-buffer logs + SSE subscribers for game monitor (Colyseus process).
 */

export type GameMonitorLogLevel = "info" | "warn" | "error" | "debug";

export type GameMonitorLogEntry = {
  id: number;
  ts: number;
  level: GameMonitorLogLevel;
  source: string;
  message: string;
  meta?: Record<string, unknown>;
};

const MAX_LOGS = 500;
const logs: GameMonitorLogEntry[] = [];
let seq = 0;

type SseClient = { write: (chunk: string) => void; end: () => void };

const sseClients = new Set<SseClient>();

function trimLogs() {
  while (logs.length > MAX_LOGS) logs.shift();
}

export function pushGameMonitorLog(
  level: GameMonitorLogLevel,
  source: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  seq += 1;
  const entry: GameMonitorLogEntry = {
    id: seq,
    ts: Date.now(),
    level,
    source,
    message,
    meta,
  };
  logs.push(entry);
  trimLogs();

  const payload = JSON.stringify({ type: "log", entry });
  const line = `data: ${payload}\n\n`;
  for (const c of sseClients) {
    try {
      c.write(line);
    } catch {
      sseClients.delete(c);
    }
  }
}

export function getGameMonitorLogs(): GameMonitorLogEntry[] {
  return [...logs];
}

export function subscribeGameMonitorSse(write: (s: string) => void): () => void {
  const client: SseClient = {
    write,
    end: () => sseClients.delete(client),
  };
  sseClients.add(client);
  return () => {
    sseClients.delete(client);
  };
}

export function broadcastGameMonitorStats(payload: unknown): void {
  const line = `data: ${JSON.stringify({ type: "stats", payload })}\n\n`;
  for (const c of sseClients) {
    try {
      c.write(line);
    } catch {
      sseClients.delete(c);
    }
  }
}
