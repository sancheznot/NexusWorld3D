"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { SceneDocumentV0_1, SceneEntityV0_1 } from "@nexusworld3d/content-schema";
import { parseSceneDocumentV0_1, getSceneBoxProps, getSceneModelProps, isSceneGroup, resolveSceneWorldEntities } from "@nexusworld3d/content-schema";
import SceneModelVisual from '../world/SceneModelVisual';
import SceneModelInspector from './SceneModelInspector';
import { sceneModelAssets } from '@/lib/assets/sceneModelAssets';
import { useSceneModelCatalog } from '@/hooks/useSceneModelCatalog';
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary, adminCard } from "@/components/admin/admin-ui";
import AdminScenePublicationPanel from './AdminScenePublicationPanel';
import dynamic from 'next/dynamic';
import { useSceneEditorHistory } from '@/hooks/useSceneEditorHistory';
import { sceneRotationDegrees, sceneRotationQuaternion, updateSceneTransform } from '@/lib/sceneEditorTransforms';
import SceneNumberInput from './SceneNumberInput';
import { createSceneGroup, duplicateSceneSubtree, removeSceneSubtree, reparentSceneEntity, sceneSubtreeIds } from '@/lib/sceneEditorHierarchy';

const AdminScenePlayPreview = dynamic(() => import('./AdminScenePlayPreview'), { ssr: false });

type Props = {
  filename: string;
  initialDocument: SceneDocumentV0_1;
  onClose: () => void;
};

function cloneDoc(d: SceneDocumentV0_1): SceneDocumentV0_1 {
  return structuredClone(d);
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
    () => new THREE.Quaternion(...entity.transform.rotation).normalize(),
    [entity.transform.rotation]
  );
  const [sx, sy, sz] = entity.transform.scale;
  const box = getSceneBoxProps(entity);

  if (getSceneModelProps(entity)) return <SceneModelVisual entity={entity} showColliders={selected} onSelect={onSelect} />;

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
      <boxGeometry args={box?.size ?? [1, 1, 1]} />
      <meshStandardMaterial
        wireframe={isSceneGroup(entity)}
        color={selected ? "#22d3ee" : box?.color ?? "#475569"}
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
  spawn,
  selectedId,
  onSelect,
}: {
  entities: SceneEntityV0_1[];
  spawn: SceneDocumentV0_1['spawn'];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const worldEntities = useMemo(() => resolveSceneWorldEntities(entities), [entities]);
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
      {worldEntities.map((ent) => (
        <EntityBox
          key={ent.id}
          entity={ent}
          selected={selectedId === ent.id}
          onSelect={onSelect}
        />
      ))}
      {spawn ? <group position={spawn.position} rotation={[0, spawn.yaw, 0]}>
        <mesh><capsuleGeometry args={[0.5, 1, 4, 8]} /><meshBasicMaterial color="#34d399" wireframe /></mesh>
        <arrowHelper args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 2, '#34d399']} />
      </group> : null}
      <OrbitControls makeDefault minDistance={2} maxDistance={80} />
    </>
  );
}

function HierarchyTree({
  childrenByParent,
  parentId,
  depth,
  selectedId,
  onSelect,
}: {
  childrenByParent: Map<string | null, SceneEntityV0_1[]>;
  parentId: string | null;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes = childrenByParent.get(parentId) ?? [];

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
            {isSceneGroup(ent) ? '▧ ' : ''}{ent.id}
          </button>
          <HierarchyTree
            childrenByParent={childrenByParent}
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
  const { doc, setDoc, selectedId, setSelectedId, replace, undo, redo, canUndo, canRedo } = useSceneEditorHistory(initialDocument);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [modelAssetId, setModelAssetId] = useState(sceneModelAssets[0]?.id ?? '');
  const modelCatalog = useSceneModelCatalog();
  const [liveRoomIds, setLiveRoomIds] = useState<string[]>([]);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [applyMsg, setApplyMsg] = useState<string | null>(null);
  const [applyBusy, setApplyBusy] = useState(false);
  const [pullBusy, setPullBusy] = useState(false);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [playing, setPlaying] = useState<SceneDocumentV0_1 | null>(null);

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
    replace(initialDocument);
    setTransformError(null);
  }, [initialDocument, replace]);

  const selected = useMemo(
    () => doc.entities.find((e) => e.id === selectedId) ?? null,
    [doc.entities, selectedId]
  );
  const selectedBox = selected ? getSceneBoxProps(selected) : null;
  const selectedModel = selected ? getSceneModelProps(selected) : null;
  const selectedGroup = selected ? isSceneGroup(selected) : false;
  const selectedGeometry = selectedBox || selectedModel || selectedGroup;
  const selectedSubtree = useMemo(() => selectedId ? sceneSubtreeIds(doc, selectedId) : new Set<string>(), [doc, selectedId]);
  const childrenByParent = useMemo(() => {
    const index = new Map<string | null, SceneEntityV0_1[]>();
    for (const entity of doc.entities) {
      const children = index.get(entity.parentId) ?? [];
      children.push(entity); index.set(entity.parentId, children);
    }
    return index;
  }, [doc.entities]);
  const selectedDegrees = selected ? sceneRotationDegrees(selected.transform.rotation) : [0, 0, 0];
  const setTransform = (patch: Partial<SceneEntityV0_1['transform']>) => {
    if (!selected) return;
    try {
      setDoc(updateSceneTransform(doc, selected.id, patch));
      setTransformError(null);
    } catch { setTransformError('Transformación inválida: revisa los límites de posición, escala y tamaño final.'); }
  };
  const updateBox = (props: Record<string, unknown>) => {
    try {
    setDoc(parseSceneDocumentV0_1({ ...doc, entities: doc.entities.map(entity =>
      entity.id !== selectedId ? entity : { ...entity, components: entity.components.map(component =>
        component.type !== 'nexus:box' ? component : { ...component, props: { ...component.props, ...props } }) }) }));
    setTransformError(null);
    } catch { setTransformError('Dimensiones inválidas: revisa también la escala de los grupos padres.'); }
  };

  const reset = useCallback(() => {
    setDoc(cloneDoc(initialDocument));
    setSelectedId(initialDocument.entities[0]?.id ?? null);
  }, [initialDocument, setDoc, setSelectedId]);

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
  }, [targetRoomId, setDoc, setSelectedId]);

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
    <div tabIndex={0} aria-label="Editor de escena" className={`${adminCard} mt-4 overflow-hidden border-cyan-500/30`} onKeyDown={event => {
      if (playing || event.altKey || !(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (key === 'y') { event.preventDefault(); redo(); }
    }}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-950/60 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">
            Vista escena v0 / Scene view v0
          </p>
          <p className="font-mono text-[11px] text-slate-500">{filename}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminBtnSecondary} onClick={() => {
            const id = `group-${crypto.randomUUID()}`;
            setDoc(createSceneGroup(doc, id)); setSelectedId(id);
          }}>Crear grupo</button>
          <select aria-label="Modelo a añadir" value={modelAssetId} onChange={event => setModelAssetId(event.target.value)} className="max-w-52 rounded border border-white/10 bg-slate-900 px-2 text-xs text-white">
            {modelCatalog.assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
          </select>
          <button type="button" disabled={!modelAssetId} className={adminBtnSecondary} onClick={() => {
            const asset = modelCatalog.assets.find(asset => asset.id === modelAssetId);
            if (!asset) return;
            const id = `model-${crypto.randomUUID()}`;
            setDoc(current => ({ ...current, entities: [...current.entities, { id, parentId: null,
              transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
              components: [{ type: 'nexus:model', props: { assetId: asset.id, mapId: 'exterior', colliders: structuredClone(asset.colliders) } }],
            }] }));
            setSelectedId(id);
          }}>Añadir modelo</button>
          <button type="button" disabled={!canUndo} className={adminBtnSecondary} onClick={undo} title="Ctrl/Cmd+Z fuera de campos de texto">Deshacer</button>
          <button type="button" disabled={!canRedo} className={adminBtnSecondary} onClick={redo} title="Ctrl/Cmd+Shift+Z o Ctrl+Y">Rehacer</button>
          <button type="button" className={adminBtnPrimary} onClick={() => {
            try { setPlaying(parseSceneDocumentV0_1(cloneDoc(doc))); }
            catch { setApplyMsg('No se puede iniciar Play: revisa los valores de la escena.'); }
          }}>Play local</button>
          <button type="button" className={adminBtnSecondary} onClick={() => {
            const id = `box-${crypto.randomUUID()}`;
            setDoc(current => ({ ...current, entities: [...current.entities, {
              id, parentId: null,
              transform: { position: [3, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
              components: [{ type: 'nexus:box', props: { size: [2, 2, 2], color: '#a78bfa', solid: true, mapId: 'exterior' } }],
            }] }));
            setSelectedId(id);
          }}>
            Añadir caja sólida
          </button>
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

      <p className="px-4 py-2 text-[11px] text-slate-400">Historial local: hasta 50 cambios. Deshacer no revierte publicaciones ni salas activas. Confirma campos numéricos con Enter o al salir del campo.</p>

      <section aria-label="Subir modelo" aria-busy={modelCatalog.busy} className="border-y border-cyan-500/20 bg-cyan-950/10 px-4 py-3 text-xs text-slate-300">
        <label className="block font-semibold text-cyan-200">Subir y registrar GLB permanente
          <input type="file" accept=".glb,model/gltf-binary" disabled={modelCatalog.busy} className="mt-2 block w-full text-xs file:mr-3 file:rounded file:border-0 file:bg-cyan-900 file:px-3 file:py-2 file:text-cyan-100"
            onChange={event => {
              const file = event.target.files?.[0]; event.target.value = '';
              if (file) void modelCatalog.upload(file).then(asset => { if (asset) setModelAssetId(asset.id); });
            }} />
        </label>
        <p className="mt-2 text-slate-400">Archivos públicos al subir: no incluyas contenido privado. Máximo 16 MiB, GLB 2.0 estático con texturas PNG/JPEG embebidas, sin extensiones, animaciones ni archivos externos. Después pulsa «Añadir modelo» y configura sus colliders; inicialmente es atravesable.</p>
        <button type="button" className={`${adminBtnSecondary} mt-2`} disabled={modelCatalog.busy} onClick={() => void modelCatalog.refresh()}>Actualizar catálogo</button>
        <p role="status" className="mt-1 text-cyan-200">{modelCatalog.busy ? 'Procesando catálogo/modelo…' : modelCatalog.message}</p>
        {modelCatalog.error ? <p role="alert" className="mt-2 text-amber-200">{modelCatalog.error}</p> : null}
      </section>

      <section aria-label="Punto de aparición" className="border-y border-emerald-500/20 bg-emerald-950/10 px-4 py-3 text-xs text-slate-300">
        <label className="font-semibold text-emerald-200"><input type="checkbox" checked={Boolean(doc.spawn)} onChange={event => {
          if (event.target.checked) setDoc(current => ({ ...current, spawn: { mapId: 'exterior', position: [0, 2, 6], yaw: 0 } }));
          else setDoc(current => { const next = { ...current }; delete next.spawn; return next; });
        }} /> Spawn de escena · exterior</label>
        <p className="my-2 text-slate-400">Para jugadores nuevos y Play local. Las cuentas con posición guardada la conservan. La altura indica el centro del jugador; evita colocar el marcador dentro de cajas.</p>
        {doc.spawn ? <div className="grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
          {(['X', 'Y', 'Z'] as const).map((label, axis) => <SceneNumberInput key={`spawn-${axis}`} label={label}
            value={doc.spawn!.position[axis]} min={axis === 1 ? 1.05 : -1e6} max={1e6} onCommit={value => setDoc(current => {
              if (!current.spawn) return current;
              const position = [...current.spawn.position] as [number, number, number]; position[axis] = value;
              return { ...current, spawn: { ...current.spawn, position } };
            })} />)}
          <SceneNumberInput label="Orientación (grados)" value={Number(THREE.MathUtils.radToDeg(doc.spawn.yaw).toFixed(4))} min={-360} max={360} step={1}
            onCommit={value => setDoc(current => current.spawn ? { ...current, spawn: { ...current.spawn, yaw: THREE.MathUtils.degToRad(value) } } : current)} />
        </div> : null}
      </section>

      <AdminScenePublicationPanel document={doc} onLoad={saved => {
        setDoc(saved);
        setSelectedId(saved.entities[0]?.id ?? null);
      }} />
      {playing ? <AdminScenePlayPreview document={playing} onStop={() => setPlaying(null)} /> : null}

      <div className="border-b border-emerald-500/20 bg-emerald-950/15 px-4 py-3 text-xs text-slate-200">
        <p className="font-semibold text-emerald-200/95">
          Aplicar a sala Colyseus activa
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Actualiza jugadores conectados; también cambia la publicación si NEXUS_SCENE_PERSIST_ENABLE está habilitado. Requiere sesión admin + <code className="text-cyan-200/80">NEXUS_GAME_MONITOR_SECRET</code>{" "}
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
              childrenByParent={childrenByParent}
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
                spawn={doc.spawn}
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
                <label className="block text-slate-400">Grupo padre
                  <select aria-label="Grupo padre" disabled={!selectedGeometry} value={selected.parentId ?? ''}
                    className="mt-1 w-full rounded border border-white/10 bg-slate-900 p-2 font-mono text-xs"
                    onChange={event => {
                      try { setDoc(reparentSceneEntity(doc, selected.id, event.target.value || null)); setTransformError(null); }
                      catch { setTransformError('No se puede cambiar de grupo: revisa ciclos, profundidad y límites de escala local/mundial.'); }
                    }}>
                    <option value="">Raíz de la escena</option>
                    {doc.entities.filter(entity => isSceneGroup(entity) && !selectedSubtree.has(entity.id)).map(entity =>
                      <option key={entity.id} value={entity.id}>{entity.id}</option>)}
                  </select>
                </label>
                <p className="mt-1 text-[10px] text-slate-500">Cambiar de padre conserva la pose mundial. Los campos siguientes son locales al grupo.</p>
              </div>
              <div>
                <span className="text-slate-500">Posición local</span>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(['X', 'Y', 'Z'] as const).map((label, axis) => <SceneNumberInput key={`${selected.id}-position-${axis}`}
                    label={label} value={selected.transform.position[axis]} min={selectedGeometry ? -1e6 : undefined} max={selectedGeometry ? 1e6 : undefined}
                    onCommit={value => {
                      const position = [...selected.transform.position] as [number, number, number];
                      position[axis] = value; setTransform({ position });
                    }} />)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Rotación XYZ (grados)</span>
                {selectedGeometry ? <div className="mt-1 grid grid-cols-3 gap-2">
                  {(['X', 'Y', 'Z'] as const).map((label, axis) => <SceneNumberInput key={`${selected.id}-rotation-${axis}`}
                    label={label} value={Number(selectedDegrees[axis].toFixed(4))} min={-360} max={360} step={1}
                    onCommit={value => {
                      const degrees = [...selectedDegrees] as [number, number, number]; degrees[axis] = value;
                      setTransform({ rotation: sceneRotationQuaternion(degrees) });
                    }} />)}
                </div> : null}
                <pre className="mt-1 max-h-24 overflow-auto rounded bg-black/40 p-2 font-mono text-[10px] text-slate-400">
                  {JSON.stringify(selected.transform.rotation)}
                </pre>
              </div>
              {selectedGeometry ? <>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={adminBtnSecondary} onClick={() => {
                      const copy = duplicateSceneSubtree(doc, selected.id, () => `entity-${crypto.randomUUID()}`);
                      setDoc(copy.document); setSelectedId(copy.selectedId);
                    }}>Duplicar {selectedGroup ? 'grupo completo' : 'objeto'}</button>
                    <button type="button" className={adminBtnDanger}
                      onClick={() => {
                        if (!window.confirm(`¿Eliminar ${selectedSubtree.size} entidad(es), incluidos sus hijos, del borrador? Puedes deshacerlo.`)) return;
                        setDoc(removeSceneSubtree(doc, selected.id));
                        setSelectedId(null);
                      }}>Eliminar {selectedGroup ? 'grupo completo' : 'objeto'}</button>
                  </div>
              </> : null}
              {selectedModel ? <SceneModelInspector key={selected.id} model={selectedModel} scale={selected.transform.scale} assets={modelCatalog.assets} onChange={props => {
                try {
                  setDoc(parseSceneDocumentV0_1({ ...doc, entities: doc.entities.map(entity => entity.id === selected.id
                    ? { ...entity, components: entity.components.map(c => c.type === 'nexus:model' ? { ...c, props } : c) } : entity) }));
                  setTransformError(null);
                } catch { setTransformError('Colliders inválidos para la escala actual. Reduce el tamaño o la escala.'); }
              }} /> : null}
              {selectedBox && (
                <fieldset className="space-y-2">
                  <legend>Caja de juego</legend>
                  {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                    <SceneNumberInput key={`${selected.id}-size-${axis}`} label={`Tamaño ${axis}`} min={0.01} max={Math.min(1000, 1000 / selected.transform.scale[index])}
                        value={selectedBox.size[index]} onCommit={value => {
                          const size = [...selectedBox.size]; size[index] = value;
                          updateBox({ size });
                        }} />
                  ))}
                  <label className="block">Color
                    <input type="color" value={selectedBox.color} onChange={event => updateBox({ color: event.target.value })} />
                  </label>
                  <label className="block"><input type="checkbox" checked={selectedBox.solid}
                    onChange={event => updateBox({ solid: event.target.checked })} /> Colisión sólida</label>
                </fieldset>
              )}
              <div>
                <span className="text-slate-500">Escala</span>
                {selectedGroup ? <SceneNumberInput key={`${selected.id}-uniform-scale`} label="Escala uniforme del grupo"
                  value={selected.transform.scale[0]} min={0.01} max={1000}
                  onCommit={value => setTransform({ scale: [value, value, value] })} /> : selectedGeometry ? <div className="mt-1 grid grid-cols-3 gap-2">
                  {(['X', 'Y', 'Z'] as const).map((label, axis) => <SceneNumberInput key={`${selected.id}-scale-${axis}`}
                    label={label} value={selected.transform.scale[axis]} min={0.01} max={selectedBox ? Math.min(1000, 1000 / selectedBox.size[axis])
                      : Math.min(1000, ...(selectedModel?.colliders.flatMap(c => [1000 / c.size[axis], c.offset[axis] ? 1000 / Math.abs(c.offset[axis]) : 1000]) ?? []))}
                    onCommit={value => {
                      const scale = [...selected.transform.scale] as [number, number, number]; scale[axis] = value;
                      setTransform({ scale });
                    }} />)}
                </div> : <pre className="mt-1 max-h-20 overflow-auto rounded bg-black/40 p-2 font-mono text-[10px] text-slate-400">
                  {JSON.stringify(selected.transform.scale)}
                </pre>}
              </div>
              {transformError ? <p role="alert" className="text-amber-200">{transformError}</p> : null}
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
