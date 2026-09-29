import { Body, Box, Sphere, Vec3, World } from 'cannon-es';
import { createSceneRuntime, mountSceneRuntime } from '@nexusworld3d/engine-client';

/** This demo supplies a physics adapter, not a second scene interpreter. */
export function createDemoPhysics(document) {
  const runtime = createSceneRuntime(document, 'exterior');
  const world = new World({ gravity: new Vec3(0, -18, 0) });
  world.defaultContactMaterial.friction = 0;
  const players = new Map();
  const stopScene = mountSceneRuntime(runtime, { addStaticBox(box) {
    const body = new Body({ mass: 0, shape: new Box(new Vec3(...box.size.map(value => value / 2))) });
    body.position.set(...box.position); body.quaternion.set(...box.rotation);
    world.addBody(body);
    return () => world.removeBody(body);
  } });
  let disposed = false;
  return { world, runtime, players,
    add(id) {
      if (disposed || players.has(id)) throw new Error('Invalid player allocation');
      const body = new Body({ mass: 1, shape: new Sphere(0.5), fixedRotation: true, linearDamping: 0 });
      body.position.set(...runtime.spawn.position);
      // Characters do not collide with each other in this minimal demo.
      body.collisionFilterGroup = 2; body.collisionFilterMask = 1;
      world.addBody(body); players.set(id, body);
      return body;
    },
    remove(id) { const body = players.get(id); if (body) world.removeBody(body); players.delete(id); },
    step(inputs, delta = 1 / 60) {
      if (disposed) return;
      for (const [id, body] of players) {
        const input = inputs.get(id) ?? { x: 0, z: 0, jump: false };
        const magnitude = Math.max(1, Math.hypot(input.x, input.z));
        body.velocity.x = input.x / magnitude * 4;
        body.velocity.z = input.z / magnitude * 4;
        const grounded = world.contacts.some(contact =>
          (contact.bi === body && -contact.ni.y > 0.5) || (contact.bj === body && contact.ni.y > 0.5));
        if (input.jump && grounded) body.velocity.y = 7;
        input.jump = false;
        if (body.position.y < -10) { body.position.set(...runtime.spawn.position); body.velocity.setZero(); }
      }
      world.step(1 / 60, Math.min(Math.max(delta, 0), 0.1), 6);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const body of players.values()) world.removeBody(body);
      players.clear(); stopScene();
    },
  };
}
