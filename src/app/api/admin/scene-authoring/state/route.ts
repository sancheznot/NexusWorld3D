import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/core/auth";
import {
  fetchGameMonitorSceneStateV0_1,
  isGameMonitorConfigured,
} from "@/lib/gameMonitorProxy";

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGameMonitorConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        hint: "Set NEXUS_GAME_MONITOR_SECRET and NEXUS_GAME_MONITOR_URL if Colyseus is remote.",
      },
      { status: 503 }
    );
  }

  const roomId = request.nextUrl.searchParams.get("roomId") || undefined;
  const result = await fetchGameMonitorSceneStateV0_1(roomId);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    roomId: result.roomId,
    document: result.document,
  });
}
