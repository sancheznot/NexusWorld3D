import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { persistedSceneFilePath, tryLoadSceneDocumentV0_1FromDisk } from './persistSceneDocumentV0_1';
import { nexusWorld3DConfig } from '@repo/nexusworld3d.config';
import { assertScenePlayable } from './scenePlayable';

export const publicWorldSchema = z.object({
  worldId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
  public: z.boolean(),
}).strict();
export type PublicWorld = z.infer<typeof publicWorldSchema>;
function directory() { return join(dirname(persistedSceneFilePath('')), 'world-access'); }
function path(worldId: string) {
  if (!publicWorldSchema.shape.worldId.safeParse(worldId).success) throw new Error('invalid_world_id');
  return join(directory(), `${worldId}.json`);
}
export function readWorldAccess(worldId: string): PublicWorld | null {
  try {
    const value = publicWorldSchema.parse(JSON.parse(readFileSync(path(worldId), 'utf8')));
    return value.worldId === worldId ? value : null;
  } catch { return null; }
}
export function readPublicWorld(worldId: string): PublicWorld | null {
  const world = readWorldAccess(worldId);
  if (!world?.public) return null;
  const scene = tryLoadSceneDocumentV0_1FromDisk(worldId);
  if (!scene) return null;
  try { assertScenePlayable(scene); return world; } catch { return null; }
}
export function listPublicWorlds(): PublicWorld[] {
  if (!existsSync(directory())) return [];
  return readdirSync(directory()).filter(file => file.endsWith('.json'))
    .map(file => readPublicWorld(file.slice(0, -5))).filter((world): world is PublicWorld => !!world)
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function saveWorldAccess(raw: unknown): PublicWorld {
  const world = publicWorldSchema.parse(raw);
  if (world.worldId === nexusWorld3DConfig.worlds.default) throw new Error('default_world_uses_existing_portal');
  if (world.public) {
    const scene = tryLoadSceneDocumentV0_1FromDisk(world.worldId);
    if (!scene) throw new Error('publish_valid_scene_first');
    assertScenePlayable(scene);
  }
  const target = path(world.worldId);
  mkdirSync(directory(), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try { writeFileSync(temporary, JSON.stringify(world), { flag: 'wx' }); renameSync(temporary, target); }
  finally { rmSync(temporary, { force: true }); }
  return world;
}
