/**
 * ES: Valida JSON de escena v0.1 en `content/scenes/*.json` con @nexusworld3d/content-schema.
 * EN: Validates v0.1 scene JSON files under content/scenes/.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { safeParseSceneDocumentV0_1 } from "@nexusworld3d/content-schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scenesDir = join(__dirname, "..", "content", "scenes");

function fail(message: string): never {
  console.error(`[validate-scene] ${message}`);
  process.exit(1);
}

if (!existsSync(scenesDir)) {
  console.log(
    "[validate-scene] OK — no content/scenes/ directory (create it to add scene JSON)."
  );
  process.exit(0);
}

const names = readdirSync(scenesDir).filter((n) => n.endsWith(".json"));
if (names.length === 0) {
  console.log("[validate-scene] OK — no .json files in content/scenes/");
  process.exit(0);
}

for (const name of names) {
  const path = join(scenesDir, name);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (e) {
    fail(
      `${name} — invalid JSON — ${e instanceof Error ? e.message : String(e)}`
    );
  }
  const r = safeParseSceneDocumentV0_1(raw);
  if (!r.success) {
    const msg = r.error.flatten();
    fail(`${name} — schema — ${JSON.stringify(msg, null, 2)}`);
  }
  console.log(
    `[validate-scene] OK — ${name} worldId=${r.data.worldId} entities=${r.data.entities.length}`
  );
}

console.log(`[validate-scene] OK — ${names.length} file(s)`);
process.exit(0);
