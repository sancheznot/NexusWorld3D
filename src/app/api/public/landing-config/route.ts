import { NextResponse } from "next/server";
import { getResolvedLandingConfig } from "@/lib/db/siteSettings";
import { isMariaDbConfigured } from "@/lib/db/mariadb";
import { DEFAULT_LANDING_CONFIG } from "@/types/landing.types";

export async function GET() {
  try {
    if (!isMariaDbConfigured()) {
      return NextResponse.json({
        source: "default",
        config: DEFAULT_LANDING_CONFIG,
      });
    }
    const config = await getResolvedLandingConfig();
    return NextResponse.json({ source: "database", config });
  } catch (e) {
    console.warn("[landing-config] falling back to defaults:", e);
    return NextResponse.json(
      { source: "default", config: DEFAULT_LANDING_CONFIG },
      { status: 200 }
    );
  }
}
