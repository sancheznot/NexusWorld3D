"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SceneDocumentV0_1 } from "@nexusworld3d/content-schema";
import { parseSceneDocumentV0_1 } from "@nexusworld3d/content-schema";
import AdminSceneViewEditor from "@/components/admin/AdminSceneViewEditor";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminBtnSuccess,
  adminCard,
} from "@/components/admin/admin-ui";

const LIVE_POLL_MS = 5000;

type SceneFileRow = {
  filename: string;
  ok: boolean;
  document?: {
    schemaVersion: number;
    worldId: string;
    entities: Array<{
      id: string;
      parentId: string | null;
      transform: unknown;
      components: Array<{ type: string; props?: unknown }>;
    }>;
  };
  error?: string;
};

type ApiResponse = {
  directory: boolean;
  files: SceneFileRow[];
};

type LiveNexusWorld = {
  roomId: string;
  roomName: string;
  clientCount: number;
  players: Array<{
    sessionId: string;
    username: string;
    mapId: string;
    position: { x: number; y: number; z: number };
  }>;
  sceneAuthoringV0_1?: {
    schemaVersion: number;
    worldId: string;
    entityCount: number;
  } | null;
};

type MonitorSnapshot = {
  nexusWorldRooms?: LiveNexusWorld[];
};

function LiveNexusWorldBlock() {
  const [snap, setSnap] = useState<MonitorSnapshot | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadSnapshot = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/game-monitor/snapshot", {
        credentials: "include",
      });
      const j = (await res.json()) as {
        configured?: boolean;
        reachable?: boolean;
        data?: MonitorSnapshot;
      };
      if (res.status === 503 || !j.configured) {
        setHint(
          "Monitor no configurado — define NEXUS_GAME_MONITOR_SECRET (y URL si aplica). Misma pestaña «Monitor juego»."
        );
        return;
      }
      if (!res.ok || j.reachable === false) {
        setHint("No se pudo leer el snapshot del proceso Colyseus.");
        return;
      }
      setSnap((j.data as MonitorSnapshot) ?? {});
      setHint(null);
      setLastUpdated(Date.now());
    } catch {
      setHint("Error de red al cargar snapshot.");
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadSnapshot();
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, loadSnapshot]);

  const rooms = snap?.nexusWorldRooms ?? [];

  return (
    <div className={`${adminCard} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            NexusWorldRoom en vivo / Live room
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Datos del proceso Colyseus (registro interno). Sin editar escena JSON.
          </p>
          {lastUpdated !== null && !hint && (
            <p className="mt-1 font-mono text-[10px] text-slate-500">
              Última lectura / Last fetch: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={adminBtnSecondary} onClick={() => void loadSnapshot()}>
            Refrescar / Refresh
          </button>
          <button
            type="button"
            className={autoRefresh ? adminBtnSuccess : adminBtnSecondary}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? "Auto ON (5s)" : "Auto OFF"}
          </button>
          <Link
            href="/admin/panel?tab=monitor"
            className={`${adminBtnPrimary} no-underline`}
          >
            Monitor juego →
          </Link>
        </div>
      </div>
      {hint && <p className="mt-3 text-sm text-amber-200/90">{hint}</p>}
      {!hint && rooms.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">
          No hay instancias NexusWorldRoom registradas (o sala aún no creada).
        </p>
      )}
      {rooms.length > 0 && (
        <div className="mt-4 space-y-4">
          {rooms.map((nw) => (
            <div key={nw.roomId} className="overflow-x-auto rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="font-mono text-[11px] text-slate-500">
                {nw.roomName} · <span className="text-cyan-300/90">{nw.roomId}</span> ·
                clients={nw.clientCount} · players={nw.players.length}
              </p>
              <table className="mt-2 w-full min-w-[480px] text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase text-slate-500">
                    <th className="py-2 pr-2">sessionId</th>
                    <th className="py-2 pr-2">username</th>
                    <th className="py-2 pr-2">mapId</th>
                    <th className="py-2 pr-2">position</th>
                  </tr>
                </thead>
                <tbody>
                  {nw.players.map((p) => (
                    <tr key={p.sessionId} className="border-t border-white/5">
                      <td className="py-2 pr-2 font-mono text-[10px] text-slate-500">
                        {p.sessionId}
                      </td>
                      <td className="py-2 pr-2 text-slate-200">{p.username}</td>
                      <td className="py-2 pr-2 text-slate-400">{p.mapId}</td>
                      <td className="py-2 pr-2 font-mono text-cyan-200/80">
                        {p.position.x.toFixed(1)}, {p.position.y.toFixed(1)},{" "}
                        {p.position.z.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSceneInspectorPanel() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sceneView, setSceneView] = useState<{
    filename: string;
    doc: SceneDocumentV0_1;
  } | null>(null);
  const [sceneParseError, setSceneParseError] = useState<string | null>(null);

  const toggleSceneView = useCallback((row: SceneFileRow) => {
    if (!row.ok || !row.document) return;
    setSceneParseError(null);
    if (sceneView?.filename === row.filename) {
      setSceneView(null);
      return;
    }
    try {
      const doc = parseSceneDocumentV0_1(row.document);
      setSceneView({ filename: row.filename, doc });
    } catch {
      setSceneParseError(
        "No se pudo abrir el editor 3D: el JSON no cumple scene v0.1. / Failed to parse scene v0.1."
      );
    }
  }, [sceneView?.filename]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/scenes", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setLoadError(res.status === 401 ? "Unauthorized" : `HTTP ${res.status}`);
          return;
        }
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) {
          setData(json);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Fetch failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className={`${adminCard} mx-4 my-6 max-w-3xl p-6 sm:mx-6`}>
        <p className="text-red-300">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-4 my-8 flex justify-center text-slate-400 sm:mx-6">
        Cargando escenas… / Loading scenes…
      </div>
    );
  }

  const hasFiles = data.directory && data.files.length > 0;

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6">
      <LiveNexusWorldBlock />

      <div>
        <h2 className="text-lg font-bold text-white">Escenas v0.1 (archivo / on-disk)</h2>
        <p className="mt-1 text-sm text-slate-400">
          JSON en <code className="text-cyan-300/90">content/scenes/</code> validado con{" "}
          <code className="text-cyan-300/90">@nexusworld3d/content-schema</code>. Sin aplicar al
          mundo en vivo (Fase C).
        </p>
      </div>

      {!hasFiles && (
        <div className={`${adminCard} p-5`}>
          <p className="text-sm text-slate-400">
            No hay <code className="text-cyan-300">content/scenes/*.json</code>. Añade archivos y
            ejecuta <code className="text-cyan-300">npm run validate-scene</code> en CI.
          </p>
        </div>
      )}

      {sceneParseError && (
        <div className={`${adminCard} border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100`}>
          {sceneParseError}
        </div>
      )}

      {hasFiles && (
        <div className="grid gap-4">
          {data.files.map((row) => (
            <div key={row.filename} className="space-y-0">
              <div className={`${adminCard} overflow-hidden p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-cyan-300">{row.filename}</h3>
                  {row.ok && row.document ? (
                    <p className="mt-1 text-xs text-slate-400">
                      worldId=<span className="text-white">{row.document.worldId}</span> ·
                      entities={row.document.entities.length}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-red-300">{row.error}</p>
                  )}
                </div>
                {row.ok && row.document && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={adminBtnSecondary}
                      onClick={() => toggleSceneView(row)}
                    >
                      {sceneView?.filename === row.filename
                        ? "Ocultar vista 3D"
                        : "Vista 3D (beta)"}
                    </button>
                    <button
                      type="button"
                      className={adminBtnPrimary}
                      onClick={() =>
                        setExpanded((v) => (v === row.filename ? null : row.filename))
                      }
                    >
                      {expanded === row.filename ? "Ocultar JSON" : "Ver JSON"}
                    </button>
                  </div>
                )}
              </div>

              {row.ok && row.document && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="py-2 pr-3">Entity id</th>
                        <th className="py-2 pr-3">parentId</th>
                        <th className="py-2 pr-3">Components</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.document.entities.map((ent) => (
                        <tr key={ent.id} className="border-b border-white/5">
                          <td className="py-2 pr-3 font-mono text-cyan-200/90">{ent.id}</td>
                          <td className="py-2 pr-3 font-mono text-slate-400">
                            {ent.parentId === null ? "null" : ent.parentId}
                          </td>
                          <td className="py-2 pr-3">
                            {ent.components.map((c) => (
                              <span
                                key={`${ent.id}-${c.type}`}
                                className="mr-2 inline-block rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-200"
                              >
                                {c.type}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {expanded === row.filename && row.ok && row.document && (
                <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg bg-black/40 p-4 text-[11px] leading-relaxed text-slate-300">
                  {JSON.stringify(row.document, null, 2)}
                </pre>
              )}
              </div>
              {sceneView?.filename === row.filename && (
                <AdminSceneViewEditor
                  filename={row.filename}
                  initialDocument={sceneView.doc}
                  onClose={() => setSceneView(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
