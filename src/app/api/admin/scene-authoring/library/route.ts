import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminSession } from '@/core/auth';
import { getGameMonitorBaseUrl, getGameMonitorSecret } from '@/lib/gameMonitorProxy';

export async function POST(request: NextRequest) {
  if (!isValidAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'origin_mismatch' }, { status: 403 });
  const secret = getGameMonitorSecret();
  if (!secret) return NextResponse.json({ error: 'Monitor no configurado' }, { status: 503 });
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 512 * 1024) return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    JSON.parse(body);
    const response = await fetch(`${getGameMonitorBaseUrl().replace(/\/$/, '')}/__nexus-internal/v1/scene-library-v1`, {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body, cache: 'no-store', signal: AbortSignal.timeout(10000),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'invalid_json' : 'monitor_unreachable' },
      { status: error instanceof SyntaxError ? 400 : 502 });
  }
}
