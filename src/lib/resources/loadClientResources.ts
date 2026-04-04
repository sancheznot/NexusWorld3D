/**
 * ES: Carga recursos cliente declarados bajo resources/ (subcarpetas client).
 * EN: Loads client resources declared under resources/ (client subfolders).
 */

import { registerExampleWelcomeClient } from "@resources/example-welcome/client/register";

const CLIENT_REGISTERS: Array<() => void> = [registerExampleWelcomeClient];

export function loadAllClientResources(): void {
  for (const register of CLIENT_REGISTERS) {
    register();
  }
}
