import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminSession } from '@/core/auth';
import { fetchWorldAccess } from '@/lib/publicWorldProxy';
export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const worldId = request.nextUrl.searchParams.get('worldId');
  if (!worldId) return NextResponse.json({ error: 'worldId_required' }, { status: 400 });
  try { const response = await fetchWorldAccess('world-access', worldId); return NextResponse.json(await response.json(), { status: response.status }); }
  catch { return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (!isValidAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'origin_mismatch' }, { status: 403 });
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 4096) return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    JSON.parse(body);
    const response = await fetchWorldAccess('world-access', undefined, body);
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ error: 'No se pudo actualizar el acceso' }, { status: 503 }); }
}
