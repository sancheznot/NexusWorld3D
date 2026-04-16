/**
 * ES: Persistencia atómica de `SceneDocumentV0_1` bajo `content/scenes/persisted/` (o `NEXUS_SCENE_PERSIST_DIR`).
 * EN: Atomic persistence for `SceneDocumentV0_1` under `content/scenes/persisted/` (or `NEXUS_SCENE_PERSIST_DIR`).
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
  return join(persistRootDir(), `${sanitizeWorldId(worldId)}.v0_1.json`);
}

export function writeSceneDocumentV0_1ToDisk(doc: SceneDocumentV0_1): void {
  const dir = persistRootDir();
  mkdirSync(dir, { recursive: true });
  const finalPath = persistedSceneFilePath(doc.worldId);
  const json = JSON.stringify(doc, null, 2) + "\n";
  const tmp = `${finalPath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, json, "utf8");
  renameSync(tmp, finalPath);
}

/**
 * ES: Lee y valida escena en disco; devuelve null si no existe o falla validación.
 * EN: Reads and validates on-disk scene; returns null if missing or invalid.
 */
export function tryLoadSceneDocumentV0_1FromDisk(
  worldId: string
): SceneDocumentV0_1 | null {
  const path = persistedSceneFilePath(worldId);
  if (!existsSync(path)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
  const parsed = safeParseSceneDocumentV0_1(raw);
  if (!parsed.success) return null;
  const sem = validateSceneDocumentSemanticsV0_1(parsed.data);
  if (!sem.ok) return null;
  return parsed.data;
}
