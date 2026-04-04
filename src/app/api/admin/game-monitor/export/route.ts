import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/core/auth";
import {
  getGameMonitorBaseUrl,
  getGameMonitorSecret,
  isGameMonitorConfigured,
} from "@/lib/gameMonitorProxy";

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGameMonitorConfigured()) {
    return NextResponse.json({ error: "Monitor not configured" }, { status: 503 });
  }

  const format = request.nextUrl.searchParams.get("format") || "json";
  const secret = getGameMonitorSecret();
  const base = getGameMonitorBaseUrl().replace(/\/$/, "");

  if (format === "ndjson") {
    const url = `${base}/__nexus-internal/v1/export.ndjson?token=${encodeURIComponent(secret)}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json({ error: "Upstream failed" }, { status: 502 });
      }
      const body = await res.text();
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Content-Disposition": `attachment; filename="game-monitor-${Date.now()}.ndjson"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
    }
  }

  const snapUrl = `${base}/__nexus-internal/v1/snapshot`;
  try {
    const res = await fetch(snapUrl, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream failed" }, { status: 502 });
    }
    const data = await res.json();
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="game-monitor-${Date.now()}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
