"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { sceneModelAssetSchema } from '@nexusworld3d/content-schema';
import { sceneModelAssets } from '@/lib/assets/sceneModelAssets';

export function useSceneModelCatalog() {
  const [assets, setAssets] = useState(sceneModelAssets);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/scene-authoring/assets', { signal: request.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo leer el catálogo');
      const uploaded = sceneModelAssetSchema.array().parse(data.assets);
      if (!request.signal.aborted) setAssets([...sceneModelAssets, ...uploaded]);
    } catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Error de red'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }, []);
  useEffect(() => { void refresh(); return () => controller.current?.abort(); }, [refresh]);
  async function upload(file: File) {
    if (busy) return null;
    if (!file.name.toLowerCase().endsWith('.glb') || file.size > 16 * 1024 * 1024) {
      setError('Selecciona un GLB de hasta 16 MiB.'); return null;
    }
    const request = new AbortController(); controller.current = request;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/scene-authoring/assets?name=${encodeURIComponent(file.name)}`, {
        method: 'POST', headers: { 'Content-Type': 'model/gltf-binary' }, body: file, signal: request.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo subir el modelo');
      const asset = sceneModelAssetSchema.parse(data.asset);
      if (request.signal.aborted) return null;
      setAssets(current => [...current.filter(item => item.id !== asset.id), asset]);
      setMessage(`Modelo registrado: ${asset.name}. Seleccionado para añadir a la escena.`);
      return asset;
    } catch (error) { if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Error de red'); return null; }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  return { assets, busy, error, message, refresh, upload };
}
