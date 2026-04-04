import { NextRequest, NextResponse } from "next/server";
import { isValidAdminSession } from "@/core/auth";
import { isMariaDbConfigured } from "@/lib/db/mariadb";
import { listAdminAudit } from "@/lib/db/adminAudit";

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMariaDbConfigured()) {
    return NextResponse.json({
      mariaConfigured: false,
      rows: [],
      total: 0,
    });
  }

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "40");
  const offset = Number(searchParams.get("offset") ?? "0");

  try {
    const { rows, total } = await listAdminAudit(limit, offset);
    return NextResponse.json({ mariaConfigured: true, rows, total });
  } catch (e) {
    console.error("[admin/audit-log]", e);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
