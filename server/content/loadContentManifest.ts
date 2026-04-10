/**
 * ES: Carga `content/manifest.json` al arranque, valida y cachea en memoria.
 * EN: Loads content manifest at startup, validates, caches for the process.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS_CATALOG } from "@/constants/items";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type ContentManifestV1 = {
  schemaVersion: number;
  items: Array<{ id: string }>;
  recipes?: unknown[];
  worldSpawns?: unknown[];
  buildingPieces?: unknown[];
  shops?: unknown[];
};

let cachedManifest: ContentManifestV1 | null = null;
let declaredItemIds: ReadonlySet<string> | null = null;

function manifestPath(): string {
  return join(__dirname, "..", "..", "content", "manifest.json");
}

function validateStructure(data: unknown): ContentManifestV1 {
  if (!data || typeof data !== "object") {
    throw new Error("[content] manifest root must be an object");
  }
  const o = data as Record<string, unknown>;
  if (typeof o.schemaVersion !== "number" || o.schemaVersion < 1) {
    throw new Error('[content] "schemaVersion" must be a number >= 1');
  }
  if (!Array.isArray(o.items)) {
    throw new Error('[content] "items" must be an array');
  }
  const seen = new Set<string>();
  for (let i = 0; i < o.items.length; i++) {
    const row = o.items[i];
    if (!row || typeof row !== "object") {
      throw new Error(`[content] items[${i}] must be an object`);
    }
    const id = (row as { id?: unknown }).id;
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error(`[content] items[${i}].id must be a non-empty string`);
    }
    if (seen.has(id)) {
      throw new Error(`[content] duplicate item id: "${id}"`);
    }
    seen.add(id);
  }
  const optionalArrays = ["recipes", "worldSpawns", "buildingPieces", "shops"];
  for (const key of optionalArrays) {
    if (o[key] === undefined) continue;
    if (!Array.isArray(o[key])) {
      throw new Error(`[content] "${key}" must be an array when present`);
    }
  }
  return data as ContentManifestV1;
}

function assertItemsInCatalog(manifest: ContentManifestV1): void {
  const catalogKeys = new Set(Object.keys(ITEMS_CATALOG));
  for (const row of manifest.items) {
    if (!catalogKeys.has(row.id)) {
      throw new Error(
        `[content] manifest item "${row.id}" is not defined in ITEMS_CATALOG (src/constants/items.ts)`
      );
    }
  }
}

/**
 * ES: Carga y valida el manifest una vez; lanza si el archivo falta o es inválido.
 * EN: Load and validate manifest once; throws if missing or invalid.
 */
export function loadContentManifestOrThrow(): ContentManifestV1 {
  if (cachedManifest) return cachedManifest;

  const path = manifestPath();
  if (!existsSync(path)) {
    throw new Error(`[content] Missing manifest: ${path}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (e) {
    throw new Error(
      `[content] Invalid JSON in manifest: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  const manifest = validateStructure(raw);
  assertItemsInCatalog(manifest);

  cachedManifest = manifest;
  declaredItemIds = new Set(manifest.items.map((r) => r.id));

  console.log(
    `[content] manifest v${manifest.schemaVersion} loaded — ${manifest.items.length} item ids (runtime)`
  );

  return manifest;
}

/** ES: Manifest ya cargado, o `null` si aún no se llamó `loadContentManifestOrThrow`. */
export function getContentManifest(): ContentManifestV1 | null {
  return cachedManifest;
}

/** ES: ¿El ítem está declarado en el manifest? (subset publicado / data-driven). */
export function isDeclaredManifestItemId(itemId: string): boolean {
  if (!declaredItemIds) return false;
  return declaredItemIds.has(itemId);
}
