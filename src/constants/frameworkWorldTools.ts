/**
 * ES: Metadatos de `registerWorldTool` compartidos cliente/servidor (mismos ids que `server/bootstrap/gameWorldTools.ts`).
 * EN: Shared tool metadata — keep in sync with `server/bootstrap/gameWorldTools.ts`.
 */

export const FRAMEWORK_DEMO_GENERIC_WORLD_TOOL = {
  id: "framework:demo-generic-tool",
  itemIds: ["food_apple"] as const,
  clientTargetUserData: {
    key: "frameworkGenericTool",
    value: "demo",
  },
} as const;
