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
