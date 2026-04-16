import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/core/auth";
import {
  isGameMonitorConfigured,
  postGameMonitorSceneApplyV0_1,
} from "@/lib/gameMonitorProxy";

export async function POST(request: NextRequest) {
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

  let body: { roomId?: string; document?: unknown };
  try {
    body = (await request.json()) as { roomId?: string; document?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.document === undefined) {
    return NextResponse.json({ ok: false, error: "document_required" }, { status: 400 });
  }

  const result = await postGameMonitorSceneApplyV0_1({
    roomId: body.roomId,
    document: body.document,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    roomId: result.roomId,
    worldId: result.worldId,
    entityCount: result.entityCount,
  });
}
