/**
 * ES: Valida `content/manifest.json` con Zod (@nexusworld3d/content-schema) + ids ⊆ ITEMS_CATALOG.
 * EN: Validates manifest via Zod + item ids ⊆ ITEMS_CATALOG.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseContentManifestV1 } from "@nexusworld3d/content-schema";
import { ITEMS_CATALOG } from "../src/constants/items";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, "..", "content", "manifest.json");

function fail(message: string): never {
  console.error(`[validate-content] ${message}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) {
  fail(`Missing ${manifestPath} (see docs/ADDING_CONTENT.md).`);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
} catch (e) {
  fail(`Invalid JSON — ${e instanceof Error ? e.message : String(e)}`);
}

let manifest;
try {
  manifest = parseContentManifestV1(raw);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  fail(`Manifest schema — ${msg}`);
}

const catalogKeys = new Set(Object.keys(ITEMS_CATALOG));
for (const row of manifest.items) {
  if (!catalogKeys.has(row.id)) {
    fail(
      `Unknown item id "${row.id}" — not in ITEMS_CATALOG (src/constants/items.ts).`
    );
  }
}

console.log(
  `[validate-content] OK — schemaVersion=${manifest.schemaVersion}, items=${manifest.items.length}`
);
process.exit(0);
