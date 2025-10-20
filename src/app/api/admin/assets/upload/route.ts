import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/core/auth';
import { assetStorage } from '@/core/storage';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId || !isAdminAuthenticated(sessionId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload file
    const result = await assetStorage.uploadTemp(file);

    if (result.success) {
      return NextResponse.json({
        success: true,
        url: result.url,
        key: result.key,
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error('Upload error:', error);
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
