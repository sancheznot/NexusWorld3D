import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import SceneWorldAccessPanel from '../src/components/admin/SceneWorldAccessPanel';
import SceneInteractionInspector from '../src/components/admin/SceneInteractionInspector';
import SceneEntityVisual from '../src/components/world/SceneEntityVisual';
import { parseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import fixture from '../content/scenes/playable.v0_1.json';

test('access panel stays private after rejected publication and exposes a link only after success', async t => {
  const env = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const priorAct = env.IS_REACT_ACT_ENVIRONMENT, priorWindow = globalThis.window;
  env.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'window', { value: { confirm: () => true }, configurable: true, writable: true });
  let allow = false;
  const commands: Record<string, unknown>[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.method !== 'POST') return Response.json({ world: null });
    const body = JSON.parse(String(init.body)); commands.push(body);
    return allow ? Response.json({ world: body }) : Response.json({ error: 'publish_valid_scene_first' }, { status: 400 });
  });
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => { renderer = create(React.createElement(SceneWorldAccessPanel, { worldId: 'ui-world' })); });
    const buttons = () => renderer!.root.findAllByType('button');
    await act(async () => { buttons()[0].props.onClick(); });
    assert.equal(renderer!.root.findAllByType('a').length, 0);
    assert.match(renderer!.root.findByProps({ role: 'alert' }).children.join(''), /publish_valid_scene_first/);
    allow = true;
    await act(async () => { buttons()[0].props.onClick(); });
    assert.equal(renderer!.root.findByType('a').props.href, '/worlds?worldId=ui-world');
    await act(async () => { buttons()[1].props.onClick(); });
    assert.equal(renderer!.root.findAllByType('a').length, 0);
    assert.deepEqual(commands.map(command => command.public), [true, true, false]);
  } finally {
    if (renderer) await act(async () => renderer!.unmount());
    env.IS_REACT_ACT_ENVIRONMENT = priorAct;
    if (priorWindow === undefined) Reflect.deleteProperty(globalThis, 'window'); else globalThis.window = priorWindow;
  }
});

test('interaction inspector edits the label and shared visual renders the authored world position', async () => {
  const env = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const previous = env.IS_REACT_ACT_ENVIRONMENT; env.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  const entity = parseSceneDocumentV0_1(fixture).entities[0];
  const patches: unknown[] = [];
  try {
    await act(async () => { renderer = create(React.createElement(SceneInteractionInspector, { entity, onChange: (type, patch) => patches.push({ type, patch }) })); });
    await act(async () => renderer!.root.findAllByType('input')[0].props.onChange({ target: { value: 'Entrada' } }));
    assert.deepEqual(patches, [{ type: 'nexus:triggerSphere', patch: { label: 'Entrada' } }]);
    await act(async () => renderer!.update(React.createElement(SceneEntityVisual, { entity, selected: true })));
    assert.deepEqual(renderer!.root.findAll(node => node.type === 'group')[0].props.position, [0, 0, 0]);
    assert.equal(renderer!.root.findAll(node => node.type === 'sphereGeometry')[0].props.args[0], 3);
  } finally {
    if (renderer) await act(async () => renderer!.unmount()); env.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});
