import assert from 'node:assert/strict';
import test from 'node:test';
import * as CANNON from 'cannon-es';
import { CannonPhysics } from '../src/lib/three/cannonPhysics';
import { GAME_CONFIG } from '../src/constants/game';
import { CollisionGroups } from '../src/constants/collisionGroups';

test('running capsule cannot cross a solid wall at supported frame rates', () => {
  for (const fps of [30, 60, 144]) {
    const physics = new CannonPhysics();
    physics.createGround();
    const player = physics.createPlayer({ x: 0, y: 1.05, z: 0 });
    const wall = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(3, 3, 0),
      shape: new CANNON.Box(new CANNON.Vec3(0.25, 3, 5)),
      collisionFilterGroup: CollisionGroups.Default });
    physics.getWorld().addBody(wall);
    try {
      physics.setMovementInput({ x: 1, z: 0, isRunning: true, stamina: 100 });
      for (let frame = 0; frame < fps * 3; frame++) physics.update(1 / fps);
      assert.ok(player.position.x > 1, 'player reached the wall');
      assert.ok(player.position.x < 2.75, `solid wall retained at ${fps} FPS`);
      assert.ok(player.position.y > 0.8 && player.position.y < 1.3);
    } finally { physics.dispose(); }
  }
});

test('a long fall lands without non-finite state or persistent floor penetration', () => {
  for (const fps of [30, 60, 144]) {
    const physics = new CannonPhysics();
    physics.createGround();
    const player = physics.createPlayer({ x: 0, y: 1.05, z: 0 });
    physics.teleportPlayer({ x: 0, y: 50, z: 0 });
    try {
      for (let frame = 0; frame < fps * 8; frame++) {
        physics.update(1 / fps);
        assert.ok([player.position.x, player.position.y, player.position.z,
          player.velocity.x, player.velocity.y, player.velocity.z].every(Number.isFinite));
      }
      assert.ok(player.position.y > 0.8 && player.position.y < 1.3, `landed at ${fps} FPS`);
      assert.ok(Math.abs(player.velocity.y) < 0.2);
    } finally { physics.dispose(); }
  }
});

test('vehicle steering changes heading and handbrake slows the car across FPS', () => {
  for (const fps of [30, 60, 144]) {
    const physics = new CannonPhysics();
    physics.createGround();
    const car = physics.createRaycastVehicle({ x: 0, y: 2, z: 0 }, 'turn-car');
    const advance = (seconds: number) => {
      for (let frame = 0; frame < fps * seconds; frame++) physics.update(1 / fps);
    };
    try {
      advance(2);
      physics.setVehicleInput('turn-car', { throttle: 1, brake: 0, steer: 0 });
      advance(3);
      const heading = car.quaternion.clone();
      physics.setVehicleInput('turn-car', { throttle: 0.5, brake: 0, steer: 0.5 });
      advance(1);
      const rotationDot = Math.abs(heading.x * car.quaternion.x + heading.y * car.quaternion.y
        + heading.z * car.quaternion.z + heading.w * car.quaternion.w);
      assert.ok(rotationDot < 0.999, `steering changes heading at ${fps} FPS`);
      const speed = Math.hypot(car.velocity.x, car.velocity.z);
      assert.ok(speed > 1, 'braking test starts with a moving car');
      physics.setVehicleInput('turn-car', { throttle: 0, brake: 0, steer: 0, handbrake: 1 });
      advance(2);
      assert.ok(Math.hypot(car.velocity.x, car.velocity.z) < speed * 0.5,
        `handbrake reduces speed at ${fps} FPS`);
      assert.ok(Number.isFinite(car.position.y) && car.position.y > 0);
    } finally { physics.dispose(); }
  }
});

test('real raycast vehicle accelerates with comparable suspension and travel across FPS', () => {
  const distances: number[] = [];
  for (const fps of [30, 60, 90, 120, 144]) {
    const physics = new CannonPhysics();
    physics.createGround();
    physics.createRaycastVehicle({ x: 0, y: 2, z: 0 }, 'test-car');
    try {
      for (let frame = 0; frame < fps * 2; frame++) physics.update(1 / fps);
      const start = physics.getBodyTransform('test-car')!;
      physics.setVehicleInput('test-car', { throttle: 1, brake: 0, steer: 0 });
      for (let frame = 0; frame < fps * 3; frame++) physics.update(1 / fps);
      const end = physics.getBodyTransform('test-car')!;
      distances.push(Math.hypot(end.position.x - start.position.x, end.position.z - start.position.z));
      assert.ok(end.position.y > 0 && end.position.y < 2, `suspension height at ${fps} FPS: ${end.position.y}`);
      assert.ok(Object.values(end.quaternion).every(Number.isFinite));
      physics.removeVehicle('test-car');
      assert.equal(physics.getBodyTransform('test-car'), null);
      assert.equal(physics.getWorld().bodies.length, 1, 'only ground remains');
      physics.update(1 / fps);
    } finally { physics.dispose(); }
  }
  assert.ok(Math.min(...distances) > 1, `vehicle actually drives: ${distances}`);
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.5, `vehicle trajectories: ${distances}`);
});

test('twenty vehicle creation/removal cycles do not retain bodies or preStep callbacks', () => {
  const physics = new CannonPhysics();
  physics.createGround();
  let removedVehicleUpdates = 0;
  try {
    for (let cycle = 0; cycle < 20; cycle++) {
      physics.createRaycastVehicle({ x: 0, y: 2, z: 0 }, 'reused-car');
      const vehicle = (physics as unknown as Record<string, CANNON.RaycastVehicle>)['reused-car:vehicle'];
      const originalUpdate = vehicle.updateVehicle.bind(vehicle);
      let removed = false;
      vehicle.updateVehicle = (dt) => {
        if (removed) removedVehicleUpdates++;
        originalUpdate(dt);
      };
      physics.setVehicleInput('reused-car', { throttle: 1, brake: 0, steer: 0.2 });
      physics.update(1 / 30);
      physics.removeVehicle('reused-car');
      removed = true;
      physics.update(1 / 30);
      assert.equal(physics.getWorld().bodies.length, 1);
      assert.equal(physics.getBodyTransform('reused-car'), null);
    }
    assert.equal(removedVehicleUpdates, 0);
  } finally { physics.dispose(); }
  assert.equal(physics.getWorld().bodies.length, 0);
});

test('ground probe excludes the player itself and non-ground collision groups', () => {
  const physics = new CannonPhysics();
  physics.createPlayer({ x: 0, y: 10, z: 0 });
  physics.setPlayerPosition({ x: 0, y: 10, z: 0 });
  try {
    assert.equal(physics.isGrounded(), false, 'a player in empty air cannot ground itself');
    for (const group of [CollisionGroups.Characters, CollisionGroups.TrimeshColliders, CollisionGroups.Vehicles]) {
      const body = new CANNON.Body({ mass: 0, collisionFilterGroup: group,
        shape: new CANNON.Box(new CANNON.Vec3(2, 0.1, 2)), position: new CANNON.Vec3(0, 8.9, 0) });
      physics.getWorld().addBody(body);
      assert.equal(physics.isGrounded(), false, `excluded group ${group}`);
      physics.getWorld().removeBody(body);
    }
    const ground = physics.createGround();
    ground.position.y = 8.9;
    ground.aabbNeedsUpdate = true;
    assert.equal(physics.isGrounded(), true, 'valid ground within probe distance');
    ground.collisionResponse = false;
    assert.equal(physics.isGrounded(), false, 'trigger is not solid ground');
  } finally { physics.dispose(); }
});

function cullingAccess(physics: CannonPhysics) {
  return physics as unknown as {
    bodies: Map<string, CANNON.Body>;
    optimizeStaticColliders(): void;
  };
}

test('teleport reactivates destination colliders before the next physics step', () => {
  const physics = new CannonPhysics();
  physics.createPlayer({ x: 0, y: 1, z: 0 });
  const access = cullingAccess(physics);
  const platform = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(500, 0, 0),
    shape: new CANNON.Box(new CANNON.Vec3(10, 1, 10)) });
  access.bodies.set('destination', platform);
  physics.getWorld().addBody(platform);
  try {
    access.optimizeStaticColliders();
    assert.ok(!physics.getWorld().bodies.includes(platform));
    physics.teleportPlayer({ x: 500, y: 2.05, z: 0 });
    assert.ok(physics.getWorld().bodies.includes(platform));
    assert.equal(physics.isGrounded(), true);
  } finally { physics.dispose(); }
});

test('airborne jump is rejected and grounded movement stays comparable across FPS', () => {
  const distances: number[] = [];
  for (const fps of [30, 60, 90, 120, 144]) {
    const physics = new CannonPhysics();
    const player = physics.createPlayer({ x: 0, y: 1, z: 0 });
    try {
      physics.setPlayerPosition({ x: 0, y: 10, z: 0 });
      physics.jump(8);
      assert.equal(player.velocity.y, 0, 'no jump in empty air');
      physics.createGround();
      physics.setPlayerPosition({ x: 0, y: 1.05, z: 0 });
      physics.jump(8);
      assert.equal(player.velocity.y, 8, 'jump from ground');
      player.velocity.setZero();
      physics.setMovementInput({ x: 1, z: 0, isRunning: false, stamina: 100 });
      for (let frame = 0; frame < fps * 2; frame++) physics.update(1 / fps);
      distances.push(player.position.x);
      assert.ok(player.position.y > 0.9 && player.position.y < 1.1, 'standing on solid ground');
    } finally { physics.dispose(); }
  }
  assert.ok(Math.min(...distances) > 1, `player actually moved: ${distances}`);
  assert.ok(Math.max(...distances) - Math.min(...distances) < 0.15, `FPS trajectories: ${distances}`);
});

test('culling uses collider bounds including offsets and rotations, not the origin', () => {
  const physics = new CannonPhysics();
  physics.createPlayer({ x: 0, y: 1, z: 0 });
  const access = cullingAccess(physics);
  const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(500, 0, 0) });
  body.addShape(new CANNON.Box(new CANNON.Vec3(2, 1, 200)), new CANNON.Vec3(0, 0, -350));
  body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
  physics.getWorld().addBody(body);
  access.bodies.set('anonymous-platform', body);
  try {
    access.optimizeStaticColliders();
    assert.ok(physics.getWorld().bodies.includes(body), 'nearby edge of distant-origin collider must stay solid');
  } finally { physics.dispose(); }
});

test('culling reactivates nearby bounds and keeps hysteresis without name exceptions', () => {
  const physics = new CannonPhysics();
  physics.createPlayer({ x: 0, y: 1, z: 0 });
  const access = cullingAccess(physics);
  const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(500, 0, 0),
    shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)) });
  physics.getWorld().addBody(body);
  access.bodies.set('road-section', body);
  try {
    access.optimizeStaticColliders();
    assert.ok(!physics.getWorld().bodies.includes(body), 'a distant road segment can be culled');
    physics.setPlayerPosition({ x: 365, y: 1, z: 0 });
    access.optimizeStaticColliders();
    assert.ok(!physics.getWorld().bodies.includes(body), 'remain inactive in hysteresis band');
    physics.setPlayerPosition({ x: 400, y: 1, z: 0 });
    access.optimizeStaticColliders();
    assert.ok(physics.getWorld().bodies.includes(body), 'reactivate within activation distance');
    physics.setPlayerPosition({ x: 365, y: 1, z: 0 });
    access.optimizeStaticColliders();
    assert.ok(physics.getWorld().bodies.includes(body), 'remain active in hysteresis band');
  } finally { physics.dispose(); }
});

test('the game frame path preserves elapsed time at 30/60/90/120/144 FPS', () => {
  for (const fps of [30, 60, 90, 120, 144]) {
    const physics = new CannonPhysics();
    const world = physics.getWorld();
    world.gravity.set(0, 0, 0);
    const body = new CANNON.Body({ mass: 1, linearDamping: 0, shape: new CANNON.Sphere(0.1) });
    body.velocity.x = 9;
    world.addBody(body);
    try {
      for (let frame = 0; frame < fps; frame++) {
        physics.update(Math.min(1 / fps, GAME_CONFIG.physics.maxDeltaTime));
      }
      assert.ok(Math.abs(body.position.x - 9) < 0.12, `${fps} FPS: ${body.position.x} units instead of 9`);
    } finally {
      physics.dispose();
    }
  }
});

test('dispose removes every body and can be called twice', () => {
  const physics = new CannonPhysics();
  const world = physics.getWorld();
  for (let i = 0; i < 4; i++) world.addBody(new CANNON.Body());
  physics.dispose();
  assert.equal(world.bodies.length, 0);
  assert.doesNotThrow(() => physics.dispose());
});

test('raycast vehicles update only once per physics substep', () => {
  const physics = new CannonPhysics();
  const world = physics.getWorld();
  const chassis = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)) });
  const vehicle = new CANNON.RaycastVehicle({ chassisBody: chassis });
  let updates = 0;
  vehicle.updateVehicle = () => { updates++; };
  vehicle.addToWorld(world);
  // Register an actual Cannon vehicle just as createRaycastVehicle does.
  (physics as unknown as { vehicles: CANNON.RaycastVehicle[] }).vehicles.push(vehicle);
  const before = world.stepnumber;
  physics.update(1 / 30);
  assert.equal(updates, world.stepnumber - before);
  physics.dispose();
  const disposedUpdates = updates;
  world.step(1 / 90);
  assert.equal(updates, disposedUpdates, 'vehicle preStep callback must be detached');
});

test('invalid deltas do not advance or poison the simulation', () => {
  const physics = new CannonPhysics();
  const world = physics.getWorld();
  for (const delta of [0, -1, NaN, Infinity]) physics.update(delta);
  assert.equal(world.stepnumber, 0);
  physics.update(1 / 30);
  assert.ok(world.stepnumber >= 2);
  assert.ok(Number.isFinite(world.accumulator));
  physics.dispose();
});

test('controls run on fixed substeps and stopVehicle clears queued throttle', () => {
  const physics = new CannonPhysics();
  let movementSteps = 0;
  let vehicleSteps = 0;
  physics.updateMovement = (_input, dt) => {
    assert.equal(dt, GAME_CONFIG.physics.fixedTimeStep);
    movementSteps++;
  };
  physics.updateRaycastVehicle = (_id, _input, dt) => {
    assert.equal(dt, GAME_CONFIG.physics.fixedTimeStep);
    vehicleSteps++;
  };
  physics.setMovementInput({ x: 1, z: 0, isRunning: false, stamina: 100 });
  physics.setVehicleInput('car', { throttle: 1, brake: 0, steer: 0 });
  physics.update(1 / 30);
  assert.equal(movementSteps, physics.getWorld().stepnumber);
  assert.equal(vehicleSteps, movementSteps);
  const before = vehicleSteps;
  physics.stopVehicle('car');
  physics.setMovementInput(null);
  physics.update(1 / 30);
  assert.equal(vehicleSteps, before);
  assert.equal(movementSteps, before);
  physics.dispose();
});

test('long pauses are bounded and disposed worlds no longer advance', () => {
  const physics = new CannonPhysics();
  physics.update(60);
  const steps = physics.getWorld().stepnumber;
  assert.ok(steps > 0 && steps <= GAME_CONFIG.physics.maxSubSteps);
  assert.ok(physics.getWorld().accumulator < GAME_CONFIG.physics.fixedTimeStep);
  physics.dispose();
  physics.update(1 / 30);
  assert.equal(physics.getWorld().stepnumber, steps);
});
