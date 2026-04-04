import { NextRequest, NextResponse } from "next/server";
import {
  getAdminSession,
  getSessionIdFromRequest,
  isValidAdminSession,
} from "@/core/auth";
import { insertAdminAudit } from "@/lib/db/adminAudit";
import { deleteAuthUserById } from "@/lib/db/authUsersAdmin";
import { isMariaDbConfigured } from "@/lib/db/mariadb";

function clientIp(request: NextRequest): string | null {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isValidAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMariaDbConfigured()) {
    return NextResponse.json(
      { error: "MariaDB not configured" },
      { status: 503 }
    );
  }

  const { id } = await ctx.params;
  const userId = decodeURIComponent(id ?? "").trim();
  if (!userId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sessionId = getSessionIdFromRequest(request)!;
  const session = getAdminSession(sessionId);
  const adminUser = session?.username ?? "unknown";

  try {
    const ok = await deleteAuthUserById(userId);
    if (!ok) {
      return NextResponse.json(
        { error: "User not found or not deleted" },
        { status: 404 }
      );
    }
    await insertAdminAudit({
      adminUsername: adminUser,
      action: "auth_user.delete",
      entityType: "auth_user",
      entityId: userId,
      ip: clientIp(request),
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/auth-users DELETE]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
