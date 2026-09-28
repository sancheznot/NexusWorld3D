"use client";
import React, { useEffect, useState } from 'react';
import { frameworkDefaultWorldId } from '@/lib/frameworkBranding';
import { adminBtnPrimary, adminBtnSecondary } from './admin-ui';

export default function SceneWorldAccessPanel({ worldId }: { worldId: string }) {
  const [name, setName] = useState(worldId), [description, setDescription] = useState('');
  const [isPublic, setPublic] = useState(false), [busy, setBusy] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/admin/scene-authoring/access?worldId=${encodeURIComponent(worldId)}`, { signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error);
        if (controller.signal.aborted) return;
        if (data.world) { setName(data.world.name); setDescription(data.world.description); setPublic(data.world.public); } })
      .catch(error => { if (!controller.signal.aborted) setError(String(error.message)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [worldId]);
  async function save(next: boolean) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/scene-authoring/access', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldId, name, description, public: next }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo guardar');
      setPublic(data.world.public);
    } catch (error) { setError(error instanceof Error ? error.message : 'Error de red'); }
    finally { setBusy(false); }
  }
  if (worldId === frameworkDefaultWorldId) return <p className="px-4 py-2 text-xs text-slate-400">El mundo predeterminado conserva su portal existente. Para crear otro mundo público usa un worldId propio.</p>;
  return <section aria-label="Acceso público al mundo" aria-busy={busy} className="border-b border-white/10 bg-slate-950/50 px-4 py-3 text-xs text-slate-300">
    <h3 className="font-semibold text-cyan-200">Acceso al mundo · {isPublic ? 'Público' : 'Privado'}</h3>
    <p className="my-2">Publica una escena válida y después habilita el acceso. WorldId: 1–64 letras, números, guiones o guiones bajos. Ocultar bloquea nuevas entradas, no expulsa jugadores conectados.</p>
    <label className="block">Nombre<input value={name} maxLength={100} onChange={event => setName(event.target.value)} className="mx-2 rounded bg-slate-900 p-2" /></label>
    <label className="mt-2 block">Descripción<textarea value={description} maxLength={500} onChange={event => setDescription(event.target.value)} className="mt-1 block w-full rounded bg-slate-900 p-2" /></label>
    <div className="mt-2 flex flex-wrap gap-2">
      <button disabled={busy || !name.trim()} className={adminBtnPrimary} onClick={() => {
        if (window.confirm('¿Permitir que cualquier visitante entre en la escena publicada?')) void save(true);
      }}>Guardar y habilitar acceso público</button>
      <button disabled={busy || !isPublic} className={adminBtnSecondary} onClick={() => void save(false)}>Ocultar / cerrar nuevas entradas</button>
      {isPublic ? <a className="p-2 text-cyan-200 underline" href={`/worlds?worldId=${encodeURIComponent(worldId)}`} target="_blank" rel="noreferrer">Abrir mundo público</a> : null}
    </div>
    {error ? <p role="alert" className="mt-2 text-amber-200">{error}</p> : null}
  </section>;
}
