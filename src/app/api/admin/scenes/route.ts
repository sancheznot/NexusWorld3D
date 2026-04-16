import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { safeParseSceneDocumentV0_1 } from "@nexusworld3d/content-schema";
import { isValidAdminSession } from "@/core/auth";

/**
 * ES: Lista y parsea `content/scenes/*.json` (solo lectura) para inspector admin.
 * EN: Lists and parses scene JSON files — read-only for admin inspector.
 */
export async function GET(req: NextRequest) {
  if (!isValidAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dir = join(process.cwd(), "content", "scenes");
  if (!existsSync(dir)) {
    return NextResponse.json({ directory: false, files: [] });
  }

  const names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  const files: Array<{
    filename: string;
    ok: boolean;
    document?: unknown;
    error?: string;
  }> = [];

  for (const filename of names) {
    const path = join(dir, filename);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    } catch (e) {
      files.push({
        filename,
        ok: false,
        error: e instanceof Error ? e.message : "Invalid JSON",
      });
      continue;
    }
    const parsed = safeParseSceneDocumentV0_1(raw);
    if (!parsed.success) {
      files.push({
        filename,
        ok: false,
        error: parsed.error.message,
      });
      continue;
    }
    files.push({
      filename,
      ok: true,
      document: parsed.data,
    });
  }

  return NextResponse.json({ directory: true, files });
}
