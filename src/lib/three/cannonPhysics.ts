import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { threeToCannon, ShapeType } from 'three-to-cannon';
import { PHYSICS_CONFIG } from '@/constants/physics';
import { CollisionGroups, CollisionMasks } from '@/constants/collisionGroups';
import { GAME_CONFIG } from '@/constants/game';
import { SpringSimulator } from '../physics/SpringSimulator';

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
  private vehicleState: Map<string, {
    reverseMode: boolean;
    steeringSimulator?: SpringSimulator;
    airSpinTimer?: number;
    // Sistema de transmisión
    gear?: number;           // Marcha actual (1-5, 0=neutro, -1=reversa)
    shiftTimer?: number;     // Timer para cambios de marcha suaves
  }> = new Map();
  
  // Materiales compartidos (CRÍTICO para que funcionen las colisiones)
  private playerMaterial!: CANNON.Material;
  private groundMaterial!: CANNON.Material;
  private staticMaterial!: CANNON.Material;
  private vehicleMaterial!: CANNON.Material;

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
            const body = new CANNON.Body({ 
              mass: 0,
              collisionFilterGroup: CollisionGroups.Default,
              collisionFilterMask: -1, // Colisiona con todo
            });
            body.addShape(res.shape, res.offset, res.orientation);
            const wp = new THREE.Vector3(); mesh.getWorldPosition(wp);
            const wq = new THREE.Quaternion(); mesh.getWorldQuaternion(wq);
            body.position.set(wp.x, wp.y, wp.z);
            body.quaternion.set(wq.x, wq.y, wq.z, wq.w);
            body.material = this.staticMaterial; body.allowSleep = false; body.collisionResponse = true;
            
            // Aplicar CollisionGroups a todas las shapes del body
            body.shapes.forEach((shape) => {
              shape.collisionFilterGroup = CollisionGroups.Default;
              shape.collisionFilterMask = -1;
            });
            
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
        friction: 0.3, // Fricción reducida para movimiento fluido
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
        friction: 0.1, // Fricción muy baja para no frenar al correr
        restitution: 0.0, // SIN REBOTE
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(playerStaticContact);

    // Material del vehículo (neumáticos/chasis) y contactos relevantes
    this.vehicleMaterial = new CANNON.Material('vehicle');
    const vehicleGround = new CANNON.ContactMaterial(
      this.vehicleMaterial,
      this.groundMaterial,
      {
        friction: 0.1, // REVERTIDO a valor original
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      }
    );
    const vehicleStatic = new CANNON.ContactMaterial(
      this.vehicleMaterial,
      this.staticMaterial,
      {
        friction: 0.2,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(vehicleGround);
    this.world.addContactMaterial(vehicleStatic);
    
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
    const playerBody = new CANNON.Body({ 
      mass: 1,
      // CollisionGroups (Sketchbook): Personaje pertenece al grupo Characters
      collisionFilterGroup: CollisionGroups.Characters,
      collisionFilterMask: CollisionMasks.Character,
    });
    playerBody.addShape(playerShape);
    
    // 👣 Pie esférico para colisionar correctamente con Trimesh
    const footRadius = 0.45;
    const footOffset = new CANNON.Vec3(0, -cylinderHeight / 2 + footRadius, 0);
    const footShape = new CANNON.Sphere(footRadius);
    // Aplicar CollisionGroups a la forma del pie también
    footShape.collisionFilterGroup = CollisionGroups.Characters;
    footShape.collisionFilterMask = CollisionMasks.Character;
    playerBody.addShape(footShape, footOffset);
    
    // Aplicar CollisionGroups a todas las shapes del cuerpo
    playerBody.shapes.forEach((shape) => {
      shape.collisionFilterGroup = CollisionGroups.Characters;
      shape.collisionFilterMask = CollisionMasks.Character;
    });
    
    // Levantar ligeramente el cilindro para evitar colisión constante con el suelo
    this.playerBaseY = cylinderHeight / 2 + 0.05; // Centro en Y=1.05 (base en Y=0.05)
    playerBody.position.set(position.x, this.playerBaseY, position.z);
    playerBody.material = this.playerMaterial; // Usar material compartido
    
    // Configurar propiedades físicas para evitar rebote
    playerBody.allowSleep = false; // DESACTIVAR sleep para que siempre se actualice
    playerBody.collisionResponse = true; // CRÍTICO: Responder a colisiones
    // Damping muy bajo para caída natural sin frenado escalonado
    playerBody.linearDamping = 0.0; // Sin damping para caída natural (antes: 0.05)
    playerBody.angularDamping = 1.0;
    playerBody.fixedRotation = true; // Evitar rotación no deseada
    
    this.world.addBody(playerBody);
    this.playerBody = playerBody;
    this.bodies.set('player', playerBody);
    
    console.log(`👤 Player body created at Y=${this.playerBaseY} (aligned with visual model)`);
    console.log(`🟢 Player CollisionGroup: Characters (${CollisionGroups.Characters})`);
    console.log(`🎯 Player CollisionMask: ${CollisionMasks.Character} (colisiona con Default y Vehicles)`);
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

    // Detectar si está en el aire
    const isGrounded = this.isGrounded();
    
    // Solo permitir correr si hay stamina suficiente (mínimo 10 puntos)
    const canRun = input.isRunning && input.stamina > 10;
    
    // Calcular velocidad objetivo (ajustada para 60 FPS)
    const maxSpeed = canRun ? 12 : 7; // Solo correr si hay stamina
    this.targetVelocity.x = input.x * maxSpeed;
    this.targetVelocity.z = input.z * maxSpeed;

    // Control en el aire: Reducir significativamente el control
    const airControlFactor = isGrounded ? 1.0 : 0.05; // 5% de control en el aire
    
    // Interpolar hacia la velocidad objetivo
    const lerpSpeed = (input.x !== 0 || input.z !== 0) ? this.acceleration : this.deceleration;
    const lerpFactor = lerpSpeed * deltaTime * airControlFactor;

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

  setPlayerVelocityZero() {
    if (!this.playerBody) return;
    this.playerBody.velocity.set(0, 0, 0);
    this.playerBody.angularVelocity.set(0, 0, 0);
  }

  // Obtener transform de un body por id
  getBodyTransform(id: string): { position: { x: number; y: number; z: number }; rotationY: number } | null {
    const body = this.bodies.get(id);
    if (!body) return null;
    const p = body.position;
    // Extraer yaw aproximado desde quaternion
    const q = body.quaternion;
    // Convert quaternion to Euler yaw (y)
    const ysqr = q.y * q.y;
    // source: standard conversion
    const t3 = +2.0 * (q.w * q.y + q.x * q.z);
    const t4 = +1.0 - 2.0 * (ysqr + q.z * q.z);
    const yaw = Math.atan2(t3, t4);
    return { position: { x: p.x, y: p.y, z: p.z }, rotationY: yaw };
  }

  // Obtener velocidad lineal de un body por id
  getBodyVelocity(id: string): { x: number; y: number; z: number } | null {
    const body = this.bodies.get(id);
    if (!body) return null;
    return { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z };
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

  // 🚗 Construir vehículo básico (raycast-like simplificado usando un box dinámico)
  createSimpleVehicle(position: { x: number; y: number; z: number }, id: string) {
    if (this.bodies.has(id)) return this.bodies.get(id)!;
    const body = new CANNON.Body({ mass: 800 }); // kg aproximados
    const chassis = new CANNON.Box(new CANNON.Vec3(0.9, 0.7, 2.1));
    body.addShape(chassis);
    body.position.set(position.x, position.y + 0.8, position.z);
    body.material = this.staticMaterial;
    body.angularDamping = 0.7;
    body.linearDamping = 0.1;
    this.world.addBody(body);
    this.bodies.set(id, body);
    return body;
  }

  // Controles básicos para vehículo (aceleración/freno/steer)
  updateSimpleVehicle(id: string, input: { throttle: number; brake: number; steer: number }, deltaTime: number) {
    const body = this.bodies.get(id);
    if (!body) return;
    // Dirección (gira el quaternion y aplica fuerza hacia el frente local)
    const steerAngle = input.steer * 0.8 * deltaTime; // rad/s
    const q = body.quaternion;
    const euler = new CANNON.Vec3();
    q.toEuler(euler);
    euler.y += steerAngle;
    q.setFromEuler(euler.x, euler.y, euler.z);

    // Vector forward (local -Z en Cannon default) → usamos -Z como forward
    const forward = new CANNON.Vec3(0, 0, -1);
    const worldForward = q.vmult(forward);
    const engineForce = (input.throttle - input.brake) * 4000; // N
    const force = worldForward.scale(engineForce);
    body.applyForce(force, body.position);
  }

  // ==== Raycast Vehicle (Cannon) - versión básica ====
  createRaycastVehicle(position: { x: number; y: number; z: number }, id: string, rotationY: number = 0) {
    if (this.bodies.has(id)) return this.bodies.get(id)!;
    const chassisBody = new CANNON.Body({ 
      mass: 600,
      // IMPORTANTE: Cannon.js usa los CollisionGroups del BODY cuando tiene shapes
      collisionFilterGroup: CollisionGroups.Vehicles,
      collisionFilterMask: CollisionMasks.VehicleBody,
    });
    // Chasis con dimensiones ORIGINALES pero ELEVADO para evitar arrastre
    // Dimensiones originales: ancho 1.6m, alto 1.0m, largo 3.8m
    const chassisShape = new CANNON.Box(new CANNON.Vec3(0.8, 0.5, 1.9));
    // TAMBIÉN aplicar al shape (por si acaso, aunque el body es lo que cuenta)
    chassisShape.collisionFilterGroup = CollisionGroups.Vehicles;
    chassisShape.collisionFilterMask = CollisionMasks.VehicleBody;
    // SUBIR el shape para que NO toque el suelo (offset Y=0.4 - ESTO ES LO QUE ARREGLÓ EL PROBLEMA)
    chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.7, 0));
    
    // 🎯 SKETCHBOOK: Agregar esferas en las esquinas para detectar colisiones laterales
    // IMPORTANTE: Las esferas deben estar ARRIBA del nivel del suelo para NO frenar el vehículo
    const sphereRadius = 0.7; // Radio GRANDE para cubrir más área lateral (sin dejar huecos)
    const sphereOffsetY = 0.7; // Altura aumentada para NO golpear el piso
    const sphereOffsetX = 0.7; // Separación horizontal (ancho del carro)
    const sphereOffsetZ = 1.6; // Separación longitudinal (largo del carro)
    
    // 4 esferas en las esquinas delanteras y traseras
    const cornerSphere = new CANNON.Sphere(sphereRadius);
    cornerSphere.collisionFilterGroup = CollisionGroups.Vehicles;
    cornerSphere.collisionFilterMask = CollisionMasks.VehicleBody;
    // IMPORTANTE: Aplicar el material del vehículo para baja fricción
    cornerSphere.material = this.vehicleMaterial;
    
    // Delante izquierda
    chassisBody.addShape(cornerSphere, new CANNON.Vec3(-sphereOffsetX, sphereOffsetY, sphereOffsetZ));
    // Delante derecha
    chassisBody.addShape(cornerSphere, new CANNON.Vec3(sphereOffsetX, sphereOffsetY, sphereOffsetZ));
    // Atrás izquierda
    chassisBody.addShape(cornerSphere, new CANNON.Vec3(-sphereOffsetX, sphereOffsetY, -sphereOffsetZ));
    // Atrás derecha
    chassisBody.addShape(cornerSphere, new CANNON.Vec3(sphereOffsetX, sphereOffsetY, -sphereOffsetZ));
    
    // 🎯 Cilindro horizontal en el medio para cubrir el hueco central
    // El cilindro está orientado en el eje Z (frente-atrás del vehículo)
    const cylinderRadius = 0.5; // Radio del cilindro
    const cylinderLength = 3.0; // Longitud del cilindro (cubre todo el largo del vehículo)
    const cylinderShape = new CANNON.Cylinder(cylinderRadius, cylinderRadius, cylinderLength, 8);
    cylinderShape.collisionFilterGroup = CollisionGroups.Vehicles;
    cylinderShape.collisionFilterMask = CollisionMasks.VehicleBody;
    cylinderShape.material = this.vehicleMaterial;
    
    // Rotar el cilindro 90° en X para que quede horizontal (eje Z)
    const cylinderQuaternion = new CANNON.Quaternion();
    cylinderQuaternion.setFromEuler(Math.PI / 2, 0, 0); // 90° en X
    
    // Posicionar el cilindro en el centro del vehículo, a la misma altura que las esferas
    chassisBody.addShape(cylinderShape, new CANNON.Vec3(0, sphereOffsetY, 0), cylinderQuaternion);
    
    // Posicionar chasis elevado para que las ruedas toquen el suelo correctamente
    // Cálculo: suspensionRestLength (0.35) + radius (0.38) + clearance (0.3) = ~1.0
    chassisBody.position.set(position.x, position.y + 1.0, position.z);
    chassisBody.quaternion.setFromEuler(0, rotationY, 0);
    chassisBody.angularDamping = 0.5;
    chassisBody.linearDamping = 0.02; // resistencia moderada
    chassisBody.material = this.vehicleMaterial;
    
    // DEBUG: Escuchar eventos de colisión del vehículo (solo objetos importantes)
    let lastLogTime = 0;
    chassisBody.addEventListener('collide', (event: any) => {
      const otherBody = event.body as CANNON.Body;
      const bodyId = Array.from(this.bodies.entries()).find(([_, b]) => b === otherBody)?.[0] || 'unknown';
      // Solo loguear colisiones con árboles, edificios, rocas (no terreno/ground)
      if (bodyId.includes('Tree_') || bodyId.includes('Building') || bodyId.includes('Rock') || bodyId.includes('SM_') || bodyId.includes('UCX_')) {
        const now = Date.now();
        if (now - lastLogTime > 500) { // Throttle: 1 log cada 500ms
          console.log(`🚗💥 Vehicle collided with: ${bodyId} (group=${otherBody.collisionFilterGroup}, mask=${otherBody.collisionFilterMask})`);
          lastLogTime = now;
        }
      }
    });
    
    this.world.addBody(chassisBody);

    // Nota: Las esferas en las esquinas NO son ruedas físicas. RaycastVehicle maneja
    // la suspensión y tracción. Las esferas solo detectan colisiones a nivel del suelo.
    this.bodies.set(id, chassisBody);
    
    console.log(`🚗 Vehicle ${id} created: body.group=${chassisBody.collisionFilterGroup}, body.mask=${chassisBody.collisionFilterMask}`);

    const options: {
      chassisBody: CANNON.Body;
      indexRightAxis: number;
      indexUpAxis: number;
      indexForwardAxis: number;
    } = {
      chassisBody,
      indexRightAxis: 0, // x
      indexUpAxis: 1,    // y
      indexForwardAxis: 2, // z
    };
    const RaycastVehicleCtor = (CANNON as unknown as { RaycastVehicle: new (opts: unknown) => { wheelInfos: Array<{ frictionSlip: number; rollInfluence: number; suspensionRestLength?: number; suspensionLength?: number }>; addWheel: (o: unknown)=>void; addToWorld: (w: CANNON.World)=>void; setBrake: (b:number,i:number)=>void; setSteeringValue: (v:number,i:number)=>void; applyEngineForce: (f:number,i:number)=>void; getWheelInfo: (i:number)=>{ worldTransform: { position: CANNON.Vec3 } } } }).RaycastVehicle;
    const vehicle = new RaycastVehicleCtor(options);

    const wheelOptions = {
      radius: 0.38,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 32,
      suspensionRestLength: 0.35,
      frictionSlip: 9.5, // REVERTIDO a valor original
      dampingRelaxation: 2.6,
      dampingCompression: 5.0,
      maxSuspensionForce: 120000,
      rollInfluence: 0.03,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 0.6, 0),
      maxSuspensionTravel: 0.35,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    const halfWidth = 0.85, wheelBase = 1.6;
    // FL, FR, RL, RR
    const points = [
      new CANNON.Vec3(halfWidth, 0, wheelBase),
      new CANNON.Vec3(-halfWidth, 0, wheelBase),
      new CANNON.Vec3(halfWidth, 0, -wheelBase),
      new CANNON.Vec3(-halfWidth, 0, -wheelBase),
    ];
    points.forEach((p) => {
      const opt = { ...wheelOptions, chassisConnectionPointLocal: p };
      vehicle.addWheel(opt);
    });
    // Ajustes por eje (inspirado en setups robustos): más agarre atrás, menos roll en frente
    const wi = vehicle.wheelInfos as Array<{ frictionSlip: number; rollInfluence: number }>;
    if (wi && wi.length === 4) {
      // REVERTIDO a valores originales
      wi[0].frictionSlip = 9.5; wi[1].frictionSlip = 9.5;
      wi[2].frictionSlip = 9.5; wi[3].frictionSlip = 9.5;
      wi[0].rollInfluence = 0.02; wi[1].rollInfluence = 0.02;
      wi[2].rollInfluence = 0.03; wi[3].rollInfluence = 0.03;
    }
    vehicle.addToWorld(this.world);
    // Guardar ref en bodies map usando key `${id}:vehicle`
    (this as unknown as Record<string, unknown>)[`${id}:vehicle`] = vehicle;
    // Usar constantes de steering desde GAME_CONFIG
    const steeringConfig = GAME_CONFIG.vehicle.steering;
    this.vehicleState.set(id, { 
      reverseMode: false,
      steeringSimulator: new SpringSimulator(
        steeringConfig.frequency,
        steeringConfig.damping,
        steeringConfig.mass
      ),
      airSpinTimer: 0,
      gear: 1,           // Empezar en primera marcha
      shiftTimer: 0      // Sin delay inicial
    });
    return chassisBody;
  }

  /**
   * Configuración del sistema de transmisión (desde constantes)
   */
  private readonly TRANSMISSION_CONFIG = GAME_CONFIG.vehicle.transmission;

  /**
   * Cambia a una marcha superior
   */
  private shiftUp(state: { gear?: number; shiftTimer?: number }): void {
    if (!state.gear) state.gear = 1;
    if (state.gear < this.TRANSMISSION_CONFIG.maxGears) {
      state.gear++;
      state.shiftTimer = this.TRANSMISSION_CONFIG.timeToShift;
      // console.log(`⬆️ Cambio a marcha ${state.gear}`);
    }
  }

  /**
   * Cambia a una marcha inferior
   */
  private shiftDown(state: { gear?: number; shiftTimer?: number }): void {
    if (!state.gear) state.gear = 1;
    if (state.gear > 1) {
      state.gear--;
      state.shiftTimer = this.TRANSMISSION_CONFIG.timeToShift;
      // console.log(`⬇️ Cambio a marcha ${state.gear}`);
    }
  }

  /**
   * Calcula la curva de potencia del motor basada en RPM
   * Simula un motor realista con diferentes rangos de potencia
   * 
   * @param rpm - Revoluciones por minuto del motor (1000-7000)
   * @returns Factor de potencia (0.3-1.0)
   */
  private calculatePowerCurve(rpm: number): number {
    // Configuración del motor
    const idleRPM = 1000;      // RPM en ralentí
    const peakRPM = 4000;      // RPM de máximo torque
    const redlineRPM = 7000;   // RPM máximo (línea roja)
    
    if (rpm < idleRPM) {
      // Muy bajo RPM - poco torque disponible
      return 0.3 + (rpm / idleRPM) * 0.2; // 0.3 a 0.5
    } else if (rpm < peakRPM) {
      // Subida al pico de torque (zona óptima)
      const t = (rpm - idleRPM) / (peakRPM - idleRPM);
      return 0.5 + t * 0.5; // 0.5 a 1.0
    } else if (rpm < redlineRPM) {
      // Caída después del pico (sobre-revolucionado)
      const t = (rpm - peakRPM) / (redlineRPM - peakRPM);
      return 1.0 - t * 0.3; // 1.0 a 0.7
    } else {
      // Limitador de RPM activado
      return 0.7;
    }
  }

  updateRaycastVehicle(id: string, input: { throttle: number; brake: number; steer: number; handbrake?: number }, deltaTime: number = 1/60) {
    const vehicle = (this as unknown as Record<string, { wheelInfos: Array<{ suspensionRestLength: number; suspensionLength: number }>; setBrake: (b:number,i:number)=>void; setSteeringValue: (v:number,i:number)=>void; applyEngineForce: (f:number,i:number)=>void; getWheelInfo: (i:number)=>{ worldTransform: { position: CANNON.Vec3 } }; numWheelsOnGround?: number }>)[`${id}:vehicle`];
    if (!vehicle) return;
    const chassis = this.bodies.get(id);
    const state = this.vehicleState.get(id) || { reverseMode: false, airSpinTimer: 0 };
    
    // Constantes de física del vehículo (desde GAME_CONFIG)
    const maxSteer = GAME_CONFIG.vehicle.physics.maxSteer;
    const engineForceBase = GAME_CONFIG.vehicle.physics.engineForce;
    const brakeForce = GAME_CONFIG.vehicle.physics.brakeForce;

    // Reset brakes each frame
    for (let i = 0; i < 4; i++) vehicle.setBrake(0, i);

    // Estimate forward speed along chassis forward axis (Z)
    let forwardSpeed = 0;
    if (chassis) {
      const forwardLocal = new CANNON.Vec3(0, 0, 1);
      const forwardWorld = chassis.quaternion.vmult(forwardLocal);
      forwardSpeed = chassis.velocity.dot(forwardWorld);
    }

    // ========== NUEVO: Dirección con SpringSimulator y Drift Correction (Sketchbook) ==========
    const steeringSimulator = state.steeringSimulator;
    if (steeringSimulator && chassis) {
      // Calcular drift correction (ángulo entre velocidad y dirección)
      const velocity = new CANNON.Vec3().copy(chassis.velocity);
      const velocityLength = velocity.length();
      
      let driftCorrection = 0;
      if (velocityLength > 0.5) { // Solo aplicar si hay movimiento significativo
        velocity.normalize();
        
        // Vector forward del vehículo
        const forward = chassis.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
        
        // Calcular ángulo entre velocidad y dirección (drift)
        // Usando producto cruz para determinar el signo
        const cross = new CANNON.Vec3();
        forward.cross(velocity, cross);
        const dotProduct = forward.dot(velocity);
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
        
        // Determinar signo del ángulo
        driftCorrection = cross.y < 0 ? -angle : angle;
      }
      
      // Speed factor de Sketchbook: más difícil girar a alta velocidad
      const speedFactor = Math.max(Math.abs(forwardSpeed) * 0.3, 1);
      
      // Calcular steering target con drift correction
      if (input.steer > 0.01) {
        // Girando a la derecha
        const steering = Math.min(-maxSteer / speedFactor, -driftCorrection);
        steeringSimulator.target = Math.max(-maxSteer, Math.min(maxSteer, steering));
      } else if (input.steer < -0.01) {
        // Girando a la izquierda
        const steering = Math.max(maxSteer / speedFactor, -driftCorrection);
        steeringSimulator.target = Math.max(-maxSteer, Math.min(maxSteer, steering));
      } else {
        // Sin input: volver al centro (con drift correction para ayudar a enderezar)
        steeringSimulator.target = 0;
      }
      
      // Simular física del resorte
      steeringSimulator.simulate(deltaTime);
      
      // Aplicar dirección suavizada (INVERTIDA porque Cannon.js tiene steering al revés)
      const steerVal = -steeringSimulator.position;
      
      vehicle.setSteeringValue(steerVal, 0);
      vehicle.setSteeringValue(steerVal, 1);
    } else {
      // Fallback al método anterior si no hay simulador
      const speedNorm = Math.min(Math.abs(forwardSpeed) / 25, 1);
      const speedAtt = 1 - 0.5 * speedNorm;
      const steerVal = maxSteer * speedAtt * input.steer;
      vehicle.setSteeringValue(steerVal, 0);
      vehicle.setSteeringValue(steerVal, 1);
    }
    // ========== FIN NUEVO ==========

    // ========== NUEVO: Física de Aire (Air Spin) ==========
    const wheelsOnGround = vehicle.numWheelsOnGround || 0;
    const isInAir = wheelsOnGround === 0;

    if (isInAir) {
      // Incrementar timer de aire
      state.airSpinTimer = (state.airSpinTimer || 0) + deltaTime;
      
      if (chassis) {
        // Reducir damping en el aire para permitir rotación
        chassis.angularDamping = 0.1;
        
        // Sistema de Sketchbook: airSpinInfluence crece gradualmente hasta 2 segundos
        // Esto hace que el control en el aire sea más realista
        const airSpinInfluence = Math.min(state.airSpinTimer / 2, 1) * Math.min(Math.abs(forwardSpeed), 1);
        
        // Factor de flip: más fácil hacer flips a baja velocidad
        const flipSpeedFactor = Math.max(1 - Math.abs(forwardSpeed), 0);
        
        // Detectar si está boca abajo (up factor)
        const chassisUp = chassis.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        const upFactor = (chassisUp.dot(new CANNON.Vec3(0, -1, 0)) / 2) + 0.5;
        const flipOverInfluence = flipSpeedFactor * upFactor * 3;
        
        // Constantes de control en el aire
        const maxAirSpinMagnitude = 2.0;
        const airSpinAcceleration = 0.15;
        
        // Vectores de dirección del vehículo
        const forward = chassis.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
        const right = chassis.quaternion.vmult(new CANNON.Vec3(1, 0, 0));
        
        // Vectores de spin efectivos
        const effectiveSpinForward = forward.scale(airSpinAcceleration * (airSpinInfluence + flipOverInfluence));
        const effectiveSpinRight = right.scale(airSpinAcceleration * airSpinInfluence);
        
        const angVel = chassis.angularVelocity;
        
        // Control de rotación lateral (A/D en el aire)
        if (input.steer > 0.01) {
          // Girar a la derecha
          if (angVel.dot(forward) < maxAirSpinMagnitude) {
            angVel.vadd(effectiveSpinForward, angVel);
          }
        } else if (input.steer < -0.01) {
          // Girar a la izquierda
          if (angVel.dot(forward) > -maxAirSpinMagnitude) {
            angVel.vsub(effectiveSpinForward, angVel);
          }
        }
        
        // Control de inclinación adelante/atrás (W/S en el aire)
        if (input.throttle > 0.01) {
          // Frontflip (inclinación hacia adelante)
          if (angVel.dot(right) < maxAirSpinMagnitude) {
            angVel.vadd(effectiveSpinRight, angVel);
          }
        } else if (input.brake > 0.01) {
          // Backflip (inclinación hacia atrás)
          if (angVel.dot(right) > -maxAirSpinMagnitude) {
            angVel.vsub(effectiveSpinRight, angVel);
          }
        }
      }
    } else {
      // En el suelo - resetear timer y damping
      state.airSpinTimer = 0;
      if (chassis) {
        chassis.angularDamping = 0.5;
      }
    }
    // ========== FIN NUEVO ==========

    // ========== NUEVO: Sistema de Transmisión ==========
    let engineForce = 0;
    
    // Inicializar valores por defecto si no existen
    if (state.gear === undefined) state.gear = 1;
    if (state.shiftTimer === undefined) state.shiftTimer = 0;

    // Actualizar timer de cambio
    if (state.shiftTimer > 0) {
      state.shiftTimer -= deltaTime;
      if (state.shiftTimer < 0) state.shiftTimer = 0;
    }

    // Velocidad actual del vehículo (m/s)
    const speed = forwardSpeed;

    // Solo procesar transmisión si no estamos cambiando marcha
    if (state.shiftTimer <= 0) {
      // REVERSA (S) - Sistema de Sketchbook
      if (input.brake > 0.01) {
        // Cambiar a reversa
        state.gear = -1;
        const gearsMaxSpeeds = this.TRANSMISSION_CONFIG.gearsMaxSpeeds;
        const maxReverseSpeed = Math.abs(gearsMaxSpeeds['-1']); // 4 m/s
        
        // Solo aplicar fuerza si no hemos alcanzado la velocidad máxima de reversa
        if (speed > gearsMaxSpeeds['-1'] && speed < 5) {
          const powerFactor = (gearsMaxSpeeds['-1'] - speed) / maxReverseSpeed;
          const force = (engineForceBase * 0.7) * Math.abs(powerFactor);
          engineForce = -force * input.brake; // NEGATIVO para reversa
        }
      }
      // ADELANTE - Sistema de Sketchbook (EXACTO)
      else {
        // Asegurar que estamos en marcha adelante
        if (state.gear < 1) state.gear = 1;

        const gearsMaxSpeeds = this.TRANSMISSION_CONFIG.gearsMaxSpeeds;
        const currentGearMaxSpeed = gearsMaxSpeeds[state.gear.toString() as keyof typeof gearsMaxSpeeds];
        const prevGearMaxSpeed = state.gear > 1 ? gearsMaxSpeeds[(state.gear - 1).toString() as keyof typeof gearsMaxSpeeds] : 0;

        // Usar valor absoluto del speed para que funcione independiente de la dirección
        const absSpeed = Math.abs(speed);

        // Factor de potencia (SIEMPRE se calcula, no solo cuando aceleras)
        const powerFactor = (currentGearMaxSpeed - absSpeed) / (currentGearMaxSpeed - prevGearMaxSpeed);

        // Cambio automático (SIEMPRE se verifica, no solo cuando aceleras)
        if (powerFactor < 0.1 && state.gear < this.TRANSMISSION_CONFIG.maxGears) {
          this.shiftUp(state);
        } else if (state.gear > 1 && powerFactor > 1.2) {
          this.shiftDown(state);
        }
        
        // SOLO aplicar fuerza si presionas W (FUERA del else if)
        if (input.throttle > 0.01) {
          // Calcular RPM basado en velocidad y marcha
          const gearRatio = state.gear;
          const rpm = 1000 + (absSpeed / currentGearMaxSpeed) * 6000;
          const powerCurve = this.calculatePowerCurve(rpm);

          // Fuerza del motor (como Sketchbook)
          const force = (engineForceBase / gearRatio) * Math.pow(powerFactor, 1) * powerCurve;
          engineForce = force * input.throttle;
        }
      }
    }

    // ========== NUEVO: Sistema Anti-Roll (Anti-Vuelco) ==========
    if (chassis) {
      // Obtener vectores de orientación del vehículo
      const up = new CANNON.Vec3(0, 1, 0);
      const chassisUp = chassis.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
      
      // Calcular cuánto está inclinado el vehículo (dot product)
      // 1 = perfectamente derecho, 0 = de lado, -1 = volcado
      const upDot = chassisUp.dot(up);
      
      // Solo aplicar corrección si está MUY inclinado (más de 45 grados)
      if (upDot < 0.7) {
        // Calcular el eje de rotación para enderezar el vehículo
        const correctionAxis = new CANNON.Vec3();
        chassisUp.cross(up, correctionAxis);
        correctionAxis.normalize();
        
        // Fuerza de corrección SUAVE proporcional a la inclinación
        const correctionStrength = (0.7 - upDot) * 2; // Reducido de 5 a 2
        correctionAxis.scale(correctionStrength, correctionAxis);
        
        // Aplicar torque correctivo
        chassis.angularVelocity.vadd(correctionAxis, chassis.angularVelocity);
      }
      
      // Auto-enderezamiento si está volcado y casi quieto
      const wheelsOnGround = vehicle.numWheelsOnGround || 0;
      const velocityLength = chassis.velocity.length();
      
      if (wheelsOnGround < 3 && velocityLength < 0.5) {
        // Guardar la rotación Y (yaw) actual
        const euler = new CANNON.Vec3();
        chassis.quaternion.toEuler(euler);
        const currentYaw = euler.y;
        
        // Crear quaternion con solo la rotación Y (enderezar pero mantener dirección)
        const uprightQuat = new CANNON.Quaternion();
        uprightQuat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), currentYaw);
        
        // Interpolar suavemente hacia la posición derecha
        chassis.quaternion.slerp(uprightQuat, 0.1, chassis.quaternion);
      }
    }
    // ========== FIN NUEVO ==========

    this.vehicleState.set(id, state);

    // Aplicar fuerza del motor en ruedas traseras (0, 1 porque el modelo está invertido)
    vehicle.applyEngineForce(engineForce, 0);
    vehicle.applyEngineForce(engineForce, 1);

    // Freno de mano (Space) - Aplicar en ruedas traseras (0, 1)
    if (input.handbrake && input.handbrake > 0.01) {
      // Aplicar freno fuerte en ruedas traseras (0, 1 porque el modelo está invertido)
      const handbrakeForce = brakeForce * 2; // Freno de mano muy fuerte
      vehicle.setBrake(handbrakeForce * input.handbrake, 0);
      vehicle.setBrake(handbrakeForce * input.handbrake, 1);
    }
    // Freno motor cuando no hay input (desaceleración paulatina)
    else if (input.throttle < 0.01 && input.brake < 0.01) {
      // Freno motor más fuerte para desaceleración natural
      const coastBrake = 15; // Freno motor moderado
      vehicle.setBrake(coastBrake, 0);
      vehicle.setBrake(coastBrake, 1);
      vehicle.setBrake(coastBrake, 2);
      vehicle.setBrake(coastBrake, 3);
      
      // Si estamos en reversa y soltamos S, volver a neutro
      if (state.gear === -1) {
        state.gear = 0;
      }
    }

    // Anti-roll (estabilizador): comparar compresión de suspensiones izquierda/derecha por eje
    try {
      const wi = vehicle.wheelInfos as Array<{ suspensionRestLength: number; suspensionLength: number }>;
      const antiRollStiffnessFront = 500;
      const antiRollStiffnessRear = 700;
      const applyAntiRoll = (a: number, b: number, k: number) => {
        const wl = wi[a]; const wr = wi[b];
        const travelL = wl.suspensionRestLength - wl.suspensionLength; // compresión
        const travelR = wr.suspensionRestLength - wr.suspensionLength;
        const force = (travelL - travelR) * k;
        if (force !== 0 && chassis) {
          const up = new CANNON.Vec3(0, 1, 0);
          // aplicar arriba en el lado comprimido, abajo en el otro
          const worldPosL = vehicle.getWheelInfo(a).worldTransform.position as CANNON.Vec3;
          const worldPosR = vehicle.getWheelInfo(b).worldTransform.position as CANNON.Vec3;
          const fL = up.scale(-force);
          const fR = up.scale(force);
          chassis.applyForce(fL, worldPosL);
          chassis.applyForce(fR, worldPosR);
        }
      };
      applyAntiRoll(0, 1, antiRollStiffnessFront);
      applyAntiRoll(2, 3, antiRollStiffnessRear);
    } catch {}
  }

  /**
   * Obtiene la marcha actual del vehículo
   * @param id - ID del vehículo
   * @returns Marcha actual (-1=R, 0=N, 1-5=marchas)
   */
  getVehicleGear(id: string): number {
    const state = this.vehicleState.get(id);
    return state?.gear ?? 1;
  }

  /**
   * Obtiene el steering actual del vehículo (para animación de volante)
   * @param id - ID del vehículo
   * @returns Valor entre -1 y 1 (-1=izquierda máxima, 1=derecha máxima)
   */
  getVehicleSteering(id: string): number {
    const state = this.vehicleState.get(id);
    if (!state?.steeringSimulator) return 0;
    
    // Normalizar a rango -1 a 1 (maxSteer es 0.6)
    return state.steeringSimulator.position / 0.6;
  }

  /**
   * Obtiene la velocidad actual del vehículo en m/s
   * @param id - ID del vehículo
   * @returns Velocidad en m/s
   */
  getVehicleSpeed(id: string): number {
    const chassis = this.bodies.get(id);
    if (!chassis) return 0;
    
    const velocity = chassis.velocity;
    const euler = new CANNON.Vec3();
    chassis.quaternion.toEuler(euler);
    const forward = new CANNON.Vec3(
      Math.sin(euler.y),
      0,
      Math.cos(euler.y)
    );
    return velocity.dot(forward);
  }

  stopVehicle(id: string) {
    const vehicle = (this as unknown as Record<string, { setBrake: (b: number, i: number) => void; applyEngineForce: (f: number, i: number) => void } >)[`${id}:vehicle`];
    const body = this.bodies.get(id);
    if (vehicle) {
      for (let i = 0; i < 4; i++) { vehicle.setBrake(400, i); vehicle.applyEngineForce(0, i); }
    }
    if (body) { body.velocity.set(0, body.velocity.y, 0); body.angularVelocity.set(0, body.angularVelocity.y * 0.2, 0); }
  }

  removeVehicle(id: string) {
    const vehicle = (this as unknown as Record<string, { removeFromWorld?: (w: CANNON.World) => void }>)[`${id}:vehicle`];
    const body = this.bodies.get(id);
    if (vehicle && vehicle.removeFromWorld) vehicle.removeFromWorld(this.world);
    if (body) { this.world.removeBody(body); this.bodies.delete(id); }
    delete (this as unknown as Record<string, unknown>)[`${id}:vehicle`];
    this.vehicleState.delete(id);
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
  const body = new CANNON.Body({ 
    mass: 0,
    collisionFilterGroup: CollisionGroups.Default,
    collisionFilterMask: -1, // Colisiona con todo
  });
  body.addShape(shape);
  body.position.set(position[0], position[1] + sy / 2, position[2]);
  body.material = this.staticMaterial;
  body.allowSleep = false;
  body.collisionResponse = true;

  // Aplicar CollisionGroups a todas las shapes
  body.shapes.forEach((shape) => {
    shape.collisionFilterGroup = CollisionGroups.Default;
    shape.collisionFilterMask = -1;
  });

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

    const body = new CANNON.Body({ 
      mass: 0, // mass 0 = estático
      collisionFilterGroup: CollisionGroups.Default,
      collisionFilterMask: -1, // Colisiona con todo
    });
    body.addShape(cannonShape);
    body.position.set(position.x, position.y, position.z);
    body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
    body.material = this.staticMaterial;
    
    // IMPORTANTE: Asegurar que el body no se duerma y responda a colisiones
    body.allowSleep = false;
    body.collisionResponse = true;
    
    // Aplicar CollisionGroups a todas las shapes
    body.shapes.forEach((shape) => {
      shape.collisionFilterGroup = CollisionGroups.Default;
      shape.collisionFilterMask = -1;
    });
    
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

    const body = new CANNON.Body({ 
      mass: 0, // mass 0 = estático
      collisionFilterGroup: CollisionGroups.Default,
      collisionFilterMask: -1, // Colisiona con todo
    });
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
    
    // Aplicar CollisionGroups a todas las shapes
    body.shapes.forEach((shape) => {
      shape.collisionFilterGroup = CollisionGroups.Default;
      shape.collisionFilterMask = -1;
    });
    
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

  // 🎯 NUEVO: Crear colliders precisos según tipo de objeto (Sketchbook-inspired)
  // OPTIMIZADO: Solo crea colliders si NO existe UCX_ para ese objeto
  createPreciseCollidersFromScene(
    scene: THREE.Object3D,
    idPrefix: string
  ) {
    let treeCount = 0;
    let rockCount = 0;
    let poleCount = 0;
    let skippedUCX = 0;
    
    // Primero, recolectar todos los objetos con UCX_ para evitar duplicados
    const ucxObjects = new Set<string>();
    scene.traverse((child) => {
      if (child.name.startsWith('UCX_')) {
        // Extraer el nombre base del objeto (UCX_TreeName_01 -> TreeName)
        const baseName = child.name.replace(/^UCX_/, '').replace(/_\d+$/, '');
        ucxObjects.add(baseName.toLowerCase());
      }
    });
    
    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const name = child.name.toLowerCase();
      
      // ⚠️ SKIP: Si este objeto ya tiene UCX_, no crear collider duplicado
      const baseName = child.name.replace(/_\d+$/, '');
      if (ucxObjects.has(baseName.toLowerCase())) {
        skippedUCX++;
        return;
      }
      
      // 🌳 ÁRBOLES: Cilindro (tronco) + Esfera (copa)
      if (/tree|arbol|palm|pine|oak/i.test(name)) {
        const id = `${idPrefix}-tree-${treeCount}`;
        if (this.bodies.has(id)) return;
        
        mesh.updateMatrixWorld(true);
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());
        
        // Estimaciones basadas en tamaño
        const trunkRadius = Math.min(size.x, size.z) * 0.2; // 20% del ancho
        const trunkHeight = size.y * 0.6; // 60% de la altura
        const crownRadius = Math.max(size.x, size.z) * 0.4; // 40% del ancho
        
        const body = new CANNON.Body({ 
          mass: 0,
          collisionFilterGroup: CollisionGroups.Default,
          collisionFilterMask: -1,
        });
        
        // Tronco: Cilindro
        const trunkShape = new CANNON.Cylinder(trunkRadius, trunkRadius, trunkHeight, 8);
        body.addShape(trunkShape, new CANNON.Vec3(0, trunkHeight / 2, 0));
        
        // Copa: Esfera
        const crownShape = new CANNON.Sphere(crownRadius);
        body.addShape(crownShape, new CANNON.Vec3(0, trunkHeight + crownRadius * 0.5, 0));
        
        body.position.set(worldPos.x, worldPos.y, worldPos.z);
        body.material = this.staticMaterial;
        body.allowSleep = false;
        body.collisionResponse = true;
        
        // Aplicar CollisionGroups a shapes
        body.shapes.forEach((shape) => {
          shape.collisionFilterGroup = CollisionGroups.Default;
          shape.collisionFilterMask = -1;
        });
        
        this.world.addBody(body);
        this.bodies.set(id, body);
        treeCount++;
        
        // Ocultar mesh original (opcional)
        // mesh.visible = false;
      }
      
      // 🪨 ROCAS: Convex Hull
      else if (/rock|roca|stone|piedra|boulder/i.test(name)) {
        const id = `${idPrefix}-rock-${rockCount}`;
        if (this.bodies.has(id)) return;
        
        mesh.updateMatrixWorld(true);
        
        const result = threeToCannon(mesh, { type: ShapeType.HULL });
        if (result?.shape) {
          const body = new CANNON.Body({ 
            mass: 0,
            collisionFilterGroup: CollisionGroups.Default,
            collisionFilterMask: -1,
          });
          
          body.addShape(result.shape, result.offset, result.orientation);
          
          const worldPos = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          mesh.getWorldPosition(worldPos);
          mesh.getWorldQuaternion(worldQuat);
          
          body.position.set(worldPos.x, worldPos.y, worldPos.z);
          body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
          body.material = this.staticMaterial;
          body.allowSleep = false;
          body.collisionResponse = true;
          
          // Aplicar CollisionGroups
          body.shapes.forEach((shape) => {
            shape.collisionFilterGroup = CollisionGroups.Default;
            shape.collisionFilterMask = -1;
          });
          
          this.world.addBody(body);
          this.bodies.set(id, body);
          rockCount++;
          
          // Ocultar mesh original (opcional)
          // mesh.visible = false;
        }
      }
      
      // 🚦 POSTES/FAROLAS: Cilindro delgado
      else if (/pole|post|lamp|farol|light|street.*light/i.test(name)) {
        const id = `${idPrefix}-pole-${poleCount}`;
        if (this.bodies.has(id)) return;
        
        mesh.updateMatrixWorld(true);
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        
        const bbox = new THREE.Box3().setFromObject(mesh);
        const size = bbox.getSize(new THREE.Vector3());
        
        const radius = Math.min(size.x, size.z) * 0.3; // Delgado
        const height = size.y;
        
        const body = new CANNON.Body({ 
          mass: 0,
          collisionFilterGroup: CollisionGroups.Default,
          collisionFilterMask: -1,
        });
        
        const shape = new CANNON.Cylinder(radius, radius, height, 8);
        body.addShape(shape, new CANNON.Vec3(0, height / 2, 0));
        
        body.position.set(worldPos.x, worldPos.y, worldPos.z);
        body.material = this.staticMaterial;
        body.allowSleep = false;
        body.collisionResponse = true;
        
        // Aplicar CollisionGroups
        body.shapes.forEach((shape) => {
          shape.collisionFilterGroup = CollisionGroups.Default;
          shape.collisionFilterMask = -1;
        });
        
        this.world.addBody(body);
        this.bodies.set(id, body);
        poleCount++;
        
        // Ocultar mesh original (opcional)
        // mesh.visible = false;
      }
    });
    
    if (treeCount > 0 || rockCount > 0 || poleCount > 0 || skippedUCX > 0) {
      console.log(`🎯 Colliders precisos: ${treeCount} árboles, ${rockCount} rocas, ${poleCount} postes`);
      console.log(`⏭️  Saltados (ya tienen UCX): ${skippedUCX} objetos`);
    }
    
    return { trees: treeCount, rocks: rockCount, poles: poleCount, skipped: skippedUCX };
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
    const body = new CANNON.Body({ 
      mass: 0,
      collisionFilterGroup: CollisionGroups.Default,
      collisionFilterMask: -1, // Colisiona con todo
    });
    body.addShape(trimesh);
    body.material = this.staticMaterial; body.allowSleep = false; body.collisionResponse = true;
    
    // DEBUG: Log TODOS los Trimesh de árboles y edificios
    if (id.includes('Tree_') || id.includes('Building') || id.includes('SM_')) {
      console.log(`🌳 Trimesh ${id}: pos=(${body.position.x.toFixed(1)}, ${body.position.y.toFixed(1)}, ${body.position.z.toFixed(1)}), group=${body.collisionFilterGroup}, mask=${body.collisionFilterMask}, vertices=${vertices.length/3}, triangles=${filtered.length/3}`);
    }
    
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

  // Habilitar/deshabilitar colisiones del jugador (útil al conducir)
  setPlayerCollisionEnabled(enabled: boolean) {
    if (!this.playerBody) return;
    this.playerBody.collisionResponse = enabled;
    // Opcional: desactivar máscaras para garantizar no colisionar
    this.playerBody.collisionFilterMask = enabled ? -1 : 0;
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
