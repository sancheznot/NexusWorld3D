"use client";

import { useCallback, useReducer } from 'react';
import type { SceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { createSceneEditorHistory, sceneEditorHistoryReducer, type SceneEditorAction } from '@/lib/sceneEditorHistory';

export function useSceneEditorHistory(initialDocument: SceneDocumentV0_1) {
  const [history, dispatch] = useReducer(sceneEditorHistoryReducer, initialDocument, createSceneEditorHistory);
  const setDoc = useCallback((update: Extract<SceneEditorAction, { type: 'edit' }>['update']) => dispatch({ type: 'edit', update }), []);
  const setSelectedId = useCallback((id: string | null) => dispatch({ type: 'select', id }), []);
  const replace = useCallback((document: SceneDocumentV0_1) => dispatch({ type: 'replace', document }), []);
  return { doc: history.present.document, selectedId: history.present.selectedId, setDoc, setSelectedId, replace,
    canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }) };
}
