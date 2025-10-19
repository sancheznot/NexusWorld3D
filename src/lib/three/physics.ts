import * as THREE from 'three';

// Simple collision detection
export class CollisionDetector {
  private objects: THREE.Object3D[] = [];

  addObject(object: THREE.Object3D) {
    this.objects.push(object);
  }

  removeObject(object: THREE.Object3D) {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }

  // Check if a position collides with any object
  checkCollision(position: THREE.Vector3, radius: number = 0.5): boolean {
    for (const object of this.objects) {
      if (this.isColliding(position, radius, object)) {
        return true;
      }
    }
    return false;
  }

  private isColliding(position: THREE.Vector3, radius: number, object: THREE.Object3D): boolean {
    if (!(object instanceof THREE.Mesh) || !object.geometry) return false;

    const objectPosition = new THREE.Vector3();
    object.getWorldPosition(objectPosition);

    const distance = position.distanceTo(objectPosition);
    const objectRadius = this.getObjectRadius(object);

    return distance < (radius + objectRadius);
  }

  private getObjectRadius(object: THREE.Object3D): number {
    if (!(object instanceof THREE.Mesh) || !object.geometry) return 0;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    return Math.max(size.x, size.z) / 2;
  }
}

// Simple physics for player movement
export class PlayerPhysics {
  private velocity = new THREE.Vector3();
  private acceleration = new THREE.Vector3();
  private friction = 0.8;
  private maxSpeed = 10;

  update(deltaTime: number, input: { x: number; z: number; isRunning?: boolean }, isGrounded: boolean = true) {
    // Apply input force
    this.acceleration.set(input.x, 0, input.z);
    const forceMultiplier = input.isRunning ? 30 : 20; // More force when running
    this.acceleration.multiplyScalar(forceMultiplier);

    // Apply gravity if not grounded
    if (!isGrounded) {
      this.acceleration.y = -9.81;
    } else {
      // Reset Y velocity when grounded
      this.velocity.y = 0;
    }

    // Update velocity
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));

    // Apply friction
    this.velocity.multiplyScalar(this.friction);

    // Limit speed
    if (this.velocity.length() > this.maxSpeed) {
      this.velocity.normalize().multiplyScalar(this.maxSpeed);
    }

    // Reset acceleration
    this.acceleration.set(0, 0, 0);

    return this.velocity.clone();
  }

  getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  setVelocity(velocity: THREE.Vector3) {
    this.velocity.copy(velocity);
  }

  reset() {
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
  }
}

// Simple camera controller
export class CameraController {
  private camera: THREE.Camera;
  private target: THREE.Object3D;
  private offset = new THREE.Vector3(0, 5, 10);
  private currentPosition = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();

  constructor(camera: THREE.Camera, target: THREE.Object3D) {
    this.camera = camera;
    this.target = target;
  }

  update(deltaTime: number) {
    const idealPosition = new THREE.Vector3();
    this.target.getWorldPosition(idealPosition);
    idealPosition.add(this.offset);

    // Smooth camera movement
    this.currentPosition.lerp(idealPosition, deltaTime * 5);
    this.camera.position.copy(this.currentPosition);

    // Look at target
    this.target.getWorldPosition(this.currentLookAt);
    this.camera.lookAt(this.currentLookAt);
  }

  setOffset(offset: THREE.Vector3) {
    this.offset.copy(offset);
  }

  getOffset(): THREE.Vector3 {
    return this.offset.clone();
  }
}
