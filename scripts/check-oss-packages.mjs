#!/usr/bin/env node
/**
 * ES: Falla si `packages/*` contiene cadenas de marca del juego (criterio roadmap).
 * EN: Fails if `packages/*` contains game-specific brand strings (roadmap audit).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "packages");
if (!existsSync(root)) {
  console.error("[check-oss-packages] FAIL — missing packages/ directory");
  process.exit(1);
}

const FORBIDDEN = [
  /\bhotel\b/i,
  /\bhumboldt\b/i,
];

const EXT = /\.(ts|tsx|mts|cts|json|md)$/i;

/** @param {string} dir */
function walk(dir, out) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name === "node_modules" || name === "dist") continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile() && EXT.test(name)) out.push(p);
  }
}

const files = [];
if (existsSync(root) && statSync(root).isDirectory()) walk(root, files);

let hits = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      console.error(
        `[check-oss-packages] ${relative(join(__dirname, ".."), file)} — matches ${re}`
      );
      hits++;
    }
  }
}

if (hits > 0) {
  console.error(
    `[check-oss-packages] FAIL — ${hits} forbidden match(es) under packages/. Remove game-specific branding from published packages.`
  );
  process.exit(1);
}

console.log("[check-oss-packages] OK — scanned", files.length, "file(s) under packages/*");
process.exit(0);
