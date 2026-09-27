import assert from 'node:assert/strict';
import test from 'node:test';
import React, { StrictMode, createElement } from 'react';
import { act, create as createRenderer, type ReactTestRenderer } from 'react-test-renderer';
import { context, type RootStore } from '@react-three/fiber';
import { create } from 'zustand';
import { Scene, Mesh } from 'three';
import { useCannonPhysics, getPhysicsInstance, updatePhysicsDebugger } from '../src/hooks/useCannonPhysics';
import type { CannonPhysics } from '../src/lib/three/cannonPhysics';
import SceneAuthoringPreviewLayer from '../src/components/world/SceneAuthoringPreviewLayer';
import { useSceneAuthoringStore } from '../src/store/sceneAuthoringStore';
import { useGameWorldStore } from '../src/store/gameWorldStore';
import { parseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { usePlayerStore } from '../src/store/playerStore';

test('React StrictMode mount cycles release the shared world and debugger resources', async () => {
  const testEnvironment: Record<string, string | undefined> = process.env;
  const previousEnv = testEnvironment.NODE_ENV;
  testEnvironment.NODE_ENV = 'development';
  const actEnv = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previousAct = actEnv.IS_REACT_ACT_ENVIRONMENT;
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;
  const refs: React.RefObject<CannonPhysics | null>[] = [];
  function Consumer({ owner }: { owner: boolean }) {
    const ref = useCannonPhysics(owner);
    React.useEffect(() => { refs.push(ref); }, [ref]);
    return null;
  }
  let renderer: ReactTestRenderer | undefined;
  const previousPose = { position: usePlayerStore.getState().position, rotation: usePlayerStore.getState().rotation };
  try {
    for (let cycle = 0; cycle < 20; cycle++) {
      const serverPosition = { x: 12 + cycle, y: 4, z: -8 };
      usePlayerStore.setState({ position: serverPosition, rotation: { x: 0, y: 0.75, z: 0 } });
      const scene = new Scene();
      const store = create(() => ({ scene })) as unknown as RootStore;
      await act(async () => {
        renderer = createRenderer(createElement(context.Provider, { value: store },
          createElement(StrictMode, null,
            createElement(Consumer, { owner: false }),
            createElement(Consumer, { owner: true }),
            createElement(Consumer, { owner: false }))));
      });
      const physics = getPhysicsInstance();
      assert.ok(physics);
      assert.deepEqual(physics.getPlayerPosition(), serverPosition, 'late physics initialization preserves server pose');
      assert.ok(refs.every(ref => ref.current === null || ref.current === physics));
      updatePhysicsDebugger();
      const pending = new Set<object>();
      scene.traverse(object => {
        if (!(object instanceof Mesh)) return;
        for (const resource of [object.geometry, ...(Array.isArray(object.material) ? object.material : [object.material])]) {
          pending.add(resource);
          resource.addEventListener('dispose', () => pending.delete(resource));
        }
      });
      assert.ok(pending.size > 0, 'debug meshes exercised');
      await act(async () => { renderer!.unmount(); });
      renderer = undefined;
      assert.equal(getPhysicsInstance(), null);
      assert.equal(physics.getWorld().bodies.length, 0);
      assert.equal(scene.children.length, 0);
      assert.equal(pending.size, 0, 'all mounted debug resources disposed');
      assert.ok(refs.every(ref => ref.current === null));
      refs.length = 0;
    }
  } finally {
    if (renderer) await act(async () => { renderer!.unmount(); });
    usePlayerStore.setState(previousPose);
    actEnv.IS_REACT_ACT_ENVIRONMENT = previousAct;
    if (previousEnv === undefined) delete testEnvironment.NODE_ENV;
    else testEnvironment.NODE_ENV = previousEnv;
  }
});

test('scene layer rebuilds colliders on document/map changes and clears them on leave', async () => {
  const actEnv = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previousAct = actEnv.IS_REACT_ACT_ENVIRONMENT;
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;
  const previousMap = useGameWorldStore.getState().activeMapId;
  const store = create(() => ({ scene: new Scene() })) as unknown as RootStore;
  const document = parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'test', entities: [{
    id: 'wall', parentId: null,
    transform: { position: [3, 1, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
    components: [{ type: 'nexus:box', props: { size: [1, 2, 3], solid: true, mapId: 'exterior' } }],
  }] });
  let renderer: ReactTestRenderer | undefined;
  try {
    useGameWorldStore.getState().setActiveMapId('exterior');
    useSceneAuthoringStore.getState().setApplied({ document, appliedAt: 1, roomId: 'test' });
    await act(async () => {
      renderer = createRenderer(createElement(context.Provider, { value: store }, createElement(SceneAuthoringPreviewLayer)));
    });
    const physics = getPhysicsInstance()!;
    assert.equal(physics.getWorld().bodies.length, 3, 'ground, player and scene wall');
    await act(async () => { useGameWorldStore.getState().setActiveMapId('hotel-interior'); });
    assert.equal(physics.getWorld().bodies.length, 2);
    await act(async () => { useGameWorldStore.getState().setActiveMapId('exterior'); });
    assert.equal(physics.getWorld().bodies.length, 3);
    await act(async () => {
      useSceneAuthoringStore.getState().setApplied({ document: structuredClone(document), appliedAt: 2, roomId: 'test' });
    });
    assert.equal(physics.getWorld().bodies.length, 3, 'replacement did not duplicate the wall');
    await act(async () => { useSceneAuthoringStore.getState().clear(); });
    assert.equal(physics.getWorld().bodies.length, 2);
    await act(async () => { renderer!.unmount(); });
    renderer = undefined;
    assert.equal(physics.getWorld().bodies.length, 0);
    assert.equal(getPhysicsInstance(), null);
  } finally {
    if (renderer) await act(async () => { renderer!.unmount(); });
    useSceneAuthoringStore.getState().clear();
    useGameWorldStore.getState().setActiveMapId(previousMap);
    actEnv.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
});
