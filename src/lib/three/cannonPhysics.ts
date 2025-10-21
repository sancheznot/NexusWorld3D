import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class CannonPhysics {
  private world: CANNON.World;
  private bodies: Map<string, CANNON.Body> = new Map();
  private playerBody: CANNON.Body | null = null;
  private playerBaseY: number = 1.05; // Altura base del centro del jugador sobre el suelo
  private currentVelocity = { x: 0, z: 0 };
  private targetVelocity = { x: 0, z: 0 };
  private acceleration = 20; // Velocidad de aceleración (más rápida)
  private deceleration = 15; // Velocidad de desaceleración (más rápida)
  private staticBodiesCreated = false; // Flag para evitar recrear colliders estáticos
  
  // Materiales compartidos (CRÍTICO para que funcionen las colisiones)
  private playerMaterial!: CANNON.Material;
  private groundMaterial!: CANNON.Material;
  private staticMaterial!: CANNON.Material;

  constructor() {
    // Crear mundo de física
    this.world = new CANNON.World();
    
    // Configurar gravedad
    this.world.gravity.set(0, -9.82, 0);
    
    // Configurar solver MEJORADO para mejores colisiones
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    const solver = new CANNON.GSSolver();
    solver.iterations = 10; // Más iteraciones = mejor precisión
    this.world.solver = solver;
    
    // DESACTIVAR sleep temporalmente para debug de colisiones
    this.world.allowSleep = false;
    this.world.defaultContactMaterial.restitution = 0; // Sin rebote por defecto
    this.world.defaultContactMaterial.friction = 0.6;
    
    // Configurar materiales
    this.setupMaterials();
    
    // Debug: Listener de colisiones (FILTRADO para excluir el suelo)
    this.world.addEventListener('postStep', () => {
      if (this.playerBody) {
        // Verificar si hay contactos con el jugador (EXCLUYENDO el suelo)
        for (let i = 0; i < this.world.contacts.length; i++) {
          const contact = this.world.contacts[i];
          if (contact.bi === this.playerBody || contact.bj === this.playerBody) {
            const otherBody = contact.bi === this.playerBody ? contact.bj : contact.bi;
            
            // FILTRAR: Ignorar el suelo (Y=0) y solo mostrar objetos reales (árboles, rocas, edificios)
            if (otherBody.position.y > 0.1 || Math.abs(otherBody.position.x) > 0.1 || Math.abs(otherBody.position.z) > 0.1) {
              console.log(`💥 COLISIÓN JUGADOR con objeto en pos=(${otherBody.position.x.toFixed(1)}, ${otherBody.position.y.toFixed(1)}, ${otherBody.position.z.toFixed(1)})`);
            }
          }
        }
      }
    });
    
    console.log('🌍 Cannon.js physics world initialized with SAPBroadphase');
  }

  private setupMaterials() {
    // Material del suelo (guardar como propiedad)
    this.groundMaterial = new CANNON.Material('ground');
    const groundContactMaterial = new CANNON.ContactMaterial(
      this.groundMaterial,
      this.groundMaterial,
      {
        friction: 0.8, // Alta fricción
        restitution: 0.0, // SIN REBOTE
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(groundContactMaterial);

    // Material del jugador (guardar como propiedad)
    this.playerMaterial = new CANNON.Material('player');
    const playerGroundContact = new CANNON.ContactMaterial(
      this.playerMaterial,
      this.groundMaterial,
      {
        friction: 0.9, // Alta fricción entre jugador y suelo
        restitution: 0.0, // SIN REBOTE - CRÍTICO
        contactEquationStiffness: 1e8, // Muy rígido para evitar penetración
        contactEquationRelaxation: 3, // Relajación para estabilidad
      }
    );
    this.world.addContactMaterial(playerGroundContact);

    // Material para árboles, rocas y edificios (guardar como propiedad)
    this.staticMaterial = new CANNON.Material('static');
    const playerStaticContact = new CANNON.ContactMaterial(
      this.playerMaterial,
      this.staticMaterial,
      {
        friction: 0.3, // Baja fricción para deslizarse
        restitution: 0.0, // SIN REBOTE
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(playerStaticContact);
    
    console.log('✅ Materiales de física configurados correctamente');
  }

  createGround() {
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.position.set(0, 0, 0); // Suelo en Y=0 (nivel del terreno visual)
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.material = this.groundMaterial; // Usar material compartido
    
    this.world.addBody(groundBody);
    console.log('🏞️ Ground created at Y=0');
    return groundBody;
  }

  createPlayer(position: { x: number; y: number; z: number }) {
    // Crear cuerpo del jugador (cilindro de altura 2, radio 0.5)
    // En Cannon.js, los cilindros YA están verticales por defecto (eje Y)
    const cylinderHeight = 2;
    const playerShape = new CANNON.Cylinder(0.5, 0.5, cylinderHeight, 8);
    const playerBody = new CANNON.Body({ mass: 1 });
    playerBody.addShape(playerShape);
    
    // Levantar ligeramente el cilindro para evitar colisión constante con el suelo
    this.playerBaseY = cylinderHeight / 2 + 0.05; // Centro en Y=1.05 (base en Y=0.05)
    playerBody.position.set(position.x, this.playerBaseY, position.z);
    playerBody.material = this.playerMaterial; // Usar material compartido
    
    // Configurar propiedades físicas para evitar rebote
    playerBody.allowSleep = false; // DESACTIVAR sleep para que siempre se actualice
    playerBody.collisionResponse = true; // CRÍTICO: Responder a colisiones
    playerBody.linearDamping = 0.1; // Muy bajo para permitir movimiento fluido
    playerBody.angularDamping = 1.0;
    playerBody.fixedRotation = true; // Evitar rotación no deseada
    
    this.world.addBody(playerBody);
    this.playerBody = playerBody;
    this.bodies.set('player', playerBody);
    
    console.log(`👤 Player body created at Y=${this.playerBaseY} (aligned with visual model)`);
    return playerBody;
  }

  update(deltaTime: number) {
    // Timestep fijo para estabilidad
    this.world.step(1/60, deltaTime, 8); // fijo + substeps
    
    // Debug: Mostrar cuántos bodies hay en el mundo (cada 3 segundos)
    if (!this.lastDebugTime || Date.now() - this.lastDebugTime > 3000) {
      console.log(`🌍 Bodies en el mundo: ${this.world.bodies.length} (player + ground + ${this.bodies.size - 1} colliders)`);
      console.log(`📋 Colliders creados:`, Array.from(this.bodies.keys()));
      this.lastDebugTime = Date.now();
    }
  }
  
  private lastDebugTime = 0;

  updateMovement(input: { x: number; z: number; isRunning: boolean }, deltaTime: number) {
    if (!this.playerBody) {
      console.log('⚠️ updateMovement: playerBody is null');
      return;
    }

    // Calcular velocidad objetivo (aumentada para movimiento más rápido)
    const maxSpeed = input.isRunning ? 12 : 7;
    this.targetVelocity.x = input.x * maxSpeed;
    this.targetVelocity.z = input.z * maxSpeed;

    // Interpolar hacia la velocidad objetivo
    const lerpSpeed = (input.x !== 0 || input.z !== 0) ? this.acceleration : this.deceleration;
    const lerpFactor = lerpSpeed * deltaTime;

    this.currentVelocity.x = this.lerp(this.currentVelocity.x, this.targetVelocity.x, lerpFactor);
    this.currentVelocity.z = this.lerp(this.currentVelocity.z, this.targetVelocity.z, lerpFactor);

    // Aplicar velocidad al cuerpo (restaurar movimiento normal)
    this.playerBody.velocity.x = this.currentVelocity.x;
    this.playerBody.velocity.z = this.currentVelocity.z;

    // Debug (comentado para no llenar la consola)
    // if (input.x !== 0 || input.z !== 0) {
    //   console.log(`🔧 Cannon updateMovement: input=(${input.x.toFixed(2)}, ${input.z.toFixed(2)}), target=(${this.targetVelocity.x.toFixed(2)}, ${this.targetVelocity.z.toFixed(2)}), current=(${this.currentVelocity.x.toFixed(2)}, ${this.currentVelocity.z.toFixed(2)}), bodyVel=(${this.playerBody.velocity.x.toFixed(2)}, ${this.playerBody.velocity.z.toFixed(2)}), pos=(${this.playerBody.position.x.toFixed(2)}, ${this.playerBody.position.z.toFixed(2)})`);
    // }

    // Clamp vertical movement: si toca suelo, corrige penetración y anula velocidad vertical negativa
    if (this.playerBody.position.y <= this.playerBaseY + 0.01) {
      if (this.playerBody.position.y < this.playerBaseY) {
        this.playerBody.position.y = this.playerBaseY;
      }
      if (this.playerBody.velocity.y < 0) {
        this.playerBody.velocity.y = 0;
      }
    }
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
    
    // Solo saltar si está en el suelo (centro del cilindro en Y=1.05)
    if (this.isGrounded()) {
      this.playerBody.velocity.y = force;
      console.log(`🦘 Jump applied: ${force}`);
    }
  }

  isGrounded(): boolean {
    if (!this.playerBody) return false;
    // El jugador está en el suelo cuando su centro está en la base prevista (±0.05)
    return this.playerBody.position.y <= this.playerBaseY + 0.05;
  }

  setPlayerPosition(position: { x: number; y: number; z: number }) {
    if (!this.playerBody) return;
    
    this.playerBody.position.set(position.x, position.y, position.z);
  }

  getWorld(): CANNON.World {
    return this.world;
  }

  // Crear collider cilíndrico para árboles
  createTreeCollider(position: [number, number, number], radius: number = 0.5, height: number = 5, id: string) {
    if (this.bodies.has(id)) {
      console.log(`⚠️ Tree collider ${id} already exists`);
      return;
    }

    const shape = new CANNON.Cylinder(radius, radius, height, 8);
    const body = new CANNON.Body({ mass: 0 }); // mass 0 = estático
    body.addShape(shape);
    body.position.set(position[0], position[1] + height / 2, position[2]);
    body.material = this.staticMaterial; // Usar material compartido
    
    // IMPORTANTE: Asegurar que el body no se duerma
    body.allowSleep = false;
    body.collisionResponse = true; // Asegurar respuesta de colisión
    
    this.world.addBody(body);
    this.bodies.set(id, body);
    console.log(`🌳 Tree collider created: ${id} at (${position[0].toFixed(1)}, ${position[1].toFixed(1)}, ${position[2].toFixed(1)}) radius=${radius.toFixed(2)} height=${height.toFixed(2)}`);
  }

  // Crear collider esférico para rocas
  createRockCollider(position: [number, number, number], radius: number = 1.0, id: string) {
    if (this.bodies.has(id)) {
      console.log(`⚠️ Rock collider ${id} already exists`);
      return;
    }

    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({ mass: 0 }); // mass 0 = estático
    body.addShape(shape);
    body.position.set(position[0], position[1] + radius, position[2]);
    body.material = this.staticMaterial; // Usar material compartido
    
    // IMPORTANTE: Asegurar que el body no se duerma
    body.allowSleep = false;
    body.collisionResponse = true; // Asegurar respuesta de colisión
    
    this.world.addBody(body);
    this.bodies.set(id, body);
    console.log(`🪨 Rock collider created: ${id} at (${position[0].toFixed(1)}, ${position[1].toFixed(1)}, ${position[2].toFixed(1)}) radius=${radius.toFixed(2)}`);
  }

  // Crear collider de caja para edificios
  createBoxCollider(position: [number, number, number], size: [number, number, number], id: string) {
    if (this.bodies.has(id)) {
      console.log(`⚠️ Box collider ${id} already exists`);
      return;
    }

    const shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
    const body = new CANNON.Body({ mass: 0 }); // mass 0 = estático
    body.addShape(shape);
    body.position.set(position[0], position[1] + size[1] / 2, position[2]);
    body.material = this.staticMaterial; // Usar material compartido
    
    // IMPORTANTE: Asegurar que el body no se duerma y responda a colisiones
    body.allowSleep = false;
    body.collisionResponse = true; // CRÍTICO para bloquear al jugador
    
    this.world.addBody(body);
    this.bodies.set(id, body);
    console.log(`🏢 Building collider created: ${id} at (${position[0].toFixed(1)}, ${position[1].toFixed(1)}, ${position[2].toFixed(1)}) size=(${size[0]}, ${size[1]}, ${size[2]})`);
  }

  // 🚀 NUEVO: Crear body desde forma de three-to-cannon
  createBodyFromShape(
    cannonShape: any, 
    position: { x: number; y: number; z: number }, 
    rotation: { x: number; y: number; z: number },
    scale: { x: number; y: number; z: number },
    id: string
  ) {
    if (this.bodies.has(id)) {
      return;
    }

    const body = new CANNON.Body({ mass: 0 }); // mass 0 = estático
    body.addShape(cannonShape);
    body.position.set(position.x, position.y, position.z);
    body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    body.material = this.staticMaterial;
    
    // IMPORTANTE: Asegurar que el body no se duerma y responda a colisiones
    body.allowSleep = false;
    body.collisionResponse = true;
    
    this.world.addBody(body);
    this.bodies.set(id, body);
    console.log(`🚀 Automatic collider created: ${id} at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}) shape=${cannonShape.type}`);
    
    return body;
  }

  // Crear box colliders a partir de meshes cuyo nombre cumpla un predicado (e.g., UCX_*)
  createUCXBoxCollidersFromScene(
    scene: THREE.Object3D,
    filter: (name: string) => boolean,
    idPrefix: string
  ) {
    let count = 0;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && filter(child.name)) {
        const mesh = child as THREE.Mesh;
        mesh.updateMatrixWorld();
        const worldBox = new THREE.Box3().setFromObject(mesh);
        const size = worldBox.getSize(new THREE.Vector3());
        const center = worldBox.getCenter(new THREE.Vector3());

        const pos: [number, number, number] = [center.x, worldBox.min.y, center.z];
        const sz: [number, number, number] = [size.x, size.y, size.z];

        const id = `${idPrefix}-${child.name}-${count}`;
        if (!this.bodies.has(id)) {
          this.createBoxCollider(pos, sz, id);
          count += 1;
        }
      }
    });
    return count;
  }

  // Crear collider desde el mesh real de un modelo GLB
  createMeshCollider(mesh: THREE.Object3D, position: [number, number, number], scale: [number, number, number], id: string) {
    if (this.bodies.has(id)) {
      console.log(`⚠️ Mesh collider ${id} already exists`);
      return;
    }

    const body = new CANNON.Body({ mass: 0 }); // mass 0 = estático
    let meshesProcessed = 0;

    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry;
        
        // Obtener vértices y caras del mesh
        const vertices: number[] = [];
        const indices: number[] = [];
        
        // Posición de los vértices
        const positionAttribute = geometry.attributes.position;
        if (positionAttribute) {
          for (let i = 0; i < positionAttribute.count; i++) {
            vertices.push(
              positionAttribute.getX(i) * scale[0],
              positionAttribute.getY(i) * scale[1],
              positionAttribute.getZ(i) * scale[2]
            );
          }
          
          // Índices (caras)
          if (geometry.index) {
            for (let i = 0; i < geometry.index.count; i++) {
              indices.push(geometry.index.getX(i));
            }
          } else {
            // Si no hay índices, crear secuencia
            for (let i = 0; i < positionAttribute.count; i++) {
              indices.push(i);
            }
          }
          
          // Crear Trimesh con la geometría real
          const trimesh = new CANNON.Trimesh(vertices, indices);
          body.addShape(trimesh);
          meshesProcessed++;
        }
      }
    });

    if (meshesProcessed === 0) {
      console.warn(`⚠️ No meshes found in ${id}, skipping`);
      return;
    }

    body.position.set(position[0], position[1], position[2]);
    body.material = this.staticMaterial; // Usar material compartido
    
    // IMPORTANTE: Asegurar que el body no se duerma y responda a colisiones
    body.allowSleep = false;
    body.collisionResponse = true; // CRÍTICO para bloquear al jugador
    
    this.world.addBody(body);
    this.bodies.set(id, body);
    console.log(`🎨 Mesh collider created: ${id} with ${meshesProcessed} meshes at (${position[0].toFixed(1)}, ${position[1].toFixed(1)}, ${position[2].toFixed(1)})`);
  }

  // Marcar que los colliders estáticos ya fueron creados
  markStaticBodiesCreated() {
    this.staticBodiesCreated = true;
  }

  // Verificar si los colliders estáticos ya fueron creados
  areStaticBodiesCreated(): boolean {
    return this.staticBodiesCreated;
  }

  dispose() {
    this.world.bodies.forEach((body: CANNON.Body) => {
      this.world.removeBody(body);
    });
    this.bodies.clear();
    this.playerBody = null;
    this.staticBodiesCreated = false;
    console.log('🧹 Cannon.js physics disposed');
  }
}
