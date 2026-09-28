import { isSceneGroup, parseSceneDocumentV0_1, resolveSceneWorldEntities, sceneTransformRelativeTo,
  type SceneDocumentV0_1, type SceneEntityV0_1 } from '@nexusworld3d/content-schema';

export function sceneSubtreeIds(document: SceneDocumentV0_1, id: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const entity of document.entities) {
    if (entity.parentId === null) continue;
    const list = children.get(entity.parentId) ?? [];
    list.push(entity.id); children.set(entity.parentId, list);
  }
  const ids = new Set<string>(), queue = [id];
  for (let i = 0; i < queue.length; i++) {
    if (ids.has(queue[i])) continue;
    ids.add(queue[i]); queue.push(...children.get(queue[i]) ?? []);
  }
  return ids;
}

export function reparentSceneEntity(document: SceneDocumentV0_1, id: string, parentId: string | null) {
  const entity = document.entities.find(item => item.id === id);
  if (!entity) throw new Error('Objeto no encontrado');
  if (entity.parentId === parentId) return document;
  const subtree = sceneSubtreeIds(document, id);
  const world = new Map(resolveSceneWorldEntities(document.entities).map(item => [item.id, item]));
  const parent = parentId === null ? undefined : world.get(parentId);
  if (parentId !== null && (!parent || !isSceneGroup(parent) || subtree.has(parentId))) throw new Error('Grupo padre inválido');
  const transform = parent ? sceneTransformRelativeTo(world.get(id)!.transform, parent.transform) : world.get(id)!.transform;
  return parseSceneDocumentV0_1({ ...document, entities: document.entities.map(item => item.id === id ? { ...item, parentId, transform } : item) });
}

export function createSceneGroup(document: SceneDocumentV0_1, id: string) {
  const entity: SceneEntityV0_1 = { id, parentId: null,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    components: [{ type: 'nexus:group', props: {} }] };
  return parseSceneDocumentV0_1({ ...document, entities: [...document.entities, entity] });
}

export function removeSceneSubtree(document: SceneDocumentV0_1, id: string) {
  const ids = sceneSubtreeIds(document, id);
  return parseSceneDocumentV0_1({ ...document, entities: document.entities.filter(entity => !ids.has(entity.id)) });
}

export function duplicateSceneSubtree(document: SceneDocumentV0_1, id: string, newId: () => string) {
  const ids = sceneSubtreeIds(document, id);
  if (!document.entities.some(entity => entity.id === id)) throw new Error('Objeto no encontrado');
  const copies = structuredClone(document.entities.filter(entity => ids.has(entity.id)));
  const replacements = new Map(copies.map(entity => [entity.id, newId()]));
  for (const entity of copies) {
    entity.id = replacements.get(entity.id)!;
    if (entity.parentId !== null && replacements.has(entity.parentId)) entity.parentId = replacements.get(entity.parentId)!;
  }
  // Exact pose copy avoids crossing world/local bounds; the author can move it explicitly.
  return { document: parseSceneDocumentV0_1({ ...document, entities: [...document.entities, ...copies] }), selectedId: replacements.get(id)! };
}
