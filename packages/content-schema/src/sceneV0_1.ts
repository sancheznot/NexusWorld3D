import { z } from "zod";

const componentTypeRegex = /^(nexus|game):[a-zA-Z0-9._-]+$/;

const vec3 = z.tuple([z.number(), z.number(), z.number()]);
const quat = z.tuple([z.number(), z.number(), z.number(), z.number()]);

const sceneComponentV0_1 = z.object({
  type: z
    .string()
    .min(1)
    .refine((s) => componentTypeRegex.test(s), {
      message:
        'Component type must match "nexus:name" or "game:name" (letters, digits, ._-)',
    }),
  props: z.record(z.unknown()).optional().default({}),
});

/** ES: Una entidad v0.1 (parche incremental o documento completo). EN: Single v0.1 entity. */
export const sceneEntityV0_1Schema = z.object({
  id: z.string().min(1, "entity id required"),
  parentId: z.string().min(1).nullable(),
  transform: z.object({
    position: vec3,
    rotation: quat,
    scale: vec3,
  }),
  components: z.array(sceneComponentV0_1).default([]),
});

/**
 * ES: Documento de escena v0.1 (editor admin / serialización).
 * EN: Scene document v0.1 — admin editor & serialization.
 */
export const sceneDocumentV0_1Schema = z
  .object({
    schemaVersion: z.literal(1),
    worldId: z.string().min(1, "worldId required"),
    entities: z.array(sceneEntityV0_1Schema),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const ids = data.entities.map((e) => e.id);
    const seen = new Set<string>();
    for (let i = 0; i < ids.length; i++) {
      if (seen.has(ids[i])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate entity id: "${ids[i]}"`,
          path: ["entities", i, "id"],
        });
        return;
      }
      seen.add(ids[i]);
    }
    const idSet = new Set(ids);
    for (let i = 0; i < data.entities.length; i++) {
      const p = data.entities[i].parentId;
      if (p != null && !idSet.has(p)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown parentId "${p}" for entity "${data.entities[i].id}"`,
          path: ["entities", i, "parentId"],
        });
      }
    }
  });

export type SceneDocumentV0_1 = z.infer<typeof sceneDocumentV0_1Schema>;
export type SceneEntityV0_1 = z.infer<typeof sceneEntityV0_1Schema>;
export type SceneComponentV0_1 = z.infer<typeof sceneComponentV0_1>;

export function parseSceneDocumentV0_1(data: unknown): SceneDocumentV0_1 {
  return sceneDocumentV0_1Schema.parse(data);
}

export function safeParseSceneDocumentV0_1(
  data: unknown
): z.SafeParseReturnType<unknown, SceneDocumentV0_1> {
  return sceneDocumentV0_1Schema.safeParse(data);
}
