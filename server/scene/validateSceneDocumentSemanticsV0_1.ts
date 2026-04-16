/**
 * ES: Validación semántica v0.1 tras Zod — ADR 0001 (nexus:* en aplicación a sala).
 * EN: Post-Zod semantic validation v0.1 — ADR 0001 (nexus:* when applying to room).
 */

import type { SceneDocumentV0_1 } from "@nexusworld3d/content-schema";
import { getWorldResourceNodeById } from "@/constants/worldResourceNodes";
import {
  getContentManifest,
  isDeclaredManifestItemId,
} from "@server/content/loadContentManifest";

export type SceneSemanticsResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateSceneDocumentSemanticsV0_1(
  doc: SceneDocumentV0_1
): SceneSemanticsResult {
  if (getContentManifest() === null) {
    return {
      ok: false,
      error: "content manifest not loaded — cannot validate scene semantics",
    };
  }

  for (const ent of doc.entities) {
    for (const c of ent.components) {
      if (c.type === "nexus:resourceNode") {
        const nodeId = (c.props as Record<string, unknown> | undefined)?.nodeId;
        if (typeof nodeId !== "string" || !nodeId.trim()) {
          return {
            ok: false,
            error: `entity "${ent.id}": nexus:resourceNode requires string props.nodeId`,
          };
        }
        const node = getWorldResourceNodeById(nodeId.trim());
        if (!node) {
          return {
            ok: false,
            error: `entity "${ent.id}": unknown resource node id "${nodeId}"`,
          };
        }
        for (const g of node.grants) {
          if (!isDeclaredManifestItemId(g.itemId)) {
            return {
              ok: false,
              error: `entity "${ent.id}" / node "${node.id}": grant itemId "${g.itemId}" not declared in content/manifest.json`,
            };
          }
        }
        continue;
      }

      if (c.type === "nexus:triggerSphere") {
        const r = (c.props as Record<string, unknown> | undefined)?.radius;
        if (typeof r !== "number" || !Number.isFinite(r) || r <= 0) {
          return {
            ok: false,
            error: `entity "${ent.id}": nexus:triggerSphere requires finite props.radius > 0`,
          };
        }
        continue;
      }

      if (c.type.startsWith("nexus:")) {
        return {
          ok: false,
          error: `entity "${ent.id}": unsupported nexus component "${c.type}" (add handler + ADR 0001)`,
        };
      }
    }
  }
  return { ok: true };
}
