import { NextRequest, NextResponse } from "next/server";
import { assetStorage } from "@/core/storage";
import { isValidAdminSession } from "@/core/auth";

export async function POST(request: NextRequest) {
  try {
    if (!isValidAdminSession(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

