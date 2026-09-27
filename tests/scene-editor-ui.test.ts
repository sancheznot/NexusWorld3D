import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import SceneNumberInput from '../src/components/admin/SceneNumberInput';
import { useSceneEditorHistory } from '../src/hooks/useSceneEditorHistory';
import { parseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';

test('numeric editor commits only complete values, rejects invalid input and follows undo values', async () => {
  const env = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previous = env.IS_REACT_ACT_ENVIRONMENT;
  env.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  const commits: number[] = [];
  const props = { label: 'Escala X', value: 1, min: 0.01, max: 500, onCommit: (value: number) => commits.push(value) };
  try {
    await act(async () => { renderer = create(React.createElement(SceneNumberInput, props)); });
    const input = () => renderer!.root.findByType('input');
    await act(async () => { input().props.onChange({ target: { value: '12' } }); });
    assert.deepEqual(commits, []);
    await act(async () => { input().props.onBlur(); });
    assert.deepEqual(commits, [12]);
    for (const value of ['', '-1', '501', 'Infinity']) {
      await act(async () => { input().props.onChange({ target: { value } }); });
      await act(async () => { input().props.onBlur(); });
      assert.equal(input().props['aria-invalid'], true);
      assert.equal(input().props.value, '1');
    }
    assert.deepEqual(commits, [12]);
    await act(async () => { renderer!.update(React.createElement(SceneNumberInput, { ...props, value: 3 })); });
    assert.equal(input().props.value, '3');
    await act(async () => { input().props.onChange({ target: { value: '24' } }); });
    await act(async () => { input().props.onKeyDown({ key: 'Escape', stopPropagation() {} }); });
    assert.equal(input().props.value, '3');
    let blurred = false;
    await act(async () => { input().props.onKeyDown({ key: 'Enter', preventDefault() {}, currentTarget: { blur() { blurred = true; } } }); });
    assert.equal(blurred, true);
  } finally {
    if (renderer) await act(async () => renderer!.unmount());
    env.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});

test('React history hook batches edit and selection, then resets for another source', async () => {
  const env = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previous = env.IS_REACT_ACT_ENVIRONMENT;
  env.IS_REACT_ACT_ENVIRONMENT = true;
  const initial = parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'hook-test', entities: [] });
  let state!: ReturnType<typeof useSceneEditorHistory>;
  let renderer: ReactTestRenderer | undefined;
  function Harness() { state = useSceneEditorHistory(initial); return null; }
  try {
    await act(async () => { renderer = create(React.createElement(Harness)); });
    const entity = { id: 'box', parentId: null, transform: { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0, 1] as [number, number, number, number], scale: [1, 1, 1] as [number, number, number] }, components: [] };
    await act(async () => { state.setDoc(doc => ({ ...doc, entities: [entity] })); state.setSelectedId('box'); });
    assert.equal(state.selectedId, 'box');
    assert.equal(state.canUndo, true);
    await act(async () => state.undo());
    assert.equal(state.doc.entities.length, 0);
    await act(async () => state.redo());
    assert.equal(state.selectedId, 'box');
    await act(async () => state.replace({ ...initial, worldId: 'new-world' }));
    assert.equal(state.doc.worldId, 'new-world');
    assert.equal(state.canUndo || state.canRedo, false);
  } finally {
    if (renderer) await act(async () => renderer!.unmount());
    env.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});
