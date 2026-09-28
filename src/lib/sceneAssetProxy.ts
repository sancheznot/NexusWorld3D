import { getGameMonitorBaseUrl, getGameMonitorSecret } from './gameMonitorProxy';

export const MAX_SCENE_UPLOAD_BYTES = 16 * 1024 * 1024;
export async function readSceneUpload(request: Request) {
  if (Number(request.headers.get('content-length')) > MAX_SCENE_UPLOAD_BYTES) throw new Error('payload_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('empty_upload');
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_SCENE_UPLOAD_BYTES) { await reader.cancel(); throw new Error('payload_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}
export async function fetchSceneAssets(path = '', init?: RequestInit) {
  const secret = getGameMonitorSecret();
  if (!secret) throw new Error('monitor_not_configured');
  return fetch(`${getGameMonitorBaseUrl().replace(/\/$/, '')}/__nexus-internal/v1/scene-assets${path}`, {
    ...init, headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'model/gltf-binary' },
    cache: 'no-store', signal: AbortSignal.timeout(30000),
  });
}
