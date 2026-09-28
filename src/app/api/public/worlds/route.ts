import { NextRequest, NextResponse } from 'next/server';
import { fetchWorldAccess } from '@/lib/publicWorldProxy';
export async function GET(request: NextRequest) {
  try {
    const response = await fetchWorldAccess('public-worlds', request.nextUrl.searchParams.get('worldId') || undefined);
    if (!response.ok) throw new Error('unavailable');
    return NextResponse.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Catálogo de mundos no disponible' }, { status: 503 }); }
}
