/**
 * ES: Falla si `packages/*` contiene cadenas de marca de juego (OSS boundary).
 * EN: Fails if workspace packages contain game-specific branding strings.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesRoot = join(__dirname, "..", "packages");

const FORBIDDEN = [/hotel/i, /humboldt/i];

function walk(dir: string, files: string[]): void {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === "node_modules" || name === "dist") continue;
    const p = join(dir, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(p, files);
    } else if (st.isFile() && /\.(ts|tsx|js|jsx|json|md)$/.test(name)) {
      files.push(p);
    }
  }
}

function fail(msg: string): never {
  console.error(`[check-package-boundaries] ${msg}`);
  process.exit(1);
}

if (!existsSync(packagesRoot) || !statSync(packagesRoot).isDirectory()) {
  fail(`Missing ${packagesRoot}`);
}

const files: string[] = [];
for (const name of readdirSync(packagesRoot)) {
  const pkgPath = join(packagesRoot, name);
  if (!statSync(pkgPath).isDirectory()) continue;
  walk(pkgPath, files);
}

let hits = 0;
for (const file of files) {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      console.error(`[check-package-boundaries] ${file} matches ${re}`);
      hits++;
    }
  }
}

if (hits > 0) {
  fail(`${hits} forbidden match(es) in packages/* — keep engine packages game-neutral.`);
}

console.log(
  `[check-package-boundaries] OK — scanned ${files.length} file(s) under packages/*`
);
