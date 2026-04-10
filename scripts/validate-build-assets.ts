/**
 * ES: Comprueba GLB bajo `public/models/build/{pieceId}.glb` para ids del catálogo + `buildingPieces[].pieceId` en el manifest.
 * EN: Ensures build GLBs exist for catalog ids + manifest `buildingPieces[].pieceId`.
 *
 * Por defecto: avisos si falta el archivo (el cliente usa primitivo `fallback`). `--strict` → exit 1.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseContentManifestV1 } from "@nexusworld3d/content-schema";
import { BUILD_PIECE_IDS } from "../src/constants/buildPieces";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const manifestPath = join(repoRoot, "content", "manifest.json");
const publicBuildDir = join(repoRoot, "public", "models", "build");
const strict = process.argv.includes("--strict");

function extractManifestPieceIds(raw: unknown): string[] {
  const manifest = parseContentManifestV1(raw);
  const bp = manifest.buildingPieces;
  if (!Array.isArray(bp)) return [];
  const out: string[] = [];
  for (const row of bp) {
    if (
      row &&
      typeof row === "object" &&
      "pieceId" in row &&
      typeof (row as { pieceId: unknown }).pieceId === "string"
    ) {
      const id = (row as { pieceId: string }).pieceId.trim();
      if (id) out.push(id);
    }
  }
  return out;
}

function fail(message: string): never {
  console.error(`[validate-build-assets] ${message}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) {
  fail(`Missing ${manifestPath}`);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
} catch (e) {
  fail(`Invalid manifest JSON — ${e instanceof Error ? e.message : String(e)}`);
}

let manifestPieceIds: string[];
try {
  manifestPieceIds = extractManifestPieceIds(raw);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  fail(`Manifest — ${msg}`);
}

const toCheck = new Set<string>([
  ...BUILD_PIECE_IDS,
  ...manifestPieceIds,
]);

let missing = 0;
for (const pieceId of toCheck) {
  const safe = pieceId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (safe !== pieceId) {
    console.warn(
      `[validate-build-assets] Skipping unsafe pieceId (sanitize mismatch): "${pieceId}"`
    );
    continue;
  }
  const glb = join(publicBuildDir, `${safe}.glb`);
  if (!existsSync(glb)) {
    missing++;
    const line = `Missing GLB: public/models/build/${safe}.glb (primitive fallback may apply if catalog defines one)`;
    if (strict) console.error(`[validate-build-assets] ${line}`);
    else console.warn(`[validate-build-assets] ${line}`);
  }
}

if (strict && missing > 0) {
  fail(`${missing} piece(s) without GLB (remove --strict to warn only).`);
}

console.log(
  `[validate-build-assets] OK — checked ${toCheck.size} piece id(s)` +
    (missing > 0 ? `, ${missing} missing GLB (warnings only)` : "")
);
