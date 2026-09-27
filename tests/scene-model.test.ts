import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { BoxGeometry, Mesh, MeshStandardMaterial, Texture, Group, Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box } from 'cannon-es';
import { parseSceneDocumentV0_1, parseContentManifestV1, getSceneModelProps } from '@nexusworld3d/content-schema';
import fixture from '../content/scenes/models.v0_1.json';
import { loadContentManifestOrThrow } from '../server/content/loadContentManifest';
import { validateSceneDocumentSemanticsV0_1 } from '../server/scene/validateSceneDocumentSemanticsV0_1';
import { CannonPhysics } from '../src/lib/three/cannonPhysics';
import { mountSceneBoxColliders } from '../src/lib/three/sceneBoxColliders';
import { createScenePlaySession } from '../src/lib/three/scenePlaySession';
import { disposeSceneModel, trackSceneModelLoad } from '../src/lib/three/disposeSceneModel';

test('models reject unknown assets, unsafe catalog paths and ambiguous or oversized colliders', () => {
  loadContentManifestOrThrow();
  const doc = parseSceneDocumentV0_1(fixture);
  assert.equal(validateSceneDocumentSemanticsV0_1(doc).ok, true);
  doc.entities[0].components[0].props.assetId = 'missing';
  assert.equal(validateSceneDocumentSemanticsV0_1(doc).ok, false);
  for (const url of ['https://remote.invalid/a.glb', '/scene-assets/../private.glb', '/scene-assets/%2e%2e/a.glb', '//remote.invalid/a.glb']) {
    assert.throws(() => parseContentManifestV1({ schemaVersion: 1, items: [], modelAssets: [{ id: 'x', name: 'x', url }] }));
  }
  for (const mutate of [
    (d: typeof doc) => { d.entities[0].components.push({ type: 'nexus:box', props: {} }); },
    (d: typeof doc) => { d.entities[0].parentId = d.entities[0].id; },
    (d: typeof doc) => { d.entities[0].transform.scale[0] = 200; },
    (d: typeof doc) => { d.entities[0].components[0].props.colliders = Array(33).fill({ size: [1, 1, 1], offset: [0, 0, 0] }); },
    (d: typeof doc) => { d.entities[0].components[0].props.colliders = [{ size: [-1, 1, 1], offset: [0, 0, 0] }]; },
  ]) {
    const next = parseSceneDocumentV0_1(fixture); mutate(next);
    assert.throws(() => parseSceneDocumentV0_1(next));
  }
});

test('model collider offsets rotate and scale with the visual transform; repeated disposal is safe', () => {
  const doc = parseSceneDocumentV0_1(fixture);
  const entity = doc.entities[0];
  entity.transform = { position: [10, 1, 20], rotation: [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)], scale: [2, 1, 3] };
  entity.components[0].props.colliders = [{ size: [1, 4, 1], offset: [2, 1, 0] }];
  const physics = new CannonPhysics();
  try {
    for (let i = 0; i < 20; i++) {
      const remove = mountSceneBoxColliders(physics, doc, 'exterior');
      const [body] = physics.getWorld().bodies;
      assert.ok(Math.abs(body.position.x - 10) < 1e-10);
      assert.ok(Math.abs(body.position.y - 2) < 1e-10);
      assert.ok(Math.abs(body.position.z - 16) < 1e-10);
      assert.deepEqual((body.shapes[0] as Box).halfExtents.toArray(), [1, 2, 1.5]);
      remove(); remove(); assert.equal(physics.getWorld().bodies.length, 0);
    }
    mountSceneBoxColliders(physics, doc, 'other-map')();
    assert.equal(physics.getWorld().bodies.length, 0);
  } finally { physics.dispose(); }
});

test('doorway colliders allow the opening but block its pillars at 30 and 144 FPS', () => {
  for (const fps of [30, 144]) for (const x of [0, 2.5]) {
    const session = createScenePlaySession(parseSceneDocumentV0_1(fixture), 'exterior');
    try {
      session.physics.teleportPlayer({ x, y: 1.05, z: 3 });
      session.physics.setMovementInput({ x: 0, z: -1, isRunning: true, stamina: 100 });
      for (let i = 0; i < fps * 2; i++) session.physics.update(1 / fps);
      const z = session.physics.getPlayerPosition().z;
      if (x === 0) assert.ok(z < -2, `open doorway at ${fps} FPS: ${z}`);
      else assert.ok(z > 0.8, `solid pillar at ${fps} FPS: ${z}`);
    } finally { session.dispose(); }
  }
});

test('model disposal deduplicates GPU resources and closes independently owned image bitmaps', () => {
  const geometry = new BoxGeometry(), material = new MeshStandardMaterial(), texture = new Texture();
  let closed = 0; texture.image = { close() { closed++; } }; material.map = texture;
  const root = new Group(); root.add(new Mesh(geometry, material), new Mesh(geometry, material));
  let disposed = 0;
  for (const resource of [geometry, material, texture]) resource.addEventListener('dispose', () => disposed++);
  disposeSceneModel([root, root]);
  assert.equal(disposed, 3); assert.equal(closed, 1);
});

test('late model loads after unmount are disposed without a state update', async () => {
  const scene = new Group(), geometry = new BoxGeometry(), material = new MeshStandardMaterial();
  scene.add(new Mesh(geometry, material));
  let disposed = 0, updates = 0;
  geometry.addEventListener('dispose', () => disposed++);
  let resolve!: (value: { scenes: Group[] }) => void;
  const request = new Promise<{ scenes: Group[] }>(done => { resolve = done; });
  const cancel = trackSceneModelLoad(request, () => updates++, () => updates++);
  cancel(); cancel(); resolve({ scenes: [scene] }); await request; await Promise.resolve();
  assert.equal(updates, 0); assert.equal(disposed, 1);
});

test('the actual glTF doorway meshes match all three catalog colliders', async () => {
  // Node lacks ProgressEvent; this polyfill only supports the loader's data URI progress event.
  const previous = globalThis.ProgressEvent;
  if (!previous) globalThis.ProgressEvent = class extends Event {
    readonly lengthComputable = false;
    readonly loaded = 0;
    readonly total = 0;
  };
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.parseAsync(readFileSync('public/scene-assets/demo-doorway.gltf', 'utf8'), '');
    try {
      const colliders = getSceneModelProps(parseSceneDocumentV0_1(fixture).entities[0])!.colliders;
      assert.equal(gltf.scene.children.length, 3);
      gltf.scene.children.forEach((child, index) => {
        const box = new Box3().setFromObject(child);
        assert.deepEqual(box.getCenter(new Vector3()).toArray(), colliders[index].offset);
        assert.deepEqual(box.getSize(new Vector3()).toArray(), colliders[index].size);
      });
    } finally { disposeSceneModel(gltf.scenes); }
  } finally {
    if (previous) globalThis.ProgressEvent = previous;
    else Reflect.deleteProperty(globalThis, 'ProgressEvent');
  }
});
