/**
 * ES: Persistencia atómica de `SceneDocumentV0_1` bajo `content/scenes/persisted/` (o `NEXUS_SCENE_PERSIST_DIR`).
 * EN: Atomic persistence for `SceneDocumentV0_1` under `content/scenes/persisted/` (or `NEXUS_SCENE_PERSIST_DIR`).
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, rmSync } from "node:fs";
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from "node:path";
import {
  safeParseSceneDocumentV0_1,
  type SceneDocumentV0_1,
} from "@nexusworld3d/content-schema";
import { validateSceneDocumentSemanticsV0_1 } from "@server/scene/validateSceneDocumentSemanticsV0_1";

function persistRootDir(): string {
  const fromEnv = process.env.NEXUS_SCENE_PERSIST_DIR?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "content", "scenes", "persisted");
}

function sanitizeWorldId(worldId: string): string {
  const s = worldId.trim();
  if (!s) return "default";
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export function persistedSceneFilePath(worldId: string): string {
  const key = createHash('sha256').update(worldId, 'utf8').digest('hex');
  // Separate namespace avoids collisions with any existing legacy basename.
  return join(persistRootDir(), 'by-world-id-v1', `${key}.v0_1.json`);
}

export function writeSceneDocumentV0_1ToDisk(doc: SceneDocumentV0_1): void {
  const finalPath = persistedSceneFilePath(doc.worldId);
  mkdirSync(dirname(finalPath), { recursive: true });
  const json = JSON.stringify(doc, null, 2) + "\n";
  const tmp = `${finalPath}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tmp, json, { encoding: 'utf8', flag: 'wx' });
    renameSync(tmp, finalPath);
  } finally {
    rmSync(tmp, { force: true });
  }
}

/**
 * ES: Lee y valida escena en disco; devuelve null si no existe o falla validación.
 * EN: Reads and validates on-disk scene; returns null if missing or invalid.
 */
export function tryLoadSceneDocumentV0_1FromDisk(
  worldId: string
): SceneDocumentV0_1 | null {
  const currentPath = persistedSceneFilePath(worldId);
  // Read-only migration: never overwrite or rename a legacy file belonging to another ID.
  const path = existsSync(currentPath) ? currentPath
    : join(persistRootDir(), `${sanitizeWorldId(worldId)}.v0_1.json`);
  if (!existsSync(path)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
  const parsed = safeParseSceneDocumentV0_1(raw);
  if (!parsed.success) return null;
  if (parsed.data.worldId !== worldId) return null;
  const sem = validateSceneDocumentSemanticsV0_1(parsed.data);
  if (!sem.ok) return null;
  return parsed.data;
}
