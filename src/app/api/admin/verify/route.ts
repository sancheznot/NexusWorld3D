import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/core/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionIdFromRequest(request);
    
    if (!sessionId || !isAdminAuthenticated(sessionId)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
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

  // Try to get from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
