import * as CANNON from 'cannon-es';

export class CannonPhysics {
  private world: CANNON.World;
  private bodies: Map<string, CANNON.Body> = new Map();
  private playerBody: CANNON.Body | null = null;
  private currentVelocity = { x: 0, z: 0 };
  private targetVelocity = { x: 0, z: 0 };
  private acceleration = 8; // Velocidad de aceleración (más suave)
  private deceleration = 12; // Velocidad de desaceleración (más rápida)

  constructor() {
    // Crear mundo de física
    this.world = new CANNON.World();
    
    // Configurar gravedad
    this.world.gravity.set(0, -9.82, 0);
    
    // Configurar solver
    this.world.broadphase = new CANNON.NaiveBroadphase();
    
    // Configurar materiales
    this.setupMaterials();
    
    console.log('🌍 Cannon.js physics world initialized');
  }

  private setupMaterials() {
    // Material del suelo
    const groundMaterial = new CANNON.Material('ground');
    const groundContactMaterial = new CANNON.ContactMaterial(
      groundMaterial,
      groundMaterial,
      {
        friction: 0.8, // Alta fricción
        restitution: 0.0, // Sin rebote
      }
    );
    this.world.addContactMaterial(groundContactMaterial);

    // Material del jugador
    const playerMaterial = new CANNON.Material('player');
    const playerGroundContact = new CANNON.ContactMaterial(
      playerMaterial,
      groundMaterial,
      {
        friction: 0.9, // Alta fricción entre jugador y suelo
        restitution: 0.0, // Sin rebote
      }
    );
    this.world.addContactMaterial(playerGroundContact);
  }

  createGround(size: number = 100) {
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.position.set(0, -0.5, 0); // Bajar el suelo 0.5 metros
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.material = new CANNON.Material('ground');
    
    this.world.addBody(groundBody);
    console.log('🏞️ Ground created');
    return groundBody;
  }

  createPlayer(position: { x: number; y: number; z: number }) {
    // Crear cuerpo del jugador
    const playerShape = new CANNON.Cylinder(0.5, 0.5, 2, 8);
    const playerBody = new CANNON.Body({ mass: 1 });
    playerBody.addShape(playerShape);
    playerBody.position.set(position.x, position.y, position.z);
    playerBody.material = new CANNON.Material('player');
    
    // Configurar propiedades físicas
    playerBody.linearDamping = 0.8; // Alta amortiguación para estabilidad
    playerBody.angularDamping = 0.9; // Alta amortiguación angular
    playerBody.fixedRotation = true; // Evitar rotación no deseada
    
    this.world.addBody(playerBody);
    this.playerBody = playerBody;
    this.bodies.set('player', playerBody);
    
    console.log('👤 Player body created');
    return playerBody;
  }

  update(deltaTime: number) {
    this.world.step(deltaTime);
  }

  updateMovement(input: { x: number; z: number; isRunning: boolean }, deltaTime: number) {
    if (!this.playerBody) return;

    // Calcular velocidad objetivo
    const maxSpeed = input.isRunning ? 8 : 5;
    this.targetVelocity.x = input.x * maxSpeed;
    this.targetVelocity.z = input.z * maxSpeed;

    // Interpolar hacia la velocidad objetivo
    const lerpSpeed = (input.x !== 0 || input.z !== 0) ? this.acceleration : this.deceleration;
    const lerpFactor = lerpSpeed * deltaTime;

    this.currentVelocity.x = this.lerp(this.currentVelocity.x, this.targetVelocity.x, lerpFactor);
    this.currentVelocity.z = this.lerp(this.currentVelocity.z, this.targetVelocity.z, lerpFactor);

    // Aplicar velocidad al cuerpo
    this.playerBody.velocity.x = this.currentVelocity.x;
    this.playerBody.velocity.z = this.currentVelocity.z;

    console.log(`🏃 Velocidad: actual(${this.currentVelocity.x.toFixed(2)}, ${this.currentVelocity.z.toFixed(2)}) objetivo(${this.targetVelocity.x}, ${this.targetVelocity.z})`);
  }

  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * Math.min(factor, 1);
  }

  getPlayerPosition(): { x: number; y: number; z: number } {
    if (!this.playerBody) return { x: 0, y: 1, z: 0 };
    
    return {
      x: this.playerBody.position.x,
      y: this.playerBody.position.y,
      z: this.playerBody.position.z,
    };
  }

  getPlayerVelocity(): { x: number; y: number; z: number } {
    if (!this.playerBody) return { x: 0, y: 0, z: 0 };
    
    return {
      x: this.playerBody.velocity.x,
      y: this.playerBody.velocity.y,
      z: this.playerBody.velocity.z,
    };
  }

  applyForce(force: { x: number; y: number; z: number }) {
    if (!this.playerBody) return;
    
    this.playerBody.applyForce(
      new CANNON.Vec3(force.x, force.y, force.z),
      this.playerBody.position
    );
  }

  jump(force: number) {
    if (!this.playerBody) return;
    
    // Solo saltar si está cerca del suelo (ahora el suelo está en -0.5)
    if (this.playerBody.position.y <= 0.6) {
      this.playerBody.velocity.y = force;
      console.log(`🦘 Jump applied: ${force}`);
    }
  }

  isGrounded(): boolean {
    if (!this.playerBody) return false;
    return this.playerBody.position.y <= 0.6;
  }

  setPlayerPosition(position: { x: number; y: number; z: number }) {
    if (!this.playerBody) return;
    
    this.playerBody.position.set(position.x, position.y, position.z);
  }

  dispose() {
    this.world.bodies.forEach((body: CANNON.Body) => {
      this.world.removeBody(body);
    });
    this.bodies.clear();
    this.playerBody = null;
    console.log('🧹 Cannon.js physics disposed');
  }
}
