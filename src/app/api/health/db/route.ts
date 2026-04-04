/**
 * ES: Comprueba conectividad a MariaDB (si está configurada).
 * EN: Checks MariaDB connectivity (when configured).
 */

import { NextResponse } from "next/server";
import { pingMariaDb } from "@/lib/db/mariadb";

export const runtime = "nodejs";

export async function GET() {
  const result = await pingMariaDb();

  switch (result.kind) {
    case "skipped":
      return NextResponse.json(
        { status: "skipped", message: "MARIADB_HOST / DATABASE_URL not set" },
        { status: 200 }
      );
    case "error":
      return NextResponse.json(
        { status: "error", error: result.error },
        { status: 503 }
      );
    case "ok":
      return NextResponse.json({
        status: "ok",
        latencyMs: result.latencyMs,
      });
  }
}
