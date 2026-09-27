import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { parseSceneDocumentV0_1, type SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { persistedSceneFilePath, tryLoadSceneDocumentV0_1FromDisk, writeSceneDocumentV0_1ToDisk } from './persistSceneDocumentV0_1';
import { validateSceneDocumentSemanticsV0_1 } from './validateSceneDocumentSemanticsV0_1';
import type { SceneLibraryState } from '@/types/sceneLibrary.types';

const revisionPattern = /^[a-f0-9]{64}$/;
export class SceneLibraryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function sceneRevision(document: SceneDocumentV0_1) {
  return createHash('sha256').update(JSON.stringify(document)).digest('hex');
}
function paths(worldId: string) {
  const root = `${persistedSceneFilePath(worldId)}.authoring`;
  return { draft: join(root, 'draft.json'), revisions: join(root, 'revisions') };
}
function validate(raw: unknown, worldId: string) {
  const document = parseSceneDocumentV0_1(raw);
  if (document.worldId !== worldId) throw new SceneLibraryError('scene_world_mismatch');
  const semantics = validateSceneDocumentSemanticsV0_1(document);
  if (!semantics.ok) throw new SceneLibraryError(semantics.error);
  return document;
}
function atomicWrite(path: string, document: SceneDocumentV0_1) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify(document, null, 2), { flag: 'wx' });
    renameSync(temporary, path);
  } finally { rmSync(temporary, { force: true }); }
}
function archive(document: SceneDocumentV0_1) {
  const dir = paths(document.worldId).revisions;
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${sceneRevision(document)}.json`);
  if (!existsSync(file)) atomicWrite(file, document);
}
export function readSceneLibrary(worldId: string): SceneLibraryState {
  const locations = paths(worldId);
  const draft = existsSync(locations.draft) ? validate(JSON.parse(readFileSync(locations.draft, 'utf8')), worldId) : null;
  const published = tryLoadSceneDocumentV0_1FromDisk(worldId);
  if (!published && existsSync(persistedSceneFilePath(worldId))) throw new SceneLibraryError('published_scene_invalid', 409);
  const revisions = existsSync(locations.revisions) ? readdirSync(locations.revisions)
    .filter(name => revisionPattern.test(name.replace(/\.json$/, '')) && name.endsWith('.json'))
    .map(name => ({ revision: name.slice(0, -5), createdAt: statSync(join(locations.revisions, name)).mtime.toISOString() }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100) : [];
  return { worldId, draft, draftRevision: draft ? sceneRevision(draft) : null,
    published, publishedRevision: published ? sceneRevision(published) : null, revisions };
}

/** Synchronous compare-and-write within one game-server process; not a distributed lock. */
export function executeSceneLibraryCommand(raw: unknown): SceneLibraryState {
  if (!raw || typeof raw !== 'object') throw new SceneLibraryError('invalid_command');
  const body = raw as Record<string, unknown>;
  if (typeof body.worldId !== 'string' || !body.worldId.trim() || body.worldId.length > 256) throw new SceneLibraryError('invalid_world_id');
  const worldId = body.worldId;
  const state = readSceneLibrary(worldId);
  if (body.action === 'read') return state;
  if (!['save-draft', 'publish', 'restore'].includes(String(body.action))) throw new SceneLibraryError('invalid_action');
  if (body.expectedRevision !== null && (typeof body.expectedRevision !== 'string' || !revisionPattern.test(body.expectedRevision))) {
    throw new SceneLibraryError('expected_revision_required');
  }
  const current = body.action === 'save-draft' ? state.draftRevision : state.publishedRevision;
  if (body.expectedRevision !== current) throw new SceneLibraryError('revision_conflict_refresh_before_saving', 409);
  let document: SceneDocumentV0_1;
  if (body.action === 'restore') {
    if (typeof body.revision !== 'string' || !revisionPattern.test(body.revision)) throw new SceneLibraryError('invalid_revision');
    const path = join(paths(worldId).revisions, `${body.revision}.json`);
    if (!existsSync(path)) throw new SceneLibraryError('revision_not_found', 404);
    document = validate(JSON.parse(readFileSync(path, 'utf8')), worldId);
    if (sceneRevision(document) !== body.revision) throw new SceneLibraryError('revision_corrupt', 409);
  } else document = validate(body.document, worldId);
  if (body.action === 'save-draft') atomicWrite(paths(worldId).draft, document);
  else {
    if (state.published) archive(state.published);
    archive(document);
    writeSceneDocumentV0_1ToDisk(document);
  }
  return readSceneLibrary(worldId);
}
