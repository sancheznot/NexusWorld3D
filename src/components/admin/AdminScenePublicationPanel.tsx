"use client";

import { useEffect, useRef, useState } from 'react';
import type { SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import type { SceneLibraryState } from '@/types/sceneLibrary.types';
import { adminBtnPrimary, adminBtnSecondary } from './admin-ui';

export default function AdminScenePublicationPanel({ document, onLoad }: {
  document: SceneDocumentV0_1;
  onLoad: (document: SceneDocumentV0_1) => void;
}) {
  const [library, setLibrary] = useState<SceneLibraryState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const worldId = document.worldId;

  useEffect(() => {
    const controller = new AbortController();
    pending.current = controller;
    setLibrary(null);
    setError('');
    setMessage('');
    setBusy(true);
    void fetch('/api/admin/scene-authoring/library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read', worldId }), signal: controller.signal,
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.state) throw new Error(data.error || 'No se pudo cargar la biblioteca.');
      if (!controller.signal.aborted) setLibrary(data.state);
    }).catch(error => {
      if (!controller.signal.aborted) setError(String(error.message || error));
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => { pending.current?.abort(); };
  }, [worldId]);

  async function command(action: 'read' | 'save-draft' | 'publish' | 'restore', revision?: string) {
    if (busy) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/scene-authoring/library', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ action, worldId, document, revision,
          expectedRevision: action === 'save-draft' ? library?.draftRevision ?? null : library?.publishedRevision ?? null }),
      });
      const data = await response.json();
      if (!response.ok || !data.state) throw new Error(response.status === 409
        ? 'La versión cambió o no es válida. Actualiza la biblioteca y revisa los cambios antes de volver a guardar.'
        : data.error || 'No se pudo completar la operación.');
      if (controller.signal.aborted) return;
      setLibrary(data.state);
      setMessage(action === 'read' ? 'Biblioteca actualizada; tus cambios locales se conservan.'
        : action === 'save-draft' ? 'Borrador guardado en el servidor.'
        : action === 'restore' ? 'Versión anterior publicada. Tu borrador local se conserva.'
        : 'Versión publicada para nuevas salas. Las salas activas no se han modificado.');
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Error de red.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function load(saved: SceneDocumentV0_1 | null | undefined) {
    if (saved && window.confirm('¿Reemplazar los cambios locales con esta versión guardada?')) onLoad(structuredClone(saved));
  }

  const ready = library?.worldId === worldId && !busy;
  return <section aria-label="Publicación de escenas" aria-busy={busy} className="border-b border-cyan-500/20 bg-cyan-950/10 px-4 py-3 text-xs text-slate-300">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold text-cyan-200">Borrador y publicación · {worldId}</h3>
      <button type="button" disabled={busy} className={adminBtnSecondary} onClick={() => void command('read')}>Actualizar biblioteca</button>
    </div>
    <p className="my-2 text-slate-400">Editar no publica. Guarda el borrador para continuar después o publica una versión para nuevas salas con carga persistida habilitada. Para jugadores conectados, usa «Aplicar a sala».</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={!ready} className={adminBtnSecondary} onClick={() => void command('save-draft')}>Guardar borrador</button>
      <button type="button" disabled={!ready || !library?.draft} className={adminBtnSecondary} onClick={() => load(library?.draft)}>Abrir borrador guardado</button>
      <button type="button" disabled={!ready} className={adminBtnPrimary} onClick={() => {
        if (window.confirm('¿Publicar el documento actual para nuevas salas de este mundo?')) void command('publish');
      }}>Publicar versión</button>
      <button type="button" disabled={!ready || !library?.published} className={adminBtnSecondary} onClick={() => load(library?.published)}>Abrir publicada</button>
    </div>
    <p className="mt-2 font-mono text-[11px] text-slate-400">Borrador: {library?.draftRevision?.slice(0, 8) ?? 'sin guardar'} · Publicada: {library?.publishedRevision?.slice(0, 8) ?? 'ninguna'}</p>
    {library && library.revisions.length > 0 ? <details className="mt-2">
      <summary className="cursor-pointer text-cyan-200">Historial de versiones ({library.revisions.length})</summary>
      <ul className="mt-2 max-h-48 space-y-2 overflow-auto">
        {library.revisions.map(item => <li key={item.revision} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
          <span><code>{item.revision.slice(0, 8)}</code> · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>{item.revision === library.publishedRevision ? ' · publicada' : ''}</span>
          <button type="button" disabled={!ready || item.revision === library.publishedRevision} className={adminBtnSecondary} onClick={() => {
            if (window.confirm(`¿Volver a publicar la versión ${item.revision.slice(0, 8)}? No cambia tu borrador ni las salas activas.`)) void command('restore', item.revision);
          }}>Restaurar publicación</button>
        </li>)}
      </ul>
    </details> : null}
    <p role="status" aria-live="polite" className="mt-2 text-emerald-200">{busy ? 'Procesando…' : message}</p>
    {error ? <p role="alert" className="mt-2 text-amber-200">{error}</p> : null}
  </section>;
}
