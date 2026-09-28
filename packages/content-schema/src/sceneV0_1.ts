import { z } from "zod";
import { sceneBoxPropsSchema } from './sceneBox';
import { sceneModelPropsSchema } from './sceneModel';
import { isSceneGroup, resolveSceneWorldEntities } from './sceneHierarchy';

const componentTypeRegex = /^(nexus|game):[a-zA-Z0-9._-]+$/;

const finite = z.number().finite();
const vec3 = z.tuple([finite, finite, finite]);
export const sceneSpawnV0_1Schema = z.object({
  mapId: z.literal('exterior'),
  // Player body center: at least one capsule half-height above the preview ground.
  position: z.tuple([finite.min(-1e6).max(1e6), finite.min(1.05).max(1e6), finite.min(-1e6).max(1e6)]),
  yaw: finite.min(-Math.PI * 2).max(Math.PI * 2),
}).strict();
const quat = z.tuple([finite, finite, finite, finite]).refine(
  q => Math.abs(Math.hypot(...q) - 1) < 0.001, 'Rotation must be a unit quaternion'
);

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
    spawn: sceneSpawnV0_1Schema.optional(),
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
    const byId = new Map(data.entities.map(entity => [entity.id, entity]));
    for (let i = 0; i < data.entities.length; i++) {
      const p = data.entities[i].parentId;
      if (p != null && !idSet.has(p)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown parentId "${p}" for entity "${data.entities[i].id}"`,
          path: ["entities", i, "parentId"],
        });
        return;
      }
    }
    // Iterative ancestry walk: reject self-parenting and cycles without recursive overflow.
    const parents = new Map(data.entities.map(e => [e.id, e.parentId]));
    const complete = new Set<string>();
    for (const entity of data.entities) {
      const path = new Set<string>();
      let current: string | null = entity.id;
      while (current !== null && parents.has(current) && !complete.has(current)) {
        if (path.has(current)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Parent cycle at "${current}"`, path: ['entities'] });
          return;
        }
        path.add(current);
        current = parents.get(current) ?? null;
      }
      for (const id of path) complete.add(id);
      const boxes = entity.components.filter(c => c.type === 'nexus:box');
      const models = entity.components.filter(c => c.type === 'nexus:model');
      const groups = entity.components.filter(c => c.type === 'nexus:group');
      if (entity.parentId !== null && (!isSceneGroup(byId.get(entity.parentId)!) ||
          ![...boxes, ...models, ...groups].length || entity.components.some(c => !['nexus:box', 'nexus:model', 'nexus:group'].includes(c.type)))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Only groups may parent groups, boxes or models; other components must remain at root', path: ['entities'] });
      }
      if (groups.length && (groups.length !== 1 || entity.components.length !== 1 || Object.keys(groups[0].props).length !== 0 ||
          entity.transform.position.some(p => Math.abs(p) > 1e6) || entity.transform.scale.some(s => s < 0.01 || s > 1000) ||
          entity.transform.scale.some(s => s !== entity.transform.scale[0]))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Groups require one empty nexus:group component and positive uniform bounded scale', path: ['entities'] });
      }
      if (models.length) {
        const model = sceneModelPropsSchema.safeParse(models[0].props);
        if (models.length !== 1 || boxes.length || !model.success ||
            entity.components.some(c => c.type === 'nexus:resourceNode') ||
            entity.transform.position.some(p => Math.abs(p) > 1e6) ||
            entity.transform.scale.some(s => s < 0.01 || s > 1000) ||
            (model.success && model.data.colliders.some(c => c.size.some((s, i) => s * entity.transform.scale[i] > 1000) ||
              c.offset.some((s, i) => Math.abs(s * entity.transform.scale[i]) > 1000)))) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Entity "${entity.id}": invalid model or collider dimensions`, path: ['entities'] });
        }
      }
      if (!boxes.length) continue;
      const props = sceneBoxPropsSchema.safeParse(boxes[0].props);
      if (boxes.length !== 1 || !props.success ||
          entity.components.some(c => c.type === 'nexus:resourceNode') ||
          entity.transform.position.some(p => Math.abs(p) > 1e6) ||
          entity.transform.scale.some(s => s < 0.01 || s > 1000) ||
          (props.success && props.data.size.some((s, i) => s * entity.transform.scale[i] > 1000))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom,
          message: `Entity "${entity.id}": nexus:box requires one component, valid props and positive bounded dimensions`,
          path: ['entities'] });
      }
    }
    try {
      for (const entity of resolveSceneWorldEntities(data.entities)) {
        const box = entity.components.find(c => c.type === 'nexus:box');
        const model = entity.components.find(c => c.type === 'nexus:model');
        if (!box && !model && !isSceneGroup(entity)) continue;
        const scale = entity.transform.scale;
        const boxProps = box && sceneBoxPropsSchema.safeParse(box.props);
        const modelProps = model && sceneModelPropsSchema.safeParse(model.props);
        if (entity.transform.position.some(p => !Number.isFinite(p) || Math.abs(p) > 1e6) ||
            scale.some(s => !Number.isFinite(s) || s < 0.01 || s > 1000) ||
            (boxProps?.success && boxProps.data.size.some((s, i) => s * scale[i] > 1000)) ||
            (modelProps?.success && modelProps.data.colliders.some(c => c.size.some((s, i) => s * scale[i] > 1000) || c.offset.some((s, i) => Math.abs(s * scale[i]) > 1000)))) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Entity "${entity.id}": world transform or collider exceeds bounds`, path: ['entities'] });
        }
      }
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error instanceof Error ? error.message : 'Invalid hierarchy', path: ['entities'] });
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
