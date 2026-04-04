import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/core/auth";
import {
  fetchGameMonitorSnapshot,
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
        hint: "Set NEXUS_GAME_MONITOR_SECRET (and NEXUS_GAME_MONITOR_URL if Colyseus is remote).",
      },
      { status: 503 }
    );
  }

  const data = await fetchGameMonitorSnapshot();
  if (data === null) {
    return NextResponse.json(
      {
        configured: true,
        reachable: false,
        hint: "Colyseus monitor unreachable — is the game server running with the same secret?",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ configured: true, reachable: true, data });
}
