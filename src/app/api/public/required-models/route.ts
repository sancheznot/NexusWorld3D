import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import {
  checkRequiredModels,
  resolveRequiredModelsTierForClient,
} from "@/lib/assets/requiredModels";

export async function GET(request: NextRequest) {
  const tierParam = request.nextUrl.searchParams.get("tier");
  const frameworkDemo =
    request.nextUrl.searchParams.get("frameworkDemo") === "1";

  const tier =
    tierParam === "boot" || tierParam === "demo" || tierParam === "full"
      ? tierParam
      : resolveRequiredModelsTierForClient(frameworkDemo);

  try {
    const repoRoot = join(process.cwd());
    const result = checkRequiredModels(repoRoot, tier);
    return NextResponse.json({
      ok: result.missing.length === 0,
      tier: result.tier,
      missing: result.missing,
      optionalMissing: result.optionalMissing,
      presentCount: result.present.length,
      docsPath: "docs/REQUIRED_MODELS.md",
      validateCommand: "npm run validate-required-models -- --strict",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
