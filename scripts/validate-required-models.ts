/**
 * ES: Comprueba que existan los GLB/texturas listados en `content/required-models.json`.
 * EN: Ensures assets listed in `content/required-models.json` exist under `public/`.
 *
 * Uso / Usage:
 *   npm run validate-required-models              # tier boot (default)
 *   npm run validate-required-models -- --tier=demo
 *   npm run validate-required-models -- --tier=full --strict
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRequiredModels } from "../src/lib/assets/requiredModels";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const tierArg = args.find((a) => a.startsWith("--tier="));
const tierName = tierArg?.split("=")[1] ?? "boot";

function fail(message: string): never {
  console.error(`[validate-required-models] ${message}`);
  process.exit(1);
}

let result;
try {
  result = checkRequiredModels(repoRoot, tierName);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

for (const asset of result.missing) {
  const line = `Missing ${asset.path} → ${asset.url}`;
  if (strict) console.error(`[validate-required-models] ${line}`);
  else console.warn(`[validate-required-models] ${line}`);
}

for (const asset of result.optionalMissing) {
  console.warn(
    `[validate-required-models] Missing (optional) ${asset.path} → ${asset.url}`
  );
}

if (strict && result.missing.length > 0) {
  fail(
    `${result.missing.length} required asset(s) missing for tier "${tierName}". ` +
      `See docs/REQUIRED_MODELS.md`
  );
}

const totalChecked =
  result.present.length + result.missing.length + result.optionalMissing.length;

console.log(
  `[validate-required-models] OK — tier "${tierName}", checked ${totalChecked} asset(s)` +
    (result.missing.length > 0
      ? `, ${result.missing.length} required missing (warnings)`
      : "") +
    (result.optionalMissing.length > 0
      ? `, ${result.optionalMissing.length} optional missing`
      : "")
);
