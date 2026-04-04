import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getSessionIdFromRequest, isValidAdminSession } from "@/core/auth";
import { insertAdminAudit } from "@/lib/db/adminAudit";
import { isMariaDbConfigured } from "@/lib/db/mariadb";
import {
  getResolvedLandingConfig,
  patchLandingConfig,
} from "@/lib/db/siteSettings";
import {
  DEFAULT_LANDING_CONFIG,
  type LandingBrandingConfig,
} from "@/types/landing.types";

function clientIp(request: NextRequest): string | null {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function GET(request: NextRequest) {
  if (!isValidAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMariaDbConfigured()) {
    return NextResponse.json({
      mariaConfigured: false,
      landing: DEFAULT_LANDING_CONFIG,
    });
  }

  try {
    const landing = await getResolvedLandingConfig();
    return NextResponse.json({ mariaConfigured: true, landing });
  } catch (e) {
    console.error("[admin/site-settings GET]", e);
    return NextResponse.json({
      mariaConfigured: true,
      landing: DEFAULT_LANDING_CONFIG,
      dbError: true,
    });
  }
}

export async function PUT(request: NextRequest) {
  if (!isValidAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessionId = getSessionIdFromRequest(request)!;

  if (!isMariaDbConfigured()) {
    return NextResponse.json(
      { error: "MariaDB not configured; cannot persist site settings." },
      { status: 503 }
    );
  }

  const session = getAdminSession(sessionId);
  const adminUser = session?.username ?? "unknown";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch =
    body && typeof body === "object" && "landing" in body
      ? (body as { landing?: Partial<LandingBrandingConfig> }).landing
      : null;

  if (!patch || typeof patch !== "object") {
    return NextResponse.json(
      { error: "Expected body { landing: { ... } }" },
      { status: 400 }
    );
  }

  try {
    const landing = await patchLandingConfig(patch);
    await insertAdminAudit({
      adminUsername: adminUser,
      action: "site_settings.landing.patch",
      entityType: "site_settings",
      entityId: "landing",
      payload: { keys: Object.keys(patch) },
      ip: clientIp(request),
    });
    return NextResponse.json({ success: true, landing });
  } catch (e) {
    console.error("[admin/site-settings PUT]", e);
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }
}
