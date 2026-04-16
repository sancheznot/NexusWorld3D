import {
  getStagingWorldRoomTypeName,
  isSceneAuthoringStagingOnlyMode,
} from "@server/metrics/nexusWorldRoomSceneAuthoringRegistry";

/** ES: Escritura JSON en disco habilitada. EN: JSON persistence to disk enabled. */
export function isScenePersistToDiskEnabled(): boolean {
  const v = process.env.NEXUS_SCENE_PERSIST_ENABLE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** ES: Cargar escena persistida al crear la sala. EN: Load persisted scene on room create. */
export function isSceneLoadPersistedEnabled(): boolean {
  const v = process.env.NEXUS_SCENE_LOAD_PERSISTED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** ES: Si true, solo persistir mutaciones en la plantilla staging (mismo criterio que apply). EN: If set, only persist on staging template. */
export function isScenePersistStagingOnly(): boolean {
  const v = process.env.NEXUS_SCENE_PERSIST_ONLY_STAGING?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * ES: ¿Puede esta plantilla Colyseus persistir escena en disco?
 * EN: May this Colyseus room template persist scene JSON?
 */
export function scenePersistAllowedForRoomTemplate(
  colyseusRoomTypeName: string
): boolean {
  if (!isScenePersistToDiskEnabled()) return false;
  if (!isScenePersistStagingOnly()) return true;
  return colyseusRoomTypeName === getStagingWorldRoomTypeName();
}

/**
 * ES: Coherencia con `NEXUS_SCENE_AUTHORING_STAGING_ONLY`: no persistir en prod si las mutaciones ya están bloqueadas.
 * EN: Align with staging-only authoring — avoid writing when mutations are blocked elsewhere.
 */
export function scenePersistConsistentWithStagingGuard(
  colyseusRoomTypeName: string
): boolean {
  if (!isSceneAuthoringStagingOnlyMode()) return true;
  return colyseusRoomTypeName === getStagingWorldRoomTypeName();
}
