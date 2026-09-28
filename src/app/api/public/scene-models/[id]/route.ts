import { NextRequest, NextResponse } from 'next/server';
import { fetchSceneAssets } from '@/lib/sceneAssetProxy';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^upload-[a-f0-9]{64}$/.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const response = await fetchSceneAssets(`/${id}`);
    if (!response.ok) return NextResponse.json({ error: 'Model unavailable' }, { status: response.status === 404 ? 404 : 502 });
    return new NextResponse(response.body, { headers: {
      'Content-Type': 'model/gltf-binary', 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${id}.glb"`,
    } });
  } catch { return NextResponse.json({ error: 'Model service unavailable' }, { status: 503 }); }
}
