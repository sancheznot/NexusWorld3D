"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { getSceneBoxProps, getSceneModelProps, getSceneInteraction, resolveSceneWorldEntities, type SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import SceneEntityVisual from '../world/SceneEntityVisual';
import { createScenePlaySession } from '@/lib/three/scenePlaySession';
import { adminBtnDanger } from './admin-ui';

function Simulation({ document, onFeedback }: { document: SceneDocumentV0_1; onFeedback: (message: string) => void }) {
  const entities = useMemo(() => resolveSceneWorldEntities(document.entities), [document]);
  const session = useRef<ReturnType<typeof createScenePlaySession> | null>(null);
  const avatar = useRef<Mesh>(null);
  const keys = useRef(new Set<string>());
  const jump = useRef(false);
  const interact = useRef(false);
  useEffect(() => {
    const simulation = createScenePlaySession(document, 'exterior');
    session.current = simulation;
    const supported = new Set(['KeyE', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight']);
    const down = (event: KeyboardEvent) => {
      if (!supported.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.target as HTMLElement)?.closest('button,input,select,textarea') && event.code === 'Space') return;
      event.preventDefault();
      keys.current.add(event.code);
      if (event.code === 'Space' && !event.repeat) jump.current = true;
      if (event.code === 'KeyE' && !event.repeat) interact.current = true;
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    const clear = () => { keys.current.clear(); jump.current = false; interact.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    window.document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      window.document.removeEventListener('visibilitychange', clear);
      clear();
      session.current = null;
      simulation.dispose();
    };
  }, [document]);
  useFrame(({ camera }, delta) => {
    const current = session.current;
    if (!current) return;
    const held = keys.current;
    let x = Number(held.has('KeyD') || held.has('ArrowRight')) - Number(held.has('KeyA') || held.has('ArrowLeft'));
    let z = Number(held.has('KeyS') || held.has('ArrowDown')) - Number(held.has('KeyW') || held.has('ArrowUp'));
    const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    if (interact.current) { onFeedback(current.interact()); interact.current = false; }
    const yaw = current.yaw;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    current.physics.setMovementInput({ x: x * cos + z * sin, z: z * cos - x * sin,
      isRunning: held.has('ShiftLeft') || held.has('ShiftRight'), stamina: 100 });
    if (jump.current) { current.physics.jump(8); jump.current = false; }
    current.physics.update(delta);
    const position = current.player.position;
    avatar.current?.position.set(position.x, position.y, position.z);
    avatar.current?.rotation.set(0, yaw, 0);
    camera.position.set(position.x + 12 * sin, position.y + 8, position.z + 12 * cos);
    camera.lookAt(position.x, position.y, position.z);
  });
  return <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[10, 20, 8]} intensity={1.2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#172033" /></mesh>
    <gridHelper args={[200, 100, '#334155', '#253047']} position={[0, 0.01, 0]} />
    {entities.map(entity => {
      const mapId = getSceneInteraction(entity)?.mapId ?? getSceneModelProps(entity)?.mapId ?? getSceneBoxProps(entity)?.mapId;
      return mapId === 'exterior' ? <SceneEntityVisual key={entity.id} entity={entity} /> : null;
    })}
    <mesh ref={avatar}><capsuleGeometry args={[0.5, 1, 4, 8]} /><meshStandardMaterial color="#22d3ee" /></mesh>
  </>;
}

export default function AdminScenePlayPreview({ document, onStop }: { document: SceneDocumentV0_1; onStop: () => void }) {
  const [feedback, setFeedback] = useState('E: interactuar con zonas, recursos y portales. Inventario de prueba no persistente.');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.focus();
    return () => { element?.close(); };
  }, []);
  return <dialog ref={dialog} tabIndex={-1} aria-labelledby="scene-play-title" onCancel={event => { event.preventDefault(); onStop(); }}
    className="fixed inset-0 m-auto h-[90vh] w-[94vw] max-w-6xl overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-950 p-0 text-slate-200 backdrop:bg-black/80">
    <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
      <div><h2 id="scene-play-title" className="font-semibold text-cyan-200">Play local · {document.worldId}</h2>
        <p className="text-xs text-slate-400">WASD / flechas · Shift correr · Espacio saltar · Escape salir</p></div>
      <button type="button" onClick={onStop} className={adminBtnDanger}>Stop</button>
    </header>
    <p className="px-4 py-2 text-xs text-amber-200">Prueba aislada del exterior: geometría, colisiones, recursos, zonas y portales. No conecta jugadores, guarda ni publica cambios.</p>
    <p role="status" className="px-4 text-xs text-cyan-200">{feedback}</p>
    <div className="h-[calc(100%_-_175px)] min-h-40"><Canvas camera={{ position: [0, 10, 18], far: 500 }} dpr={[1, 1.5]}><Simulation document={document} onFeedback={setFeedback} /></Canvas></div>
  </dialog>;
}
