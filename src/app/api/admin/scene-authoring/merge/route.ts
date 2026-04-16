import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/core/auth";
import {
  isGameMonitorConfigured,
  postGameMonitorSceneMergeEntitiesV0_1,
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

  let body: { roomId?: string; entities?: unknown[] };
  try {
    body = (await request.json()) as { roomId?: string; entities?: unknown[] };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(body.entities) || body.entities.length === 0) {
    return NextResponse.json({ ok: false, error: "entities_required" }, { status: 400 });
  }

  const result = await postGameMonitorSceneMergeEntitiesV0_1({
    roomId: body.roomId,
    entities: body.entities,
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
