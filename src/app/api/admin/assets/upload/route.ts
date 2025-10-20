import { NextRequest, NextResponse } from 'next/server';
import { assetStorage } from '@/core/storage';
import { getSessionIdFromRequest } from '@/core/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication via cookie
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Basic session validation - check if it looks like a valid session
    if (!sessionId.startsWith('admin_')) {
      return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
    }

    console.log('Upload request with session:', sessionId);

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

