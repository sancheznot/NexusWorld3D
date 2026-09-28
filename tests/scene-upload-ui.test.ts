import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useSceneModelCatalog } from '../src/hooks/useSceneModelCatalog';

test('editor catalog loads uploaded models, registers a new one and rejects wrong file types locally', async () => {
  const env = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const oldAct = env.IS_REACT_ACT_ENVIRONMENT, oldFetch = globalThis.fetch;
  env.IS_REACT_ACT_ENVIRONMENT = true;
  const existing = { id: `upload-${'a'.repeat(64)}`, name: 'Existing.glb', url: `/api/public/scene-models/upload-${'a'.repeat(64)}`, colliders: [] };
  const uploaded = { id: `upload-${'b'.repeat(64)}`, name: 'New.glb', url: `/api/public/scene-models/upload-${'b'.repeat(64)}`, colliders: [] };
  let calls = 0;
  globalThis.fetch = async (_input, init) => {
    calls++;
    return Response.json(init?.method === 'POST' ? { asset: uploaded } : { assets: [existing] });
  };
  let catalog!: ReturnType<typeof useSceneModelCatalog>;
  let renderer: ReactTestRenderer | undefined;
  function Harness() { catalog = useSceneModelCatalog(); return null; }
  try {
    await act(async () => { renderer = create(React.createElement(Harness)); });
    assert.ok(catalog.assets.some(asset => asset.id === existing.id));
    assert.equal(catalog.busy, false);
    await act(async () => { assert.equal(await catalog.upload(new File(['not-glb'], 'bad.txt')), null); });
    assert.equal(calls, 1);
    assert.match(catalog.error, /GLB/);
    await act(async () => { assert.equal((await catalog.upload(new File(['mocked-server-validates'], 'New.glb')))?.id, uploaded.id); });
    assert.ok(catalog.assets.some(asset => asset.id === uploaded.id));
    assert.match(catalog.message, /registrado/);
    await act(async () => { await catalog.upload(new File(['same'], 'New.glb')); });
    assert.equal(catalog.assets.filter(asset => asset.id === uploaded.id).length, 1);
  } finally {
    if (renderer) await act(async () => renderer!.unmount());
    globalThis.fetch = oldFetch; env.IS_REACT_ACT_ENVIRONMENT = oldAct;
  }
});
