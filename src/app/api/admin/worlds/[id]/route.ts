import { NextRequest, NextResponse } from 'next/server';
import { worldManager } from '@/core/worlds';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication via cookie
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Basic session validation
    if (!sessionId.startsWith('admin_')) {
      return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
    }

    const { id } = params;
    const result = await worldManager.loadWorld(id);
    
    if (result.success) {
      return NextResponse.json({ world: result.world });
    } else {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
  } catch (error) {
    console.error('Error loading world:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params: { id } }: { params: { id: string } }
) {
  try {
    // Check authentication via cookie
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Basic session validation
    if (!sessionId.startsWith('admin_')) {
      return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
    }

    const worldData = await request.json();
    
    const result = await worldManager.saveWorld(worldData);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error saving world:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication via cookie
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Basic session validation
    if (!sessionId.startsWith('admin_')) {
      return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
    }

    const { id } = params;
    const result = await worldManager.deleteWorld(id);
    
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting world:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getSessionIdFromRequest(request: NextRequest): string | null {
  // Try to get from cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies['admin_session'] || null;
  }

  return null;
}
