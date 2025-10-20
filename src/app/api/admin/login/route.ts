import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, createAdminSession, setSessionCookie } from '@/core/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Validate credentials
    if (!validateAdminCredentials({ username, password })) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create session
    const sessionId = createAdminSession(username);
    
    // Create response with session cookie
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', setSessionCookie(sessionId));
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
