"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminBtnSuccess,
  adminCard,
  adminTableWrap,
} from "@/components/admin/admin-ui";

type SnapshotPayload = {
  ts?: number;
  processId?: string;
  stats?: { roomCount?: number; ccu?: number };
  rooms?: Array<{
    roomId: string;
    name: string;
    clients: number;
    maxClients: number;
    locked?: boolean;
  }>;
  logs?: Array<{
    id: number;
    ts: number;
    level: string;
    source: string;
    message: string;
    meta?: Record<string, unknown>;
  }>;
};

export default function GameServerMonitorPanel() {
  const [status, setStatus] = useState<string>("loading");
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(null);
  const [live, setLive] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const loadOnce = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/game-monitor/snapshot", {
        credentials: "include",
      });
      const j = await res.json();
      if (res.status === 503) {
        setStatus("not_configured");
        setSnapshot(null);
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      if (j.reachable === false) {
        setStatus("unreachable");
        setSnapshot(null);
        return;
      }
      setStatus("ok");
      setSnapshot((j.data as SnapshotPayload) ?? null);
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadOnce();
  }, [loadOnce]);

  useEffect(() => {
    if (live) {
      const es = new EventSource("/api/admin/game-monitor/stream");
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            type?: string;
            data?: SnapshotPayload;
          };
          if (msg.type === "snapshot" && msg.data) {
            setSnapshot(msg.data);
            setStatus("ok");
          }
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        setLive(false);
        es.close();
      };
      return () => {
        es.close();
        esRef.current = null;
      };
    }
    esRef.current?.close();
    esRef.current = null;
    return undefined;
  }, [live]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [snapshot?.logs]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">
            Monitor del servidor de juego
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            CCU, salas Colyseus y logs recientes · Exportable para scripts (JSON /
            NDJSON)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadOnce()}
            className={adminBtnSecondary}
          >
            Refrescar
          </button>
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className={live ? adminBtnSuccess : adminBtnSecondary}
          >
            {live ? "Tiempo real ON" : "Tiempo real OFF"}
          </button>
          <a
            href="/api/admin/game-monitor/export?format=json"
            className={`${adminBtnPrimary} no-underline`}
          >
            Export JSON
          </a>
          <a
            href="/api/admin/game-monitor/export?format=ndjson"
            className={`${adminBtnSecondary} no-underline border-violet-500/25 hover:border-violet-400/40`}
          >
            Export NDJSON
          </a>
        </div>
      </div>

      {status === "not_configured" && (
        <div className={`${adminCard} border-amber-500/30 bg-amber-950/25 px-4 py-3 text-sm text-amber-100`}>
          Define <code className="text-amber-200">NEXUS_GAME_MONITOR_SECRET</code>{" "}
          en el entorno (mismo valor en Next y en el proceso Colyseus). En{" "}
          <code className="text-amber-200">npm run dev</code> el monitor suele estar
          en <code className="text-amber-200">127.0.0.1:3020</code>; ajusta{" "}
          <code className="text-amber-200">NEXUS_GAME_MONITOR_URL</code> si hace
          falta. Con <code className="text-amber-200">npm start</code> (unificado)
          usa la misma URL base que el servidor web.
        </div>
      )}

      {status === "unreachable" && (
        <div className={`${adminCard} border-red-500/35 bg-red-950/25 px-4 py-3 text-sm text-red-100`}>
          No se pudo contactar al monitor interno. ¿Está corriendo Colyseus? ¿Coincide{" "}
          <code className="text-red-200">NEXUS_GAME_MONITOR_SECRET</code> y la URL?
        </div>
      )}

      {status === "error" && (
        <div className="text-sm text-red-400">Error al cargar el snapshot.</div>
      )}

      {snapshot && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={`${adminCard} p-4`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                CCU (Colyseus)
              </p>
              <p className="font-mono text-3xl text-cyan-300">
                {snapshot.stats?.ccu ?? "—"}
              </p>
            </div>
            <div className={`${adminCard} p-4`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Salas activas
              </p>
              <p className="font-mono text-3xl text-violet-300">
                {snapshot.stats?.roomCount ?? "—"}
              </p>
            </div>
            <div className={`${adminCard} p-4`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Process ID
              </p>
              <p className="break-all font-mono text-sm text-slate-300">
                {snapshot.processId ?? "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ts:{" "}
                {snapshot.ts
                  ? new Date(snapshot.ts).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-white">Salas</h3>
            <div className={adminTableWrap}>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">roomId</th>
                    <th className="p-3">Clientes</th>
                    <th className="p-3">Máx</th>
                    <th className="p-3">Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {(snapshot.rooms ?? []).map((r) => (
                    <tr
                      key={r.roomId}
                      className="border-t border-white/5 bg-slate-950/30"
                    >
                      <td className="p-3 font-medium text-slate-200">{r.name}</td>
                      <td className="p-3 font-mono text-xs text-slate-500">
                        {r.roomId}
                      </td>
                      <td className="p-3 text-slate-300">{r.clients}</td>
                      <td className="p-3 text-slate-300">{r.maxClients}</td>
                      <td className="p-3 text-slate-400">{r.locked ? "sí" : "no"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(snapshot.rooms ?? []).length === 0 && (
                <p className="p-4 text-sm text-slate-500">Sin salas en caché.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              Logs (monitor)
            </h3>
            <div
              className={`${adminCard} h-64 space-y-1 overflow-y-auto p-3 font-mono text-xs`}
            >
              {(snapshot.logs ?? []).map((l) => (
                <div key={l.id} className="text-slate-300">
                  <span className="text-slate-600">
                    {new Date(l.ts).toLocaleTimeString()}
                  </span>{" "}
                  <span
                    className={
                      l.level === "error"
                        ? "text-red-400"
                        : l.level === "warn"
                          ? "text-amber-400"
                          : "text-cyan-400"
                    }
                  >
                    [{l.level}]
                  </span>{" "}
                  <span className="text-slate-500">{l.source}</span> {l.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </>
      )}

      <div className="space-y-1 border-t border-white/10 pt-4 text-xs text-slate-500">
        <p>
          <strong className="text-slate-400">Scripts (servidor):</strong>{" "}
          <code className="text-slate-400">
            curl -H &quot;Authorization: Bearer $NEXUS_GAME_MONITOR_SECRET&quot;{" "}
            http://127.0.0.1:3020/__nexus-internal/v1/snapshot
          </code>
        </p>
        <p>
          NDJSON:{" "}
          <code className="text-slate-400">
            …/__nexus-internal/v1/export.ndjson?token=SECRET
          </code>
        </p>
      </div>
    </div>
  );
}
