/**
 * ES: Valores de marca y mundo por defecto (desde nexusworld3d.config + env).
 * EN: Branding and default world values (from nexusworld3d.config + env).
 */

import { nexusWorld3DConfig } from "@repo/nexusworld3d.config";

export const frameworkAppName = nexusWorld3DConfig.branding.appName;
export const frameworkAppDescription = nexusWorld3DConfig.branding.description;
export const frameworkDefaultWorldId = nexusWorld3DConfig.worlds.default;
export const frameworkDefaultWorldDisplayName =
  nexusWorld3DConfig.branding.defaultWorldDisplayName;
export const frameworkColyseusRoomName =
  nexusWorld3DConfig.networking.colyseusRoomName;

export const frameworkLobbyRoomName =
  nexusWorld3DConfig.networking.colyseusLobbyRoomName;

/**
 * ES: `userData.buildingName` del edificio demo grande (GLB + física).
 * EN: `userData.buildingName` for the large demo landmark (GLB + physics).
 */
export const frameworkDemoLandmarkBuildingUserDataName = "NexusDemoLandmark";

/**
 * ES: Id interno del collider de caja del demo (Cannon).
 * EN: Internal box-collider id for the demo (Cannon).
 */
export const frameworkDemoLandmarkColliderId = "nexus-demo-landmark";
