import { NextResponse } from "next/server";
import { getAdminConfig } from "@/core/config";

/** ES: Estado del panel admin (sin secretos). EN: Admin panel status (no secrets). */
export async function GET() {
  const config = getAdminConfig();
  return NextResponse.json({
    enabled: config.enabled,
    hasCredentials: Boolean(
      process.env.ADMIN_USERNAME_ACCESS?.trim() &&
        process.env.ADMIN_PASSWORD_ACCESS?.trim()
    ),
  });
}
