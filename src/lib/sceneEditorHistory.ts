import type { SceneDocumentV0_1 } from '@nexusworld3d/content-schema';

export const SCENE_HISTORY_LIMIT = 50;
export interface SceneEditorSnapshot { document: SceneDocumentV0_1; selectedId: string | null }
export interface SceneEditorHistory {
  past: SceneEditorSnapshot[];
  present: SceneEditorSnapshot;
  future: SceneEditorSnapshot[];
}
export type SceneEditorAction =
  | { type: 'edit'; update: SceneDocumentV0_1 | ((document: SceneDocumentV0_1) => SceneDocumentV0_1) }
  | { type: 'select'; id: string | null }
  | { type: 'replace'; document: SceneDocumentV0_1 }
  | { type: 'undo' | 'redo' };

export function createSceneEditorHistory(document: SceneDocumentV0_1): SceneEditorHistory {
  return { past: [], present: { document: structuredClone(document), selectedId: document.entities[0]?.id ?? null }, future: [] };
}

/** Documents are immutable. Selection alone never creates an undo step. */
export function sceneEditorHistoryReducer(state: SceneEditorHistory, action: SceneEditorAction): SceneEditorHistory {
  switch (action.type) {
    case 'replace': return createSceneEditorHistory(action.document);
    case 'select': {
      const selectedId = state.present.document.entities.some(entity => entity.id === action.id) ? action.id : null;
      return selectedId === state.present.selectedId ? state : { ...state, present: { ...state.present, selectedId } };
    }
    case 'undo': {
      const previous = state.past.at(-1);
      return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state;
    }
    case 'redo': {
      const next = state.future[0];
      return next ? { past: [...state.past, state.present].slice(-SCENE_HISTORY_LIMIT), present: next, future: state.future.slice(1) } : state;
    }
    case 'edit': {
      const document = typeof action.update === 'function' ? action.update(state.present.document) : action.update;
      if (document === state.present.document || JSON.stringify(document) === JSON.stringify(state.present.document)) return state;
      const selectedId = document.entities.some(entity => entity.id === state.present.selectedId) ? state.present.selectedId : null;
      return { past: [...state.past, state.present].slice(-SCENE_HISTORY_LIMIT), present: { document, selectedId }, future: [] };
    }
  }
}
