"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { SceneDocumentV0_1, SceneEntityV0_1 } from "@nexusworld3d/content-schema";
import { parseSceneDocumentV0_1 } from "@nexusworld3d/content-schema";
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary, adminCard } from "@/components/admin/admin-ui";

type Props = {
  filename: string;
  initialDocument: SceneDocumentV0_1;
  onClose: () => void;
};

function cloneDoc(d: SceneDocumentV0_1): SceneDocumentV0_1 {
  return structuredClone(d);
}

function entityChildren(entities: SceneEntityV0_1[], parentId: string): SceneEntityV0_1[] {
  return entities.filter((e) => e.parentId === parentId);
}

function EntityBox({
  entity,
  selected,
  onSelect,
}: {
  entity: SceneEntityV0_1;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [x, y, z] = entity.transform.position;
  const q = useMemo(
    () => new THREE.Quaternion(...entity.transform.rotation),
    [entity.transform.rotation]
  );
  const [sx, sy, sz] = entity.transform.scale;

  return (
    <mesh
      position={[x, y, z]}
      quaternion={q}
      scale={[sx, sy, sz]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entity.id);
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={selected ? "#22d3ee" : "#475569"}
        metalness={0.2}
        roughness={0.75}
        transparent
        opacity={selected ? 0.95 : 0.65}
      />
    </mesh>
  );
}

function SceneContent({
  entities,
  selectedId,
  onSelect,
}: {
  entities: SceneEntityV0_1[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[12, 18, 8]} intensity={0.9} castShadow={false} />
      <Grid
        position={[0, 0, 0]}
        args={[48, 48]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#1e293b"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#0ea5e9"
        fadeDistance={48}
        fadeStrength={1}
      />
      {entities.map((ent) => (
        <EntityBox
          key={ent.id}
          entity={ent}
          selected={selectedId === ent.id}
          onSelect={onSelect}
        />
      ))}
      <OrbitControls makeDefault minDistance={2} maxDistance={80} />
    </>
  );
}

function HierarchyTree({
  entities,
  parentId,
  depth,
  selectedId,
  onSelect,
}: {
  entities: SceneEntityV0_1[];
  parentId: string | null;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes =
    parentId === null
      ? entities.filter((e) => e.parentId === null)
      : entityChildren(entities, parentId);

  return (
    <ul className={`space-y-0.5 ${depth > 0 ? "ml-3 border-l border-white/10 pl-2" : ""}`}>
      {nodes.map((ent) => (
        <li key={ent.id}>
          <button
            type="button"
            onClick={() => onSelect(ent.id)}
            className={`w-full rounded px-2 py-1 text-left font-mono text-[11px] transition ${
              selectedId === ent.id
                ? "bg-cyan-500/25 text-cyan-100"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {ent.id}
          </button>
          <HierarchyTree
            entities={entities}
            parentId={ent.id}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}

export default function AdminSceneViewEditor({ filename, initialDocument, onClose }: Props) {
  const [doc, setDoc] = useState(() => cloneDoc(initialDocument));
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDocument.entities[0]?.id ?? null
  );
  const [liveRoomIds, setLiveRoomIds] = useState<string[]>([]);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [applyBusy, setApplyBusy] = useState(false);
  const [pullBusy, setPullBusy] = useState(false);
  const [mergeBusy, setMergeBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/game-monitor/snapshot", {
          credentials: "include",
        });
        const j = (await res.json()) as {
          data?: {
            nexusWorldRooms?: Array<{
              roomId: string;
              sceneAuthoringV0_1?: {
                schemaVersion: number;
                worldId: string;
                entityCount: number;
              } | null;
            }>;
          };
        };
        if (cancelled || !res.ok || !j.data?.nexusWorldRooms) return;
        const ids = j.data.nexusWorldRooms.map((r) => r.roomId);
        setLiveRoomIds(ids);
        if (ids.length === 1) setTargetRoomId(ids[0]!);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDoc(cloneDoc(initialDocument));
    setSelectedId(initialDocument.entities[0]?.id ?? null);
  }, [initialDocument]);

  const selected = useMemo(
    () => doc.entities.find((e) => e.id === selectedId) ?? null,
    [doc.entities, selectedId]
  );

  const setPosition = useCallback((entityId: string, axis: 0 | 1 | 2, value: number) => {
    setDoc((prev) => ({
      ...prev,
      entities: prev.entities.map((e) => {
        if (e.id !== entityId) return e;
        const next = [...e.transform.position] as [number, number, number];
        next[axis] = value;
        return {
          ...e,
          transform: { ...e.transform, position: next },
        };
      }),
    }));
  }, []);

  const reset = useCallback(() => {
    setDoc(cloneDoc(initialDocument));
    setSelectedId(initialDocument.entities[0]?.id ?? null);
  }, [initialDocument]);

  const downloadDraft = useCallback(() => {
    const body = JSON.stringify(doc, null, 2);
    const blob = new Blob([body], { type: "application/json;charset=utf-8" });
    const base = filename.replace(/\.json$/i, "");
    const downloadName = `${base}.draft.json`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [doc, filename]);

  const applyLiveToRoom = useCallback(async () => {
    setApplyBusy(true);
    setApplyMsg(null);
    try {
      const res = await fetch("/api/admin/scene-authoring/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: targetRoomId.trim() || undefined,
          document: doc,
        }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        roomId?: string;
        worldId?: string;
        entityCount?: number;
        hint?: string;
        configured?: boolean;
      };
      if (!res.ok) {
        if (res.status === 503) {
          setApplyMsg(
            j.hint ||
              "Monitor no configurado (NEXUS_GAME_MONITOR_SECRET) o proceso Colyseus inaccesible."
          );
          return;
        }
        setApplyMsg(j.error || `HTTP ${res.status}`);
        return;
      }
      if (j.ok && j.roomId && j.worldId !== undefined && j.entityCount !== undefined) {
        setApplyMsg(
          `Aplicado / Applied: roomId=${j.roomId} worldId=${j.worldId} entities=${j.entityCount} — broadcast world:scene-applied-document-v0_1 a clientes.`
        );
        return;
      }
      setApplyMsg("Respuesta inesperada del servidor.");
    } catch {
      setApplyMsg("Error de red.");
    } finally {
      setApplyBusy(false);
    }
  }, [doc, targetRoomId]);

  const pullFromLiveRoom = useCallback(async () => {
    setPullBusy(true);
    setApplyMsg(null);
    try {
      const q = targetRoomId.trim()
        ? `?roomId=${encodeURIComponent(targetRoomId.trim())}`
        : "";
      const res = await fetch(`/api/admin/scene-authoring/state${q}`, {
        credentials: "include",
      });
      const j = (await res.json()) as {
        ok?: boolean;
        document?: unknown | null;
        error?: string;
        hint?: string;
        configured?: boolean;
      };
      if (!res.ok) {
        if (res.status === 503) {
          setApplyMsg(j.hint || "Monitor no configurado.");
          return;
        }
        setApplyMsg(j.error || `HTTP ${res.status}`);
        return;
      }
      if (!j.ok || j.document == null) {
        setApplyMsg(
          "Sin escena en memoria en la sala — aplica un documento completo primero (Push). / No in-room scene yet — full apply first."
        );
        return;
      }
      const parsed = parseSceneDocumentV0_1(j.document);
      setDoc(cloneDoc(parsed));
      setSelectedId(parsed.entities[0]?.id ?? null);
      setApplyMsg(
        `Editor ← sala (worldId=${parsed.worldId}, entities=${parsed.entities.length}).`
      );
    } catch {
      setApplyMsg("Error de red.");
    } finally {
      setPullBusy(false);
    }
  }, [targetRoomId]);

  const mergeSelectionToLiveRoom = useCallback(async () => {
    if (!selectedId) {
      setApplyMsg("Selecciona una entidad en Hierarchy. / Select an entity.");
      return;
    }
    const ent = doc.entities.find((e) => e.id === selectedId);
    if (!ent) return;
    setMergeBusy(true);
    setApplyMsg(null);
    try {
      const res = await fetch("/api/admin/scene-authoring/merge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: targetRoomId.trim() || undefined,
          entities: [ent],
        }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        roomId?: string;
        worldId?: string;
        entityCount?: number;
        hint?: string;
      };
      if (!res.ok) {
        if (res.status === 503) {
          setApplyMsg(j.hint || "Monitor no configurado.");
          return;
        }
        setApplyMsg(j.error || `HTTP ${res.status}`);
        return;
      }
      if (j.ok && j.roomId && j.worldId !== undefined && j.entityCount !== undefined) {
        setApplyMsg(
          `Fusionado / Merged: roomId=${j.roomId} entities=${j.entityCount} — mismo broadcast que apply.`
        );
        return;
      }
      setApplyMsg("Respuesta inesperada.");
    } catch {
      setApplyMsg("Error de red.");
    } finally {
      setMergeBusy(false);
    }
  }, [doc.entities, selectedId, targetRoomId]);

  return (
    <div className={`${adminCard} mt-4 overflow-hidden border-cyan-500/30`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/60 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">
            Vista escena v0 / Scene view v0
          </p>
          <p className="font-mono text-[11px] text-slate-500">{filename}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminBtnSecondary} onClick={reset}>
            Restablecer / Reset
          </button>
          <button type="button" className={adminBtnPrimary} onClick={downloadDraft}>
            Descargar borrador / Download draft
          </button>
          <button type="button" className={adminBtnDanger} onClick={onClose}>
            Cerrar / Close
          </button>
        </div>
      </div>

      <p className="border-b border-white/5 px-4 py-2 text-[11px] text-amber-200/90">
        Borrador solo en navegador — no guarda en disco del repo. Ejecuta{" "}
        <code className="text-cyan-200/90">npm run validate-scene</code> antes de commitear. /
        Browser draft — not saved to repo disk. Run validate-scene before commit.
      </p>

      <div className="border-b border-emerald-500/20 bg-emerald-950/15 px-4 py-3 text-xs text-slate-200">
        <p className="font-semibold text-emerald-200/95">
          Aplicar a sala Colyseus (memoria) / Apply to live room (in-memory)
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Requiere sesión admin + <code className="text-cyan-200/80">NEXUS_GAME_MONITOR_SECRET</code>{" "}
          y proceso de juego alcanzable. Los clientes conectados reciben el documento por{" "}
          <code className="text-cyan-200/80">world:scene-applied-document-v0_1</code>. Opcional: join
          con <code className="text-cyan-200/80">sceneAuthoringToken</code> ={" "}
          <code className="text-cyan-200/80">NEXUS_SCENE_AUTHORING_SECRET</code> para aplicar vía
          WebSocket: <code className="text-cyan-200/80">world:scene-apply-document-v0_1</code> · parche:{" "}
          <code className="text-cyan-200/80">world:scene-patch-entities-v0_1</code> (mismo broadcast al éxito).
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-[200px] flex-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">roomId</span>
            <input
              list="nexus-room-ids"
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
              placeholder={
                liveRoomIds.length === 1
                  ? liveRoomIds[0]
                  : "vacío = única sala / empty = single room"
              }
              className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-white"
            />
            <datalist id="nexus-room-ids">
              {liveRoomIds.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </label>
          <button
            type="button"
            disabled={applyBusy}
            className={adminBtnPrimary}
            onClick={() => void applyLiveToRoom()}
          >
            {applyBusy ? "…" : "Aplicar a Colyseus / Push to room"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pullBusy}
            className={adminBtnSecondary}
            onClick={() => void pullFromLiveRoom()}
          >
            {pullBusy ? "…" : "Leer de sala / Pull from room"}
          </button>
          <button
            type="button"
            disabled={mergeBusy || !selectedId}
            className={adminBtnSecondary}
            onClick={() => void mergeSelectionToLiveRoom()}
          >
            {mergeBusy ? "…" : "Fusionar selección / Merge selection"}
          </button>
        </div>
        {applyMsg && (
          <p className="mt-2 text-[11px] text-slate-300 whitespace-pre-wrap">{applyMsg}</p>
        )}
      </div>

      <div className="grid min-h-[440px] grid-cols-1 gap-0 lg:grid-cols-12">
        <aside className="border-b border-white/10 bg-slate-950/40 p-3 lg:col-span-3 lg:border-b-0 lg:border-r">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Hierarchy
          </p>
          {doc.entities.length === 0 ? (
            <p className="text-xs text-slate-500">Sin entidades / No entities</p>
          ) : (
            <HierarchyTree
              entities={doc.entities}
              parentId={null}
              depth={0}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </aside>

        <div className="relative min-h-[320px] bg-black lg:col-span-6">
          <Canvas
            camera={{ position: [10, 8, 10], fov: 50, near: 0.1, far: 200 }}
            onPointerMissed={() => setSelectedId(null)}
            gl={{ antialias: true, alpha: false }}
            className="h-full min-h-[320px] w-full touch-none"
          >
            <color attach="background" args={["#020617"]} />
            <Suspense fallback={null}>
              <SceneContent
                entities={doc.entities}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </Suspense>
          </Canvas>
          <p className="pointer-events-none absolute bottom-2 left-2 text-[10px] text-slate-500">
            Orbit · clic caja = selección / click box = select
          </p>
        </div>

        <aside className="border-t border-white/10 bg-slate-950/40 p-3 lg:col-span-3 lg:border-l lg:border-t-0">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Inspector
          </p>
          {!selected ? (
            <p className="text-xs text-slate-500">Selecciona una entidad / Select an entity</p>
          ) : (
            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-500">id</span>
                <p className="break-all font-mono text-cyan-200/90">{selected.id}</p>
              </div>
              <div>
                <span className="text-slate-500">parentId</span>
                <p className="font-mono text-slate-400">
                  {selected.parentId === null ? "null" : selected.parentId}
                </p>
              </div>
              <div>
                <span className="text-slate-500">position (editable)</span>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(["X", "Y", "Z"] as const).map((label, axis) => (
                    <label key={label} className="block">
                      <span className="text-[10px] text-slate-500">{label}</span>
                      <input
                        type="number"
                        step="0.1"
                        value={selected.transform.position[axis]}
                        onChange={(e) => {
                          const v = e.target.valueAsNumber;
                          if (!Number.isFinite(v)) return;
                          setPosition(selected.id, axis as 0 | 1 | 2, v);
                        }}
                        className="mt-0.5 w-full rounded border border-white/10 bg-slate-900 px-2 py-1 font-mono text-[11px] text-white"
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-500">rotation (quat)</span>
                <pre className="mt-1 max-h-24 overflow-auto rounded bg-black/40 p-2 font-mono text-[10px] text-slate-400">
                  {JSON.stringify(selected.transform.rotation)}
                </pre>
              </div>
              <div>
                <span className="text-slate-500">scale</span>
                <pre className="mt-1 max-h-20 overflow-auto rounded bg-black/40 p-2 font-mono text-[10px] text-slate-400">
                  {JSON.stringify(selected.transform.scale)}
                </pre>
              </div>
              <div>
                <span className="text-slate-500">components</span>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-slate-300">
                  {JSON.stringify(selected.components, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
