/**
 * ES: Registro en proceso — aplicar / leer / fusionar escena v0.1 en `NexusWorldRoom` vía HTTP monitor.
 * EN: In-process registry — apply / read / merge v0.1 scene on NexusWorldRoom via monitor HTTP.
 */

import type { SceneDocumentV0_1 } from "@nexusworld3d/content-schema";

export type SceneAuthoringHandlerResult =
  | { ok: true; worldId: string; entityCount: number }
  | { ok: false; error: string };

export type SceneAuthoringApplyResult =
  | { ok: true; roomId: string; worldId: string; entityCount: number }
  | { ok: false; error: string };

export type SceneAuthoringGetResult =
  | { ok: true; roomId: string; document: SceneDocumentV0_1 | null }
  | { ok: false; error: string };

type Handlers = {
  /** ES: Nombre de plantilla Colyseus (`gameServer.define(…)`), p. ej. `nexus-world` o `nexus-world-staging`. EN: Colyseus room template name. */
  colyseusRoomTypeName: string;
  apply: (raw: unknown) => SceneAuthoringHandlerResult;
  getDocument: () => SceneDocumentV0_1 | null;
  mergeEntities: (raw: unknown) => SceneAuthoringHandlerResult;
};

const byRoomId = new Map<string, Handlers>();

function envTruthy(v: string | undefined): boolean {
  const t = v?.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}

/** ES: Si está activo, solo se permiten mutaciones (apply/merge) en la plantilla de staging. EN: When set, apply/merge only on the staging room template. */
export function isSceneAuthoringStagingOnlyMode(): boolean {
  return envTruthy(process.env.NEXUS_SCENE_AUTHORING_STAGING_ONLY);
}

export function getStagingWorldRoomTypeName(): string {
  return process.env.NEXUS_STAGING_WORLD_ROOM_NAME?.trim() || "nexus-world-staging";
}

function assertSceneAuthoringMutationsAllowed(
  colyseusRoomTypeName: string
): { ok: true } | { ok: false; error: string } {
  if (!isSceneAuthoringStagingOnlyMode()) return { ok: true };
  if (colyseusRoomTypeName === getStagingWorldRoomTypeName()) return { ok: true };
  return { ok: false, error: "scene_authoring_staging_only" };
}

export function registerNexusWorldRoomSceneAuthoring(
  roomId: string,
  handlers: Handlers
): void {
  byRoomId.set(roomId, handlers);
}

export function unregisterNexusWorldRoomSceneAuthoring(roomId: string): void {
  byRoomId.delete(roomId);
}

export function listSceneAuthoringRoomIds(): string[] {
  return [...byRoomId.keys()];
}

function resolveTargetRoomId(
  roomId: string | undefined
): { ok: true; roomId: string } | { ok: false; error: string } {
  const ids = listSceneAuthoringRoomIds();
  if (ids.length === 0) {
    return { ok: false, error: "no_nexus_world_room" };
  }
  let target = roomId?.trim() || "";
  if (!target) {
    if (ids.length !== 1) {
      return { ok: false, error: "roomId_required_when_multiple_rooms" };
    }
    target = ids[0]!;
  }
  return { ok: true, roomId: target };
}

/**
 * ES: Si `roomId` falta y solo hay una sala registrada, usa esa.
 * EN: If `roomId` is missing and exactly one room is registered, use it.
 */
export function applySceneDocumentToNexusWorldRoom(
  roomId: string | undefined,
  raw: unknown
): SceneAuthoringApplyResult {
  const r = resolveTargetRoomId(roomId);
  if (!r.ok) return { ok: false, error: r.error };
  const h = byRoomId.get(r.roomId);
  if (!h) {
    return { ok: false, error: "room_not_found" };
  }
  const guard = assertSceneAuthoringMutationsAllowed(h.colyseusRoomTypeName);
  if (!guard.ok) return guard;
  const out = h.apply(raw);
  if (out.ok) {
    return { ok: true, roomId: r.roomId, worldId: out.worldId, entityCount: out.entityCount };
  }
  return out;
}

export function getSceneDocumentFromNexusWorldRoom(
  roomId: string | undefined
): SceneAuthoringGetResult {
  const r = resolveTargetRoomId(roomId);
  if (!r.ok) return { ok: false, error: r.error };
  const h = byRoomId.get(r.roomId);
  if (!h) {
    return { ok: false, error: "room_not_found" };
  }
  return { ok: true, roomId: r.roomId, document: h.getDocument() };
}

export function mergeSceneEntitiesToNexusWorldRoom(
  roomId: string | undefined,
  raw: unknown
): SceneAuthoringApplyResult {
  const r = resolveTargetRoomId(roomId);
  if (!r.ok) return { ok: false, error: r.error };
  const h = byRoomId.get(r.roomId);
  if (!h) {
    return { ok: false, error: "room_not_found" };
  }
  const guard = assertSceneAuthoringMutationsAllowed(h.colyseusRoomTypeName);
  if (!guard.ok) return guard;
  const out = h.mergeEntities(raw);
  if (out.ok) {
    return { ok: true, roomId: r.roomId, worldId: out.worldId, entityCount: out.entityCount };
  }
  return out;
}
