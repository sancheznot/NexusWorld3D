import { NextRequest, NextResponse } from "next/server";
import {
  getSessionIdFromRequest,
  isAdminAuthenticated,
} from "@/core/auth";

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionIdFromRequest(request);
    const authenticated = Boolean(
      sessionId && isAdminAuthenticated(sessionId)
    );
    return NextResponse.json(
      { authenticated },
      { status: authenticated ? 200 : 401 }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
