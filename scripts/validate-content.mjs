#!/usr/bin/env node
/**
 * ES: Valida `content/manifest.json` (v1): estructura, ids de ítems únicos, arrays opcionales.
 * EN: Validates content manifest v1 — structure, unique item ids, optional arrays.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, "..", "content", "manifest.json");

function fail(message) {
  console.error(`[validate-content] ${message}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) {
  fail(`Missing ${manifestPath} (create it from docs/ADDING_CONTENT.md).`);
}

let data;
try {
  data = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (e) {
  fail(`Invalid JSON: ${manifestPath} — ${e instanceof Error ? e.message : String(e)}`);
}

if (typeof data.schemaVersion !== "number" || data.schemaVersion < 1) {
  fail('Field "schemaVersion" must be a number >= 1.');
}

if (!Array.isArray(data.items)) {
  fail('Field "items" must be an array.');
}

const seen = new Set();
for (let i = 0; i < data.items.length; i++) {
  const row = data.items[i];
  if (!row || typeof row !== "object") {
    fail(`items[${i}] must be an object.`);
  }
  const id = row.id;
  if (typeof id !== "string" || id.trim() === "") {
    fail(`items[${i}].id must be a non-empty string.`);
  }
  if (seen.has(id)) {
    fail(`Duplicate item id: "${id}".`);
  }
  seen.add(id);
}

const optionalArrays = ["recipes", "worldSpawns", "buildingPieces", "shops"];
for (const key of optionalArrays) {
  if (data[key] === undefined) continue;
  if (!Array.isArray(data[key])) {
    fail(`Field "${key}" must be an array when present.`);
  }
}

console.log(
  `[validate-content] OK — schemaVersion=${data.schemaVersion}, items=${data.items.length}`
);
process.exit(0);
