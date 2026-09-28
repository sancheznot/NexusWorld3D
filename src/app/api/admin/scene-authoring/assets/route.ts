import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminSession } from '@/core/auth';
import { fetchSceneAssets, readSceneUpload } from '@/lib/sceneAssetProxy';

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const response = await fetchSceneAssets();
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ error: 'Servidor de juego no disponible' }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  if (!isValidAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'origin_mismatch' }, { status: 403 });
  try {
    const body = await readSceneUpload(request);
    const name = request.nextUrl.searchParams.get('name') || 'Modelo GLB';
    const response = await fetchSceneAssets(`?name=${encodeURIComponent(name)}`, { method: 'POST', body: new Uint8Array(body) });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'payload_too_large';
    return NextResponse.json({ error: tooLarge ? 'Máximo 16 MiB por archivo' : 'No se pudo subir el modelo' }, { status: tooLarge ? 413 : 503 });
  }
}
