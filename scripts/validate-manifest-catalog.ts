/**
 * ES: Cada `items[].id` del manifest debe existir en `ITEMS_CATALOG`.
 * EN: Every manifest item id must exist in `ITEMS_CATALOG`.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS_CATALOG } from "../src/constants/items";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, "..", "content", "manifest.json");

function fail(message: string): never {
  console.error(`[validate-manifest-catalog] ${message}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) {
  fail(`Missing ${manifestPath}`);
}

type ManifestV1 = { schemaVersion: number; items: Array<{ id: string }> };

let data: ManifestV1;
try {
  data = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestV1;
} catch (e) {
  fail(
    `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`
  );
}

if (!Array.isArray(data.items)) {
  fail('Field "items" must be an array.');
}

const catalogKeys = new Set(Object.keys(ITEMS_CATALOG));
for (let i = 0; i < data.items.length; i++) {
  const id = data.items[i]?.id;
  if (typeof id !== "string" || id.trim() === "") {
    fail(`items[${i}].id must be a non-empty string.`);
  }
  if (!catalogKeys.has(id)) {
    fail(
      `Unknown item id "${id}" — not in ITEMS_CATALOG (src/constants/items.ts).`
    );
  }
}

console.log(
  `[validate-manifest-catalog] OK — ${data.items.length} manifest ids ⊆ catalog`
);
process.exit(0);
