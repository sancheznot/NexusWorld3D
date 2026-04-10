import { z } from "zod";

/**
 * ES: Esquema Zod para `content/manifest.json` v1 (extensible con claves extra).
 * EN: Zod schema for content manifest v1 (passthrough for forward-compatible keys).
 */
export const contentManifestV1Schema = z
  .object({
    schemaVersion: z.number().int().min(1),
    items: z.array(
      z.object({
        id: z.string().min(1, "item id must be non-empty"),
      })
    ),
    recipes: z.array(z.unknown()).optional(),
    worldSpawns: z.array(z.unknown()).optional(),
    buildingPieces: z.array(z.unknown()).optional(),
    shops: z.array(z.unknown()).optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const ids = data.items.map((r) => r.id);
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      if (seen.has(ids[i])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate item id: "${ids[i]}"`,
          path: ["items", i, "id"],
        });
        return;
      }
      seen.add(ids[i]);
    }
  });

export type ContentManifestV1 = z.infer<typeof contentManifestV1Schema>;

export function parseContentManifestV1(data: unknown): ContentManifestV1 {
  return contentManifestV1Schema.parse(data);
}

export function safeParseContentManifestV1(
  data: unknown
): z.SafeParseReturnType<unknown, ContentManifestV1> {
  return contentManifestV1Schema.safeParse(data);
}
