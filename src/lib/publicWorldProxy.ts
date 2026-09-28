import { getGameMonitorBaseUrl, getGameMonitorSecret } from './gameMonitorProxy';
export async function fetchWorldAccess(path: 'public-worlds' | 'world-access', worldId?: string, body?: string) {
  const secret = getGameMonitorSecret();
  if (!secret) throw new Error('monitor_not_configured');
  return fetch(`${getGameMonitorBaseUrl().replace(/\/$/, '')}/__nexus-internal/v1/${path}${worldId ? `?worldId=${encodeURIComponent(worldId)}` : ''}`, {
    method: body === undefined ? 'GET' : 'POST', body,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
}
