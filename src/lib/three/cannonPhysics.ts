import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { threeToCannon, ShapeType } from 'three-to-cannon';
import { PHYSICS_CONFIG } from '@/constants/physics';

export class CannonPhysics {
  private world: CANNON.World;
  private bodies: Map<string, CANNON.Body> = new Map();
  private playerBody: CANNON.Body | null = null;
  private playerBaseY: number = 1.05; // Altura base del centro del jugador sobre el suelo
  private currentVelocity = { x: 0, z: 0 };
  private targetVelocity = { x: 0, z: 0 };
  private acceleration = PHYSICS_CONFIG.ACCELERATION; // Velocidad de aceleración
  private deceleration = PHYSICS_CONFIG.DECELERATION; // Velocidad de desaceleración
  private staticBodiesCreated = false; // Flag para evitar recrear colliders estáticos
  
  // Materiales compartidos (CRÍTICO para que funcionen las colisiones)
  private playerMaterial!: CANNON.Material;
  private groundMaterial!: CANNON.Material;
  private staticMaterial!: CANNON.Material;

  constructor() {
    // Crear mundo de física
    this.world = new CANNON.World();
    
    // Configurar gravedad desde constantes
    this.world.gravity.set(0, PHYSICS_CONFIG.GRAVITY, 0);
    
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

  // Crear colliders UCX automáticamente (Box) a partir de la escena
  createUCXAutoCollidersFromScene(
    scene: THREE.Object3D,
    idPrefix: string
  ) {
    // Aprovecha el creador de cajas existente y oculta los UCX
    return this.createUCXBoxCollidersFromScene(
      scene,
      (n) => n.startsWith('UCX_') || /ucx|collision/i.test(n),
      `${idPrefix}-ucx`
    );
  }

  // Crear colliders Trimesh a partir de meshes cuyo nombre cumpla un predicado (para colinas, terreno, rocas)
  createNamedTrimeshCollidersFromScene(
    scene: THREE.Object3D,
    filter: (name: string) => boolean,
    idPrefix: string
  ) {
    let count = 0;
    const matchesWithAncestors = (obj: THREE.Object3D): boolean => {
      let current: THREE.Object3D | null = obj;
      while (current) {
        if (filter(current.name)) return true;
        current = current.parent;
      }
      return false;
    };

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && matchesWithAncestors(child)) {
        const mesh = child as THREE.Mesh;
        mesh.updateMatrixWorld(true);

        const id = `${idPrefix}-${child.name}-${count}`;
        if (this.bodies.has(id)) return;

        // Prioriza Convex para Hill_03.001; si no, usa Trimesh robusto desde world-geometry
        if (/^(Hill_03\.001)$/i.test(child.name)) {
          const res = threeToCannon(mesh, { type: ShapeType.HULL });
          if (res?.shape) {
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(res.shape, res.offset, res.orientation);
            const wp = new THREE.Vector3(); mesh.getWorldPosition(wp);
            const wq = new THREE.Quaternion(); mesh.getWorldQuaternion(wq);
            body.position.set(wp.x, wp.y, wp.z);
            body.quaternion.set(wq.x, wq.y, wq.z, wq.w);
            body.material = this.staticMaterial; body.allowSleep = false; body.collisionResponse = true;
            this.world.addBody(body); this.bodies.set(id, body); count += 1; 
            // Mantener visible el mesh visual (no transparente)
            return;
          }
        }

        // Fallback: Trimesh robusto desde world-geometry
        const created = this.createTrimeshColliderFromWorldMesh(mesh, id);
        if (created) { count += 1; /* mantener visible */ }
      }
    });
    if (count > 0) {
      console.log(`⛰️  ${count} Trimesh colliders generados (${idPrefix})`);
    }
    return count;
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
    // 👣 Pie esférico para colisionar correctamente con Trimesh
    const footRadius = 0.45;
    const footOffset = new CANNON.Vec3(0, -cylinderHeight / 2 + footRadius, 0);
    playerBody.addShape(new CANNON.Sphere(footRadius), footOffset);
    
    // Levantar ligeramente el cilindro para evitar colisión constante con el suelo
    this.playerBaseY = cylinderHeight / 2 + 0.05; // Centro en Y=1.05 (base en Y=0.05)
    playerBody.position.set(position.x, this.playerBaseY, position.z);
    playerBody.material = this.playerMaterial; // Usar material compartido
    
    // Configurar propiedades físicas para evitar rebote
    playerBody.allowSleep = false; // DESACTIVAR sleep para que siempre se actualice
    playerBody.collisionResponse = true; // CRÍTICO: Responder a colisiones
    // Un poco de damping para que el aire frene suavemente, pero deje sentir aceleración
    playerBody.linearDamping = 0.05;
    playerBody.angularDamping = 1.0;
    playerBody.fixedRotation = true; // Evitar rotación no deseada
    
    this.world.addBody(playerBody);
    this.playerBody = playerBody;
    this.bodies.set('player', playerBody);
    
    console.log(`👤 Player body created at Y=${this.playerBaseY} (aligned with visual model)`);
    return playerBody;
  }

  update(deltaTime: number) {
    // Timestep fijo para estabilidad (desacoplado de UI/settings)
    const fixedTimeStep = PHYSICS_CONFIG.MAX_DELTA_TIME; // p.ej. 1/60
    this.world.step(fixedTimeStep, deltaTime, 8);
    
    // Debug: Mostrar cuántos bodies hay en el mundo (cada 3 segundos)
    if (!this.lastDebugTime || Date.now() - this.lastDebugTime > 3000) {
      // console.log(`🌍 Bodies en el mundo: ${this.world.bodies.length} (player + ground + ${this.bodies.size - 1} colliders)`);
      // console.log(`📋 Colliders creados:`, Array.from(this.bodies.keys()));
      // console.log(`🔍 Player body exists:`, !!this.playerBody);
      // console.log(`🎯 World bodies:`, this.world.bodies.map(b => b.id || 'unnamed'));
      this.lastDebugTime = Date.now();
    }
  }
  
  private lastDebugTime = 0;

  updateMovement(input: { x: number; z: number; isRunning: boolean; stamina: number }, deltaTime: number) {
    if (!this.playerBody) {
      console.log('⚠️ updateMovement: playerBody is null');
      return;
    }

    // Solo permitir correr si hay stamina suficiente (mínimo 10 puntos)
    const canRun = input.isRunning && input.stamina > 10;
    
    // Calcular velocidad objetivo (ajustada para 60 FPS)
    const maxSpeed = canRun ? 12 : 7; // Solo correr si hay stamina
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

    // Si no hay stamina, fuerza a detener el sprint (seguridad extra)
    if (!canRun && (Math.abs(this.playerBody.velocity.x) > 12 || Math.abs(this.playerBody.velocity.z) > 12)) {
      this.playerBody.velocity.x = Math.sign(this.playerBody.velocity.x) * 7;
      this.playerBody.velocity.z = Math.sign(this.playerBody.velocity.z) * 7;
    }

    // Debug (comentado para no llenar la consola)
    // if (input.x !== 0 || input.z !== 0) {
    //   console.log(`🔧 Cannon updateMovement: input=(${input.x.toFixed(2)}, ${input.z.toFixed(2)}), target=(${this.targetVelocity.x.toFixed(2)}, ${this.targetVelocity.z.toFixed(2)}), current=(${this.currentVelocity.x.toFixed(2)}, ${this.currentVelocity.z.toFixed(2)}), bodyVel=(${this.playerBody.velocity.x.toFixed(2)}, ${this.playerBody.velocity.z.toFixed(2)}), pos=(${this.playerBody.position.x.toFixed(2)}, ${this.playerBody.position.z.toFixed(2)})`);
    // }

    // Clamp vertical movement: si toca suelo, corrige penetración y opcionalmente amortigua caída
    if (this.playerBody.position.y <= this.playerBaseY + 0.01) {
      if (this.playerBody.position.y < this.playerBaseY) {
        this.playerBody.position.y = this.playerBaseY;
      }
      if (this.playerBody.velocity.y < 0) {
        // amortiguar el impacto sin eliminar aceleración en el aire
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

  /**
   * Teleporta al jugador a una posición específica
   * @param position Nueva posición del jugador
   * @param rotation Nueva rotación del jugador (opcional)
   */
  teleportPlayer(position: { x: number; y: number; z: number }, rotation?: { x: number; y: number; z: number }) {
    if (!this.playerBody) {
      console.warn('⚠️ No se puede teleportar: playerBody no existe');
      return;
    }

    console.log(`🚀 TELEPORT CALLED - ANTES: pos=${this.playerBody.position.x.toFixed(2)}, ${this.playerBody.position.y.toFixed(2)}, ${this.playerBody.position.z.toFixed(2)}`);
    console.log(`🚀 TELEPORT CALLED - TARGET: pos=${position.x}, ${position.y}, ${position.z}`);
    console.log(`🚀 TELEPORT CALLED - ROTATION:`, rotation);

    // Detener cualquier movimiento actual
    this.playerBody.velocity.set(0, 0, 0);
    this.playerBody.angularVelocity.set(0, 0, 0);
    
    // Establecer nueva posición
    this.playerBody.position.set(position.x, position.y, position.z);
    
    // Establecer nueva rotación si se proporciona
    if (rotation) {
      this.playerBody.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    }
    
    // Forzar actualización del cuerpo
    this.playerBody.wakeUp();
    
    console.log(`🚀 TELEPORT COMPLETED - DESPUÉS: pos=${this.playerBody.position.x.toFixed(2)}, ${this.playerBody.position.y.toFixed(2)}, ${this.playerBody.position.z.toFixed(2)}`);
    console.log(`🚀 TELEPORT SUCCESS: ${this.playerBody.position.x === position.x && this.playerBody.position.y === position.y && this.playerBody.position.z === position.z ? 'YES' : 'NO'}`);
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
    // Permitir salto aunque el centro esté levemente por encima del base Y, porque
    // algunos meshes elevan el pivote. Aceptamos un margen más amplio.
    if (this.playerBody.position.y <= this.playerBaseY + 0.12) return true;
    // Fallback: si la velocidad vertical es casi cero y hay soporte, también considerar grounded
    if (Math.abs(this.playerBody.velocity.y) < 0.01) return true;
    return false;
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
 // Crear collider de caja para edificios, muros o terreno
createBoxCollider(position: [number, number, number], size: [number, number, number], id: string) {
  // Límite máximo por eje (mientras más grande, más impreciso)
  const MAX_SIZE = 50;

  const [sx, sy, sz] = size;

  // 🔹 Si es demasiado grande, dividirlo en sub-colliders más pequeños
  if (sx > MAX_SIZE || sz > MAX_SIZE) {
    console.warn(`⚠️ Collider demasiado grande (${id}) → subdividiendo (${sx.toFixed(1)} × ${sz.toFixed(1)})`);

    // Calcular cuántas divisiones por eje
    const nx = Math.ceil(sx / MAX_SIZE);
    const nz = Math.ceil(sz / MAX_SIZE);

    // Tamaño de cada subdivisión
    const dx = sx / nx;
    const dz = sz / nz;

    // Crear múltiples colliders más pequeños
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        const offsetX = (ix - (nx - 1) / 2) * dx;
        const offsetZ = (iz - (nz - 1) / 2) * dz;

        const newPos: [number, number, number] = [
          position[0] + offsetX,
          position[1],
          position[2] + offsetZ,
        ];

        const newSize: [number, number, number] = [dx, sy, dz];
        const subId = `${id}_sub_${ix}_${iz}`;

        // Crear sub-collider
        this.createBoxCollider(newPos, newSize, subId);
      }
    }

    // No crees el collider grande original
    return;
  }

  // 🔹 Si no es grande, crear collider normal
  const shape = new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2));
  const body = new CANNON.Body({ mass: 0 });
  body.addShape(shape);
  body.position.set(position[0], position[1] + sy / 2, position[2]);
  body.material = this.staticMaterial;
  body.allowSleep = false;
  body.collisionResponse = true;

  this.world.addBody(body);
  this.bodies.set(id, body);
  console.log(`🏢 Box collider creado: ${id} → size=(${sx.toFixed(1)}, ${sy.toFixed(1)}, ${sz.toFixed(1)})`);
}


  // 🚀 NUEVO: Crear body desde forma de three-to-cannon
  createBodyFromShape(
    cannonShape: CANNON.Shape, 
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
    console.log(`🔧 createUCXBoxCollidersFromScene: Starting with prefix ${idPrefix}`);
    
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && filter(child.name)) {
        console.log(`🎯 Found UCX mesh: ${child.name}`);
        const mesh = child as THREE.Mesh;
        
        // 🔹 Hacer invisible el mesh UCX (solo para collider)
        mesh.visible = false;
        console.log(`👻 Mesh UCX oculto: ${child.name}`);
        
        mesh.updateMatrixWorld();
        const worldBox = new THREE.Box3().setFromObject(mesh);
        const size = worldBox.getSize(new THREE.Vector3());
        const center = worldBox.getCenter(new THREE.Vector3());

        const pos: [number, number, number] = [center.x, worldBox.min.y, center.z];
        // 👉 Asegurar grosor mínimo para planos (si algún eje es ~0, no colisiona)
        const MIN_THICKNESS = 0.2; // 20cm
        const sx = Math.max(size.x, MIN_THICKNESS);
        const sy = Math.max(size.y, MIN_THICKNESS);
        const sz = Math.max(size.z, MIN_THICKNESS);
        const szVec: [number, number, number] = [sx, sy, sz];

        const id = `${idPrefix}-${child.name}-${count}`;
        if (!this.bodies.has(id)) {
          this.createBoxCollider(pos, szVec, id);
          count += 1;
        }
      }
    });
    
    console.log(`📊 UCX Box Colliders created: ${count} for prefix ${idPrefix}`);
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
      if (child instanceof THREE.Mesh) {
        // Preferir three-to-cannon para respetar transformaciones y normales (backface/clockwise)
        const result = threeToCannon(child, { type: ShapeType.MESH });
        if (result && result.shape) {
          // Respetar offset y orientación calculados por three-to-cannon
          body.addShape(result.shape, result.offset, result.orientation);
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
    console.log(`🎨 Mesh collider created (three-to-cannon): ${id} with ${meshesProcessed} meshes at (${position[0].toFixed(1)}, ${position[1].toFixed(1)}, ${position[2].toFixed(1)})`);
  }

  // 📦 Fallback: crear colliders de caja a partir del bounding box mundial de un Object3D (grupos completos)
  createBBoxCollidersFromScene(
    scene: THREE.Object3D,
    filter: (name: string, obj: THREE.Object3D) => boolean,
    idPrefix: string
  ) {
    let count = 0;
    scene.traverse((child) => {
      if (!filter(child.name, child)) return;
      const box = new THREE.Box3().setFromObject(child);
      if (!box.isEmpty()) {
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const id = `${idPrefix}-bbox-${child.name}-${count}`;
        if (!this.bodies.has(id)) {
          const pos: [number, number, number] = [center.x, box.min.y, center.z];
          const sz: [number, number, number] = [size.x, size.y, size.z];
          this.createBoxCollider(pos, sz, id);
          count += 1;
        }
      }
    });
    if (count > 0) console.log(`📦 BBox colliders creados: ${count} (${idPrefix})`);
    return count;
  }

  // Construir Trimesh robusto aplicando matrixWorld y limpiando triángulos degenerados
  private createTrimeshColliderFromWorldMesh(mesh: THREE.Mesh, id: string) {
    const geom = mesh.geometry;
    const posAttr = geom?.attributes?.position;
    if (!geom || !posAttr || posAttr.count < 3) return false;

    const cloned = geom.clone();
    cloned.applyMatrix4(mesh.matrixWorld);

    const p = cloned.attributes.position as THREE.BufferAttribute;
    const idx = cloned.index;

    const vertices: number[] = [];
    for (let i = 0; i < p.count; i++) {
      vertices.push(p.getX(i), p.getY(i), p.getZ(i));
    }

    const indices: number[] = [];
    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i));
    } else {
      for (let i = 0; i < p.count; i++) indices.push(i);
    }

    // Filtrar triángulos degenerados
    const filtered: number[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      if (a !== b && b !== c && a !== c) filtered.push(a, b, c);
    }

    const trimesh = new CANNON.Trimesh(vertices, filtered);
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(trimesh);
    body.material = this.staticMaterial; body.allowSleep = false; body.collisionResponse = true;
    this.world.addBody(body); this.bodies.set(id, body);
    return true;
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

  // 🔥 Remover bodies por prefijo de id (útil al cambiar de mapa)
  removeBodiesByPrefix(prefix: string): number {
    const ids = Array.from(this.bodies.keys());
    let removed = 0;
    for (const id of ids) {
      if (id.startsWith(prefix)) {
        const body = this.bodies.get(id);
        if (body) {
          this.world.removeBody(body);
          this.bodies.delete(id);
          removed += 1;
        }
      }
    }
    if (removed > 0) {
      console.log(`🧹 Removed ${removed} bodies by prefix: ${prefix}`);
    }
    return removed;
  }
}
