/**
 * ES: `registerWorldTool` — debe alinearse con `src/constants/frameworkWorldTools.ts` (ids + itemIds + userData).
 * EN: Align with `src/constants/frameworkWorldTools.ts`.
 */

import { WorldMessages } from "@nexusworld3d/protocol";
import { registerWorldTool } from "@nexusworld3d/engine-server";
import { FRAMEWORK_DEMO_GENERIC_WORLD_TOOL } from "@/constants/frameworkWorldTools";

registerWorldTool({
  id: FRAMEWORK_DEMO_GENERIC_WORLD_TOOL.id,
  itemIds: [...FRAMEWORK_DEMO_GENERIC_WORLD_TOOL.itemIds],
  clientTargetUserData: FRAMEWORK_DEMO_GENERIC_WORLD_TOOL.clientTargetUserData,
  serverOnUse({ client, toolId, payload }) {
    client.send(WorldMessages.GenericToolResult, {
      ok: true,
      toolId,
      note: "framework demo — tiene food_apple en inventario",
      targetId:
        typeof payload.targetId === "string" ? payload.targetId : undefined,
    });
  },
});
