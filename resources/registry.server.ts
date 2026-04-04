/**
 * ES: Recursos tardíos (después de ítems/tienda en la sala): tiempo, jobs, ejemplo.
 * EN: Late resources (after room items/shop): time, jobs, example.
 */

import type { CoreContext, RegisterServerResource } from "@resources/types";
import { registerTimeResource } from "@resources/time/server/register";
import { registerJobsResource } from "@resources/jobs/server/register";
import { registerExampleWelcomeServer } from "@resources/example-welcome/server/register";

const LATE_RESOURCES: RegisterServerResource[] = [
  registerTimeResource,
  registerJobsResource,
  registerExampleWelcomeServer,
];

export function attachLateServerResources(ctx: CoreContext): void {
  for (const register of LATE_RESOURCES) {
    register(ctx);
  }
}
