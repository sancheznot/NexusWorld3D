import { NextRequest, NextResponse } from 'next/server';
import { worldManager } from '@/core/worlds';
import { isAdminAuthenticated } from '@/core/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId || !isAdminAuthenticated(sessionId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all worlds
    const worlds = await worldManager.listWorlds();
    return NextResponse.json({ worlds });
  } catch (error) {
    console.error('Error listing worlds:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId || !isAdminAuthenticated(sessionId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, description } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    // Create world
    const result = await worldManager.createWorld(id, name, description);
    
    if (result.success) {
      return NextResponse.json({ world: result.world });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Error creating world:', error);
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
