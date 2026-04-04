import * as CANNON from "cannon-es";
import * as THREE from "three";
import { threeToCannon, ShapeType } from "three-to-cannon";

import { CollisionGroups, CollisionMasks } from "@/constants/collisionGroups";
import { GAME_CONFIG } from "@/constants/game";
import { SpringSimulator } from "../physics/SpringSimulator";

interface ICullableBody extends CANNON.Body {
  isActive?: boolean;
}

interface IRaycastVehicle {
  wheelInfos: Array<{
    frictionSlip: number;
    rollInfluence: number;
    suspensionRestLength?: number;
    suspensionLength?: number;
    worldTransform: { position: CANNON.Vec3; quaternion: CANNON.Quaternion };
  }>;
  addWheel: (o: unknown) => void;
  addToWorld: (w: CANNON.World) => void;
  removeFromWorld?: (w: CANNON.World) => void;
  setBrake: (b: number, i: number) => void;
  setSteeringValue: (v: number, i: number) => void;
  applyEngineForce: (f: number, i: number) => void;
  getWheelInfo: (i: number) => {
    worldTransform: { position: CANNON.Vec3 };
  };
  updateVehicle: (delta: number) => void;
  updateWheelTransform: (i: number) => void;
  numWheelsOnGround?: number;
}

export class CannonPhysics {
  private verboseColliderLogs(): boolean {
    // GAME_CONFIG está `as const`; el flag sigue siendo booleano en runtime si se muta o amplía el tipo.
    return (GAME_CONFIG.physics.performance as { verboseColliderLogs: boolean })
      .verboseColliderLogs;
  }

  private world: CANNON.World;
  private bodies: Map<string, CANNON.Body> = new Map();
  private playerBody: CANNON.Body | null = null;
  private playerBaseY: number = 1.05; // Altura base del centro del jugador sobre el suelo
  private currentVelocity = { x: 0, z: 0 };
  private targetVelocity = { x: 0, z: 0 };
  private acceleration = GAME_CONFIG.physics.acceleration; // Velocidad de aceleración
  private deceleration = GAME_CONFIG.physics.deceleration; // Velocidad de desaceleración
  private staticBodiesCreated = false; // Flag para evitar crear colliders estáticos
  private vehicles: IRaycastVehicle[] = []; // Array para almacenar instancias de vehículos
  private vehicleState: Map<
    string,
    {
      reverseMode: boolean;
      steeringSimulator?: SpringSimulator;
      airSpinTimer?: number;
      // Sistema de transmisión
      gear?: number; // Marcha actual (1-5, 0=neutro, -1=reversa)
      shiftTimer?: number; // Timer para cambios de marcha suaves
    }
  > = new Map();

  // Materiales compartidos (CRÍTICO para que funcionen las colisiones)
  private playerMaterial!: CANNON.Material;
  private groundMaterial!: CANNON.Material;
  private staticMaterial!: CANNON.Material;
  private vehicleMaterial!: CANNON.Material;

  constructor() {
    // Crear mundo de física
    this.world = new CANNON.World();

    // Configurar gravedad desde constantes
    this.world.gravity.set(0, GAME_CONFIG.physics.gravity, 0);

    // Configurar solver MEJORADO para mejores colisiones
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    const solver = new CANNON.GSSolver();
    solver.iterations = Math.max(
      5,
      GAME_CONFIG.physics.playerCharacter.solverIterations
    );
    this.world.solver = solver;

    // DESACTIVAR sleep temporalmente para debug de colisiones
    this.world.allowSleep = true; // ACTIVADO para optimización
    this.world.defaultContactMaterial.restitution = 0; // Sin rebote por defecto
    this.world.defaultContactMaterial.friction = 0.6;

    // Configurar materiales
    this.setupMaterials();

    // Debug: Listener de colisiones (FILTRADO para excluir el suelo)
    // Debug: Listener de colisiones (DESACTIVADO para producción/rendimiento)
    // this.world.addEventListener('postStep', () => {
    //   if (this.playerBody) {
    //     // Verificar si hay contactos con el jugador (EXCLUYENDO el suelo)
    //     for (let i = 0; i < this.world.contacts.length; i++) {
    //       const contact = this.world.contacts[i];
    //       if (contact.bi === this.playerBody || contact.bj === this.playerBody) {
    //         const otherBody = contact.bi === this.playerBody ? contact.bj : contact.bi;
    //
    //         // FILTRAR: Ignorar el suelo (Y=0) y solo mostrar objetos reales (árboles, rocas, edificios)
    //         if (otherBody.position.y > 0.1 || Math.abs(otherBody.position.x) > 0.1 || Math.abs(otherBody.position.z) > 0.1) {
    //           console.log(`💥 COLISIÓN JUGADOR con objeto en pos=(${otherBody.position.x.toFixed(1)}, ${otherBody.position.y.toFixed(1)}, ${otherBody.position.z.toFixed(1)})`);
    //         }
    //       }
    //     }
    //   }
    // });

    console.log("🌍 Cannon.js physics world initialized with SAPBroadphase");
  }

  // Crear colliders UCX automáticamente (Box) a partir de la escena
  createUCXAutoCollidersFromScene(scene: THREE.Object3D, idPrefix: string) {
    // Aprovecha el creador de cajas existente y oculta los UCX
    return this.createUCXBoxCollidersFromScene(
      scene,
      (n) => n.startsWith("UCX_") || /ucx|collision/i.test(n),
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
            const wp = new THREE.Vector3();
            mesh.getWorldPosition(wp);
            const wq = new THREE.Quaternion();
            mesh.getWorldQuaternion(wq);
            body.position.set(wp.x, wp.y, wp.z);
            body.quaternion.set(wq.x, wq.y, wq.z, wq.w);
            body.material = this.staticMaterial;
            body.allowSleep = false;
            body.collisionResponse = true;

            // Aplicar CollisionGroups a todas las shapes del body
            body.shapes.forEach((shape) => {
              shape.collisionFilterGroup = CollisionGroups.Default;
              shape.collisionFilterMask = -1;
            });

            this.world.addBody(body);
            this.bodies.set(id, body);
            count += 1;
            // Mantener visible el mesh visual (no transparente)
            return;
          }
        }

        // Fallback: Trimesh robusto desde world-geometry
        const created = this.createTrimeshColliderFromWorldMesh(mesh, id);
        if (created) {
          count += 1; /* mantener visible */
        }
      }
    });
    if (count > 0 && this.verboseColliderLogs()) {
      console.log(`⛰️  ${count} Trimesh colliders generados (${idPrefix})`);
    }
    return count;
  }

  // 🚀 NUEVO: Crear colliders Convex Hull (más rápido que Trimesh, ~10x mejor rendimiento)
  createNamedConvexCollidersFromScene(
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

        // Usar Convex Hull de three-to-cannon
        const result = threeToCannon(mesh, { type: ShapeType.HULL });
        if (result?.shape) {
          const body = new CANNON.Body({
            mass: 0,
            collisionFilterGroup: CollisionGroups.Default,
            collisionFilterMask: -1,
          });

          body.addShape(result.shape, result.offset, result.orientation);

          // Obtener posición y rotación mundial
          const worldPos = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          mesh.getWorldPosition(worldPos);
          mesh.getWorldQuaternion(worldQuat);

          body.position.set(worldPos.x, worldPos.y, worldPos.z);
          body.quaternion.set(
            worldQuat.x,
            worldQuat.y,
            worldQuat.z,
            worldQuat.w
          );
          body.material = this.staticMaterial;

          // OPTIMIZACIÓN: Permitir sleep para Convex Hull
          body.allowSleep = true;
          body.sleepSpeedLimit = 0.1;
          body.sleepTimeLimit = 1.0;
          body.collisionResponse = true;

          // Aplicar CollisionGroups
          body.shapes.forEach((shape) => {
            shape.collisionFilterGroup = CollisionGroups.Default;
            shape.collisionFilterMask = -1;
          });

          this.world.addBody(body);
          (body as ICullableBody).isActive = true;
          this.bodies.set(id, body);
          count += 1;
        }
      }
    });

    if (count > 0 && this.verboseColliderLogs()) {
      console.log(`🔷 ${count} Convex Hull colliders generados (${idPrefix})`);
    }
    return count;
  }

  private setupMaterials() {
    // Material del suelo (guardar como propiedad)
    this.groundMaterial = new CANNON.Material("ground");
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
    this.playerMaterial = new CANNON.Material("player");
    const playerGroundContact = new CANNON.ContactMaterial(
      this.playerMaterial,
      this.groundMaterial,
      {
        friction: 0.6, // Fricción AUMENTADA para subir rampas (era 0.3)
        restitution: 0.0, // SIN REBOTE - CRÍTICO
        contactEquationStiffness: 1e8, // Muy rígido para evitar penetración
        contactEquationRelaxation: 3, // Relajación para estabilidad
      }
    );
    this.world.addContactMaterial(playerGroundContact);

    // Material para árboles, rocas y edificios (guardar como propiedad)
    this.staticMaterial = new CANNON.Material("static");
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
    this.vehicleMaterial = new CANNON.Material("vehicle");
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

    console.log("✅ Materiales de física configurados correctamente");
  }

  createGround() {
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.position.set(0, 0, 0); // Suelo en Y=0 (nivel del terreno visual)
    groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    groundBody.material = this.groundMaterial; // Usar material compartido

    this.world.addBody(groundBody);
    console.log("🏞️ Ground created at Y=0");
    return groundBody;
  }

  createPlayer(position: { x: number; y: number; z: number }) {
    // Crear cuerpo del jugador usando 3 ESFERAS (Capsule approximation)
    // Esto evita que se trabe en rampas y bordes
    const playerBody = new CANNON.Body({
      mass: 1,
      collisionFilterGroup: CollisionGroups.Characters,
      collisionFilterMask: CollisionMasks.Character,
    });

    const radius = 0.5;
    const totalHeight = 2;

    // 1. Esfera inferior (Pies) - Deslizamiento suave
    const sphereFeet = new CANNON.Sphere(radius);
    // Offset: La base del cilindro estaba en -1. Ahora la esfera está en -1 + radius
    const yFeet = -totalHeight / 2 + radius;
    playerBody.addShape(sphereFeet, new CANNON.Vec3(0, yFeet, 0));

    // 2. Esfera media (Cuerpo)
    const sphereBody = new CANNON.Sphere(radius);
    const yBody = 0; // Centro
    playerBody.addShape(sphereBody, new CANNON.Vec3(0, yBody, 0));

    // 3. Esfera superior (Cabeza)
    const sphereHead = new CANNON.Sphere(radius);
    const yHead = totalHeight / 2 - radius;
    playerBody.addShape(sphereHead, new CANNON.Vec3(0, yHead, 0));

    // Aplicar grupos a todas las formas
    playerBody.shapes.forEach((shape) => {
      shape.collisionFilterGroup = CollisionGroups.Characters;
      shape.collisionFilterMask = CollisionMasks.Character;
    });

    // Levantar ligeramente para evitar colisión inicial
    this.playerBaseY = totalHeight / 2 + 0.05;
    playerBody.position.set(position.x, this.playerBaseY, position.z);
    playerBody.material = this.playerMaterial;

    // Configurar física
    playerBody.allowSleep = false;
    playerBody.fixedRotation = true;
    playerBody.linearDamping = 0.0; // Sin fricción aérea artificial
    playerBody.angularDamping = 1.0;

    this.world.addBody(playerBody);
    this.playerBody = playerBody;
    this.bodies.set("player", playerBody);

    console.log(
      `👤 Player body created (3-Sphere Capsule) at Y=${this.playerBaseY}`
    );
    return playerBody;
  }

  // Optimización: Control de frecuencia para culling de colisiones
  private lastOptimizationTime = 0;
  private readonly OPTIMIZATION_INTERVAL =
    GAME_CONFIG.physics.performance.optimizationInterval;

  update(delta: number) {
    // Medir tiempo de step de física
    const stepStart = performance.now();

    // Paso de física fijo
    this.world.step(GAME_CONFIG.physics.maxDeltaTime, delta, 10);

    const stepTime = performance.now() - stepStart;

    // Optimización: Culling de colisiones estáticas cada segundo
    const now = performance.now();
    if (now - this.lastOptimizationTime > this.OPTIMIZATION_INTERVAL) {
      this.optimizeStaticColliders();
      this.lastOptimizationTime = now;
    }

    // Sincronizar vehículos
    this.vehicles.forEach((vehicle) => {
      vehicle.updateVehicle(delta);
    });

    const statsMs = GAME_CONFIG.physics.performance.physicsStatsIntervalMs ?? 0;
    if (
      statsMs > 0 &&
      (!this.lastDebugTime || Date.now() - this.lastDebugTime > statsMs)
    ) {
      let activeColliders = 0;
      for (const b of this.bodies.values()) {
        if ((b as ICullableBody).isActive !== false) activeColliders += 1;
      }
      const inactiveColliders = this.bodies.size - activeColliders;

      console.log(`⚡ Physics Performance:`);
      console.log(
        `  📊 Total colliders: ${this.bodies.size} (${activeColliders} active, ${inactiveColliders} culled)`
      );
      console.log(`  🌍 Bodies in world: ${this.world.bodies.length}`);
      console.log(`  ⏱️  Physics step time: ${stepTime.toFixed(2)}ms`);
      this.lastDebugTime = Date.now();
    }
  }

  private currentVehicleId: string | null = null; // Vehículo actual del jugador

  // Setter para el vehículo actual
  setCurrentVehicle(id: string | null) {
    this.currentVehicleId = id;
    if (this.verboseColliderLogs()) {
      console.log(`🚗 Active Vehicle set to: ${id}`);
    }
  }

  /**
   * Optimización: Activa/Desactiva colisiones estáticas según distancia al jugador o vehículo
   * "Raycast" optimization requested by user
   */
  private optimizeStaticColliders() {
    let targetPos: { x: number; y: number; z: number } | null = null;

    // 1. Si hay un vehículo activo, usar su posición
    if (this.currentVehicleId && this.bodies.has(this.currentVehicleId)) {
      targetPos = this.bodies.get(this.currentVehicleId)!.position;
    }
    // 2. Si no, usar la posición del jugador
    else if (this.playerBody) {
      targetPos = this.playerBody.position;
    }

    if (!targetPos) return;

    // Distancias aumentadas para evitar "frenazos" en curvas o alta velocidad
    // El coche puede moverse a ~30m/s, así que necesitamos cargar terreno con mucha antelación
    const ACTIVATION_DISTANCE =
      GAME_CONFIG.physics.performance.cullingActivationDistance * 1.5; // ~120m
    const DEACTIVATION_DISTANCE =
      GAME_CONFIG.physics.performance.cullingDeactivationDistance * 1.5; // ~150m
    this.bodies.forEach((body, key) => {
      // Solo optimizar objetos estáticos (masa 0) que no sean suelo ni jugador ni vehículo activo
      // Asumimos que los objetos estáticos tienen mass=0
      if (
        body.mass === 0 &&
        key !== "ground" &&
        key !== "player" &&
        key !== this.currentVehicleId
      ) {
        // ⚠️ EXCLUDE LARGE MESHES FROM CULLING
        // Hills, Mountains, Terrain should always be active because their center might be far
        // but their mesh extends to the player.
        // Also exclude ROADS to prevent "pull back" when driving fast.
        if (
          /hill|mountain|terrain|cliff|montaña|terreno|road|street|calle|via/i.test(
            key
          )
        ) {
          return;
        }

        const distSq =
          (body.position.x - targetPos!.x) ** 2 +
          (body.position.z - targetPos!.z) ** 2;

        // OPTIMIZACIÓN: Usar propiedad 'isActive' en lugar de buscar en el array (O(1) vs O(N))
        const isActive = (body as ICullableBody).isActive !== false; // Default true

        if (isActive && distSq > DEACTIVATION_DISTANCE ** 2) {
          this.world.removeBody(body);
          (body as ICullableBody).isActive = false;
          // console.log(`💤 Culling static body: ${key} (dist: ${Math.sqrt(distSq).toFixed(1)}m)`);
        } else if (!isActive && distSq < ACTIVATION_DISTANCE ** 2) {
          this.world.addBody(body);
          (body as ICullableBody).isActive = true;
          // console.log(`🔔 Activating static body: ${key} (dist: ${Math.sqrt(distSq).toFixed(1)}m)`);
        }
      }
    });
  }

  private lastDebugTime = 0;

  updateMovement(
    input: { x: number; z: number; isRunning: boolean; stamina: number },
    deltaTime: number
  ) {
    if (!this.playerBody) {
      // console.log("⚠️ updateMovement: playerBody is null");
      return;
    }

    // Detectar si está en el aire
    const isGrounded = this.isGrounded();

    // Solo permitir correr si hay stamina suficiente (mínimo 10 puntos)
    const canRun = input.isRunning && input.stamina > 10;

    // Calcular velocidad objetivo (ajustada para 60 FPS)
    const maxSpeed = canRun ? 12 : 7; // Solo correr si hay stamina

    if (isGrounded) {
      // --- FÍSICA DE SUELO (Snappy) ---
      // En el suelo, queremos control total y respuesta rápida

      this.targetVelocity.x = input.x * maxSpeed;
      this.targetVelocity.z = input.z * maxSpeed;

      // Usar aceleración alta para arranque rápido, y deceleración alta para frenado
      const speed =
        input.x !== 0 || input.z !== 0 ? this.acceleration : this.deceleration;
      const lerpFactor = speed * deltaTime;

      this.currentVelocity.x = this.lerp(
        this.currentVelocity.x,
        this.targetVelocity.x,
        lerpFactor
      );
      this.currentVelocity.z = this.lerp(
        this.currentVelocity.z,
        this.targetVelocity.z,
        lerpFactor
      );

      // Aplicar directamente
      this.playerBody.velocity.x = this.currentVelocity.x;
      this.playerBody.velocity.z = this.currentVelocity.z;
    } else {
      // --- FÍSICA DE AIRE (Momentum) ---
      // En el aire, NO aplicamos fricción (no lerp a 0). Preservamos el momentum.
      // Solo aplicamos una pequeña fuerza aditiva para control aéreo.

      // 1. Preservar velocidad actual (momentum)
      // No hacemos nada con velocity.x/z, dejamos que la inercia actúe

      // 2. Aplicar Air Control (fuerza pequeña para ajustar trayectoria)
      if (input.x !== 0 || input.z !== 0) {
        const pc = GAME_CONFIG.physics.playerCharacter;
        const airAccel = pc.airControlAcceleration * deltaTime;
        this.playerBody.velocity.x += input.x * airAccel;
        this.playerBody.velocity.z += input.z * airAccel;

        const cap = pc.airMaxHorizontalSpeed;
        const hx = this.playerBody.velocity.x;
        const hz = this.playerBody.velocity.z;
        const horiz = Math.hypot(hx, hz);
        if (horiz > cap && horiz > 1e-6) {
          const s = cap / horiz;
          this.playerBody.velocity.x *= s;
          this.playerBody.velocity.z *= s;
        }

        this.currentVelocity.x = this.playerBody.velocity.x;
        this.currentVelocity.z = this.playerBody.velocity.z;
      }
    }

    // Si no hay stamina, fuerza a detener el sprint (seguridad extra)
    if (
      !canRun &&
      (Math.abs(this.playerBody.velocity.x) > 12 ||
        Math.abs(this.playerBody.velocity.z) > 12)
    ) {
      // Suavemente reducir velocidad si excede el límite de caminar y no podemos correr
      this.playerBody.velocity.x *= 0.95;
      this.playerBody.velocity.z *= 0.95;
    }

    // ES: Sin snap a Y global ni “kill” de vy en suelo — Cannon + materiales resuelven contacto (más cercano a Rigidbody Unity).
    // EN: No global Y snap or grounded vy clamp — contacts handle landing/slopes.
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
  teleportPlayer(
    position: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number }
  ) {
    if (!this.playerBody) {
      console.warn("⚠️ No se puede teleportar: playerBody no existe");
      return;
    }

    console.log(
      `🚀 TELEPORT CALLED - ANTES: pos=${this.playerBody.position.x.toFixed(
        2
      )}, ${this.playerBody.position.y.toFixed(
        2
      )}, ${this.playerBody.position.z.toFixed(2)}`
    );
    console.log(
      `🚀 TELEPORT CALLED - TARGET: pos=${position.x}, ${position.y}, ${position.z}`
    );
    console.log(`🚀 TELEPORT CALLED - ROTATION:`, rotation);

    // Detener cualquier movimiento actual
    this.playerBody.velocity.set(0, 0, 0);
    this.playerBody.angularVelocity.set(0, 0, 0);

    // Establecer nueva posición
    this.playerBody.position.set(position.x, position.y, position.z);

    // Establecer nueva rotación si se proporciona
    if (rotation) {
      this.playerBody.quaternion.setFromEuler(
        rotation.x,
        rotation.y,
        rotation.z
      );
    }

    // Forzar actualización del cuerpo
    this.playerBody.wakeUp();

    console.log(
      `🚀 TELEPORT COMPLETED - DESPUÉS: pos=${this.playerBody.position.x.toFixed(
        2
      )}, ${this.playerBody.position.y.toFixed(
        2
      )}, ${this.playerBody.position.z.toFixed(2)}`
    );
    console.log(
      `🚀 TELEPORT SUCCESS: ${
        this.playerBody.position.x === position.x &&
        this.playerBody.position.y === position.y &&
        this.playerBody.position.z === position.z
          ? "YES"
          : "NO"
      }`
    );
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
  /**
   * Obtiene la transformación (posición/rotación) de un cuerpo
   * @param id - ID del cuerpo
   */
  getBodyTransform(id: string): {
    position: { x: number; y: number; z: number };
    rotationY: number;
    quaternion: { x: number; y: number; z: number; w: number };
  } | null {
    const body = this.bodies.get(id);
    if (!body) return null;

    const euler = new CANNON.Vec3();
    body.quaternion.toEuler(euler);

    return {
      position: { x: body.position.x, y: body.position.y, z: body.position.z },
      rotationY: euler.y,
      quaternion: {
        x: body.quaternion.x,
        y: body.quaternion.y,
        z: body.quaternion.z,
        w: body.quaternion.w,
      },
    };
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

  /**
   * ES: Impulso de salto: `verticalVelocity` es velocidad Y objetivo (p. ej. desde computeJumpVelocityForApex).
   * EN: Jump impulse as target vertical velocity (e.g. from computeJumpVelocityForApex).
   */
  jump(verticalVelocity: number) {
    if (!this.playerBody) return;
    if (!this.isGrounded()) return;
    this.playerBody.velocity.y = verticalVelocity;
  }

  isGrounded(): boolean {
    if (!this.playerBody) return false;

    const { groundProbeLength, groundProbeHitMaxDistance } =
      GAME_CONFIG.physics.playerCharacter;
    const start = this.playerBody.position;
    const end = new CANNON.Vec3(start.x, start.y - groundProbeLength, start.z);

    const ray = new CANNON.Ray(start, end);
    const result = new CANNON.RaycastResult();

    ray.intersectWorld(this.world, { mode: CANNON.Ray.CLOSEST, result });

    if (result.hasHit && result.distance < groundProbeHitMaxDistance) {
      return true;
    }

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
  createSimpleVehicle(
    position: { x: number; y: number; z: number },
    id: string
  ) {
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
  updateSimpleVehicle(
    id: string,
    input: { throttle: number; brake: number; steer: number },
    deltaTime: number
  ) {
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
  createRaycastVehicle(
    position: { x: number; y: number; z: number },
    id: string,
    rotationY: number = 0
  ) {
    if (this.bodies.has(id)) return this.bodies.get(id)!;
    const chassisBody = new CANNON.Body({
      mass: 600,
      // IMPORTANTE: Cannon.js usa los CollisionGroups del BODY cuando tiene shapes
      collisionFilterGroup: CollisionGroups.Vehicles,
      collisionFilterMask: CollisionMasks.VehicleBody,
    });
    // Chasis con dimensiones ESCALADAS para coincidir con el modelo visual (1.6x)
    // Dimensiones base: ancho 1.6m, alto 1.0m, largo 3.8m
    // Escaladas 1.6x: ancho 2.56m, alto 1.6m, largo 6.08m
    // Half-extents: 1.28, 0.8, 2.5 (largo reducido para mejor ajuste)
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1.28, 0.8, 2.5));
    // TAMBIÉN aplicar al shape (por si acaso, aunque el body es lo que cuenta)
    chassisShape.collisionFilterGroup = CollisionGroups.Vehicles;
    chassisShape.collisionFilterMask = CollisionMasks.VehicleBody;
    // SUBIR el shape para que NO toque el suelo
    chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 1.1, 0));

    // 🎯 SKETCHBOOK: Agregar esferas en las esquinas para detectar colisiones laterales
    // IMPORTANTE: Las esferas deben estar ARRIBA del nivel del suelo para NO frenar el vehículo
    // MANTENER TAMAÑO ORIGINAL (no escalar con el modelo visual)
    const sphereRadius = 0.7; // Radio GRANDE para cubrir más área lateral (sin dejar huecos)
    const sphereOffsetY = 1.1; // Altura aumentada para NO golpear el piso
    const sphereOffsetX = 0.7; // Separación horizontal (ancho del carro)
    const sphereOffsetZ = 1.6; // Separación longitudinal (largo del carro)

    // 4 esferas en las esquinas delanteras y traseras
    const cornerSphere = new CANNON.Sphere(sphereRadius);
    cornerSphere.collisionFilterGroup = CollisionGroups.Vehicles;
    cornerSphere.collisionFilterMask = CollisionMasks.VehicleBody;
    // IMPORTANTE: Aplicar el material del vehículo para baja fricción
    cornerSphere.material = this.vehicleMaterial;

    // Delante izquierda
    chassisBody.addShape(
      cornerSphere,
      new CANNON.Vec3(-sphereOffsetX, sphereOffsetY, sphereOffsetZ)
    );
    // Delante derecha
    chassisBody.addShape(
      cornerSphere,
      new CANNON.Vec3(sphereOffsetX, sphereOffsetY, sphereOffsetZ)
    );
    // Atrás izquierda
    chassisBody.addShape(
      cornerSphere,
      new CANNON.Vec3(-sphereOffsetX, sphereOffsetY, -sphereOffsetZ)
    );
    // Atrás derecha
    chassisBody.addShape(
      cornerSphere,
      new CANNON.Vec3(sphereOffsetX, sphereOffsetY, -sphereOffsetZ)
    );

    // 🎯 Cilindro horizontal en el medio para cubrir el hueco central
    // El cilindro está orientado en el eje Z (frente-atrás del vehículo)
    // MANTENER TAMAÑO ORIGINAL (no escalar con el modelo visual)
    const cylinderRadius = 0.5; // Radio del cilindro
    const cylinderLength = 3.0; // Longitud del cilindro (cubre todo el largo del vehículo)
    const cylinderShape = new CANNON.Cylinder(
      cylinderRadius,
      cylinderRadius,
      cylinderLength,
      8
    );
    cylinderShape.collisionFilterGroup = CollisionGroups.Vehicles;
    cylinderShape.collisionFilterMask = CollisionMasks.VehicleBody;
    cylinderShape.material = this.vehicleMaterial;

    // Rotar el cilindro 90° en X para que quede horizontal (eje Z)
    const cylinderQuaternion = new CANNON.Quaternion();
    cylinderQuaternion.setFromEuler(Math.PI / 2, 0, 0); // 90° en X

    // Posicionar el cilindro en el centro del vehículo, a la misma altura que las esferas
    chassisBody.addShape(
      cylinderShape,
      new CANNON.Vec3(0, sphereOffsetY, 0),
      cylinderQuaternion
    );

    // Posicionar chasis elevado para que las ruedas toquen el suelo correctamente
    // Cálculo: suspensionRestLength (0.35) + radius (0.38) + clearance (0.3) = ~1.0
    chassisBody.position.set(position.x, position.y + 1.0, position.z);
    chassisBody.quaternion.setFromEuler(0, rotationY, 0);
    chassisBody.angularDamping = 0.5;
    chassisBody.linearDamping = 0.02; // resistencia moderada
    chassisBody.material = this.vehicleMaterial;

    // DEBUG: Escuchar eventos de colisión del vehículo (solo objetos importantes)
    // DEBUG: Escuchar eventos de colisión del vehículo (solo objetos importantes)
    // DESACTIVADO para rendimiento
    /*
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
    */

    this.world.addBody(chassisBody);

    // Nota: Las esferas en las esquinas NO son ruedas físicas. RaycastVehicle maneja
    // la suspensión y tracción. Las esferas solo detectan colisiones a nivel del suelo.
    this.bodies.set(id, chassisBody);

    console.log(
      `🚗 Vehicle ${id} created: body.group=${chassisBody.collisionFilterGroup}, body.mask=${chassisBody.collisionFilterMask}`
    );

    const options: {
      chassisBody: CANNON.Body;
      indexRightAxis: number;
      indexUpAxis: number;
      indexForwardAxis: number;
    } = {
      chassisBody,
      indexRightAxis: 0, // x
      indexUpAxis: 1, // y
      indexForwardAxis: 2, // z
    };
    const RaycastVehicleCtor = (
      CANNON as unknown as {
        RaycastVehicle: new (opts: unknown) => IRaycastVehicle;
      }
    ).RaycastVehicle;
    const vehicle = new RaycastVehicleCtor(options);

    const wheelOptions = {
      radius: 0.38,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 32,
      suspensionRestLength: 0.35,
      frictionSlip: 12, // Aumentado para mejor agarre (antes 9.5)
      dampingRelaxation: 2.6,
      dampingCompression: 5.0,
      maxSuspensionForce: 120000,
      rollInfluence: 0.01, // Reducido para mayor estabilidad (antes 0.03)
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 0.6, 0),
      maxSuspensionTravel: 0.35,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    const halfWidth = 1.15; // Aumentado de 0.85 a 1.15 para separar más las ruedas

    // Configuración independiente de ejes
    const rearWheelZ = 1.8; // Eje trasero (sin cambios)
    const frontWheelZ = -1.5; // Eje delantero (movido hacia atrás desde -1.8 para centrar en guardafango)

    // FL, FR, RL, RR
    // CAMBIO: Orden corregido para coincidir con CannonCar.tsx (0=FL, 1=FR, 2=RL, 3=RR)
    // +X = Right, -X = Left
    // -Z = Front, +Z = Rear
    const points = [
      new CANNON.Vec3(-halfWidth, 0, frontWheelZ), // FL (Left, Front)
      new CANNON.Vec3(halfWidth, 0, frontWheelZ), // FR (Right, Front)
      new CANNON.Vec3(-halfWidth, 0, rearWheelZ), // RL (Left, Rear)
      new CANNON.Vec3(halfWidth, 0, rearWheelZ), // RR (Right, Rear)
    ];
    points.forEach((p) => {
      const opt = { ...wheelOptions, chassisConnectionPointLocal: p };
      vehicle.addWheel(opt);
    });
    // Ajustes por eje (inspirado en setups robustos): más agarre atrás, menos roll en frente
    const wi = vehicle.wheelInfos as Array<{
      frictionSlip: number;
      rollInfluence: number;
    }>;
    if (wi && wi.length === 4) {
      // Ajustes por eje: más agarre atrás, muy poco roll
      // 0,1 son Frente (-Z), 2,3 son Atrás (+Z)
      wi[0].frictionSlip = 12;
      wi[1].frictionSlip = 12;
      wi[2].frictionSlip = 14;
      wi[3].frictionSlip = 14; // Más agarre atrás
      wi[0].rollInfluence = 0.01;
      wi[1].rollInfluence = 0.01;
      wi[2].rollInfluence = 0.01;
      wi[3].rollInfluence = 0.01;
    }
    vehicle.addToWorld(this.world);
    // Guardar ref en bodies map usando key `${id}:vehicle`
    (this as unknown as Record<string, unknown>)[`${id}:vehicle`] = vehicle;
    this.vehicles.push(vehicle); // Add to vehicles array for update loop
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
      gear: 1, // Empezar en primera marcha
      shiftTimer: 0, // Sin delay inicial
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
    const idleRPM = 1000; // RPM en ralentí
    const peakRPM = 4000; // RPM de máximo torque
    const redlineRPM = 7000; // RPM máximo (línea roja)

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

  updateRaycastVehicle(
    id: string,
    input: {
      throttle: number;
      brake: number;
      steer: number;
      handbrake?: number;
    },
    deltaTime: number = 1 / 60
  ) {
    const vehicle = (this as unknown as Record<string, unknown>)[
      `${id}:vehicle`
    ] as IRaycastVehicle;
    if (!vehicle) return;
    const chassis = this.bodies.get(id);
    const state = this.vehicleState.get(id) || {
      reverseMode: false,
      airSpinTimer: 0,
    };

    // Constantes de física del vehículo (desde GAME_CONFIG)
    const maxSteer = GAME_CONFIG.vehicle.physics.maxSteer;
    const engineForceBase = GAME_CONFIG.vehicle.physics.engineForce;
    const brakeForce = GAME_CONFIG.vehicle.physics.brakeForce;

    // Reset brakes each frame
    for (let i = 0; i < 4; i++) vehicle.setBrake(0, i);

    // Estimate forward speed along chassis forward axis (-Z ahora)
    let forwardSpeed = 0;
    if (chassis) {
      const forwardLocal = new CANNON.Vec3(0, 0, -1); // CAMBIO: -Z es forward
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
      if (velocityLength > 0.5) {
        // Solo aplicar si hay movimiento significativo
        velocity.normalize();

        // Vector forward del vehículo (-Z)
        const forward = chassis.quaternion.vmult(new CANNON.Vec3(0, 0, -1));

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
        steeringSimulator.target = Math.max(
          -maxSteer,
          Math.min(maxSteer, steering)
        );
      } else if (input.steer < -0.01) {
        // Girando a la izquierda
        const steering = Math.max(maxSteer / speedFactor, -driftCorrection);
        steeringSimulator.target = Math.max(
          -maxSteer,
          Math.min(maxSteer, steering)
        );
      } else {
        // Sin input: volver al centro (con drift correction para ayudar a enderezar)
        steeringSimulator.target = 0;
      }

      // Simular física del resorte
      steeringSimulator.simulate(deltaTime);

      // Aplicar dirección suavizada (NORMAL porque ahora Physics Front = Visual Front)
      const steerVal = steeringSimulator.position;

      vehicle.setSteeringValue(steerVal, 0);
      vehicle.setSteeringValue(steerVal, 1);
    } else {
      // Fallback al método anterior si no hay simulador
      const speedNorm = Math.min(Math.abs(forwardSpeed) / 25, 1);
      const speedAtt = 1 - 0.5 * speedNorm;
      const steerVal = maxSteer * speedAtt * input.steer;
      // Invertir steerVal si es necesario? No, ahora estamos alineados.
      // Pero input.steer: Left (-1), Right (1).
      // Cannon steering: Positive = Left? Negative = Right?
      // Standard Cannon: Positive steer = Left turn.
      // So input.steer (-1 Left) -> Negative -> Right?
      // Wait.
      // If steerVal is positive, wheels turn Left.
      // If input.steer is -1 (Left), we want Positive steerVal.
      // So steerVal = -input.steer * ...
      // Let's check previous logic.
      // Previous: `const steerVal = -steeringSimulator.position;` (Inverted)
      // Now we are aligned.
      // If input.steer is Left (-1).
      // steeringSimulator target should be Positive?
      // Let's check steeringSimulator logic above.
      // `if (input.steer < -0.01) ... steering = Math.max(...)` -> Positive?
      // Yes, `maxSteer` is positive.
      // So target is positive for Left input.
      // So `steeringSimulator.position` is positive.
      // So `steerVal` is positive.
      // So wheels turn Left.
      // Correct.

      vehicle.setSteeringValue(-steerVal, 0); // Invertir signo para coincidir con lógica estándar?
      vehicle.setSteeringValue(-steerVal, 1);
      // Espera, si steerVal es positivo (Left), y setSteeringValue(pos) es Left...
      // Por qué invertí antes? Porque el chasis estaba rotado 180.
      // Ahora el chasis NO está rotado (en teoría, lo voy a quitar).
      // Pero he cambiado Physics Front a -Z.
      // Si Physics Front es -Z, y giro ruedas "Left" (rotación +Y local?),
      // +Y local en -Z forward...
      // Si miro desde arriba, -Z es "Arriba".
      // +Y es eje vertical.
      // Rotación positiva en Y es anti-horaria.
      // Si el coche mira a -Z, rotación anti-horaria apunta a la IZQUIERDA del coche.
      // Entonces Positive Steer = Left.
      // input.steer = -1 (Left).
      // target = Positive.
      // steerVal = Positive.
      // setSteeringValue(Positive) = Left.
      // Correcto.
      // Entonces NO debo invertir steerVal.
      // `vehicle.setSteeringValue(steerVal, 0);`
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
        const airSpinInfluence =
          Math.min(state.airSpinTimer / 2, 1) *
          Math.min(Math.abs(forwardSpeed), 1);

        // Factor de flip: más fácil hacer flips a baja velocidad
        const flipSpeedFactor = Math.max(1 - Math.abs(forwardSpeed), 0);

        // Detectar si está boca abajo (up factor)
        const chassisUp = chassis.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        const upFactor = chassisUp.dot(new CANNON.Vec3(0, -1, 0)) / 2 + 0.5;
        const flipOverInfluence = flipSpeedFactor * upFactor * 3;

        // Constantes de control en el aire
        const maxAirSpinMagnitude = 2.0;
        const airSpinAcceleration = 0.15;

        // Vectores de dirección del vehículo (-Z forward)
        const forward = chassis.quaternion.vmult(new CANNON.Vec3(0, 0, -1));
        const right = chassis.quaternion.vmult(new CANNON.Vec3(1, 0, 0));

        // Vectores de spin efectivos
        const effectiveSpinForward = forward.scale(
          airSpinAcceleration * (airSpinInfluence + flipOverInfluence)
        );
        const effectiveSpinRight = right.scale(
          airSpinAcceleration * airSpinInfluence
        );

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
      // REVERSA / FRENO (S)
      if (input.brake > 0.01) {
        // Si vamos hacia adelante (velocidad > 1 m/s), usar FRENO
        if (forwardSpeed > 1.0) {
          // Aplicar frenos PRINCIPALMENTE en ruedas traseras para evitar que el carro se levante (nose dive)
          // Reducir la fuerza global a la mitad para que sea más suave
          const brakeVal = brakeForce * input.brake * 0.5;

          // Distribución de frenado: 20% Adelante, 100% Atrás
          vehicle.setBrake(brakeVal * 0.2, 0); // Front Left (Poco freno)
          vehicle.setBrake(brakeVal * 0.2, 1); // Front Right (Poco freno)
          vehicle.setBrake(brakeVal, 2); // Rear Left (Freno principal)
          vehicle.setBrake(brakeVal, 3); // Rear Right (Freno principal)

          engineForce = 0; // Cortar motor
        }
        // Si estamos casi parados o yendo hacia atrás, usar REVERSA
        else {
          // Soltar frenos para permitir movimiento
          vehicle.setBrake(0, 0);
          vehicle.setBrake(0, 1);
          vehicle.setBrake(0, 2);
          vehicle.setBrake(0, 3);

          // Cambiar a reversa
          state.gear = -1;
          const gearsMaxSpeeds = this.TRANSMISSION_CONFIG.gearsMaxSpeeds;
          const maxReverseSpeed = Math.abs(gearsMaxSpeeds["-1"]);

          // Solo aplicar fuerza si no hemos alcanzado la velocidad máxima de reversa
          // speed es negativo en reversa (forwardSpeed < 0)
          if (forwardSpeed > gearsMaxSpeeds["-1"]) {
            const powerFactor =
              (maxReverseSpeed - Math.abs(forwardSpeed)) / maxReverseSpeed;
            const force = engineForceBase * 0.7 * Math.abs(powerFactor);
            engineForce = -force * input.brake; // NEGATIVO para empujar atrás
          }
        }
      }
      // ADELANTE - Sistema de tracción (EXACTO)
      else {
        // Asegurar que estamos en marcha adelante si aceleramos
        if (state.gear < 1) state.gear = 1;

        // Resetear frenos si aceleramos
        vehicle.setBrake(0, 0);
        vehicle.setBrake(0, 1);
        vehicle.setBrake(0, 2);
        vehicle.setBrake(0, 3);

        const gearsMaxSpeeds = this.TRANSMISSION_CONFIG.gearsMaxSpeeds;
        const currentGearMaxSpeed =
          gearsMaxSpeeds[state.gear.toString() as keyof typeof gearsMaxSpeeds];
        const prevGearMaxSpeed =
          state.gear > 1
            ? gearsMaxSpeeds[
                (state.gear - 1).toString() as keyof typeof gearsMaxSpeeds
              ]
            : 0;

        // Usar valor absoluto del speed para que funcione independiente de la dirección
        const absSpeed = Math.abs(speed);

        // Factor de potencia (SIEMPRE se calcula, no solo cuando aceleras)
        const powerFactor =
          (currentGearMaxSpeed - absSpeed) /
          (currentGearMaxSpeed - prevGearMaxSpeed);

        // Cambio automático (SIEMPRE se verifica, no solo cuando aceleras)
        if (
          powerFactor < 0.1 &&
          state.gear < this.TRANSMISSION_CONFIG.maxGears
        ) {
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

          // Fuerza del motor (simulada)
          const force =
            (engineForceBase / gearRatio) *
            Math.pow(powerFactor, 1) *
            powerCurve;
          engineForce = force * input.throttle; // POSITIVO para adelante
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

    // Aplicar fuerza del motor en ruedas traseras (2, 3)
    // Indices: 0=FL, 1=FR, 2=RL, 3=RR
    vehicle.applyEngineForce(engineForce, 2);
    vehicle.applyEngineForce(engineForce, 3);

    // Freno de mano (Space) - Aplicar en ruedas traseras (2, 3)
    if (input.handbrake && input.handbrake > 0.01) {
      // Aplicar freno en ruedas traseras (Suavizado)
      const handbrakeForce = brakeForce * 0.8;
      vehicle.setBrake(handbrakeForce * input.handbrake, 2);
      vehicle.setBrake(handbrakeForce * input.handbrake, 3);
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
      const wi = vehicle.wheelInfos as Array<{
        suspensionRestLength: number;
        suspensionLength: number;
      }>;
      const antiRollStiffnessFront = 500;
      const antiRollStiffnessRear = 700;
      const applyAntiRoll = (a: number, b: number, k: number) => {
        const wl = wi[a];
        const wr = wi[b];
        const travelL = wl.suspensionRestLength - wl.suspensionLength; // compresión
        const travelR = wr.suspensionRestLength - wr.suspensionLength;
        const force = (travelL - travelR) * k;
        if (force !== 0 && chassis) {
          const up = new CANNON.Vec3(0, 1, 0);
          // aplicar arriba en el lado comprimido, abajo en el otro
          const worldPosL = vehicle.getWheelInfo(a).worldTransform
            .position as CANNON.Vec3;
          const worldPosR = vehicle.getWheelInfo(b).worldTransform
            .position as CANNON.Vec3;
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
    // Normalizar a rango -1 a 1 (maxSteer es 0.6)
    return state.steeringSimulator.position / 0.6;
  }

  /**
   * Obtiene la transformación (posición/rotación) de una rueda específica
   * @param id - ID del vehículo
   * @param wheelIndex - Índice de la rueda (0-3)
   */
  getVehicleWheelTransform(
    id: string,
    wheelIndex: number
  ): {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    suspensionLength?: number;
    chassisConnectionPointLocal?: { x: number; y: number; z: number };
    directionLocal?: { x: number; y: number; z: number };
    axleLocal?: { x: number; y: number; z: number };
  } | null {
    const vehicle = (this as unknown as Record<string, unknown>)[
      `${id}:vehicle`
    ] as IRaycastVehicle;
    if (!vehicle || !vehicle.wheelInfos[wheelIndex]) return null;

    // Actualizar transformación de la rueda
    vehicle.updateWheelTransform(wheelIndex);

    const t = vehicle.wheelInfos[wheelIndex].worldTransform;
    const info = vehicle.wheelInfos[wheelIndex] as any; // Cast to any to access hidden props
    return {
      position: { x: t.position.x, y: t.position.y, z: t.position.z },
      rotation: {
        x: t.quaternion.x,
        y: t.quaternion.y,
        z: t.quaternion.z,
        w: t.quaternion.w,
      },
      // Datos para sincronización visual interpolada
      suspensionLength: info.suspensionLength,
      chassisConnectionPointLocal: {
        x: info.chassisConnectionPointLocal.x,
        y: info.chassisConnectionPointLocal.y,
        z: info.chassisConnectionPointLocal.z,
      },
      directionLocal: {
        x: info.directionLocal.x,
        y: info.directionLocal.y,
        z: info.directionLocal.z,
      },
      axleLocal: {
        x: info.axleLocal.x,
        y: info.axleLocal.y,
        z: info.axleLocal.z,
      },
    };
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
    const forward = new CANNON.Vec3(Math.sin(euler.y), 0, Math.cos(euler.y));
    return velocity.dot(forward);
  }

  stopVehicle(id: string) {
    const vehicle = (
      this as unknown as Record<
        string,
        {
          setBrake: (b: number, i: number) => void;
          applyEngineForce: (f: number, i: number) => void;
        }
      >
    )[`${id}:vehicle`];
    const body = this.bodies.get(id);
    if (vehicle) {
      for (let i = 0; i < 4; i++) {
        vehicle.setBrake(400, i);
        vehicle.applyEngineForce(0, i);
      }
    }
    if (body) {
      body.velocity.set(0, body.velocity.y, 0);
      body.angularVelocity.set(0, body.angularVelocity.y * 0.2, 0);
    }
  }

  removeVehicle(id: string) {
    const vehicle = (this as unknown as Record<string, unknown>)[
      `${id}:vehicle`
    ] as IRaycastVehicle;
    const body = this.bodies.get(id);
    if (vehicle && vehicle.removeFromWorld) vehicle.removeFromWorld(this.world);

    // Remove from vehicles array
    const index = this.vehicles.indexOf(vehicle);
    if (index > -1) {
      this.vehicles.splice(index, 1);
    }

    if (body) {
      this.world.removeBody(body);
      this.bodies.delete(id);
    }
    delete (this as unknown as Record<string, unknown>)[`${id}:vehicle`];
    this.vehicleState.delete(id);
  }

  // Crear collider cilíndrico para árboles
  createTreeCollider(
    position: [number, number, number],
    radius: number = 0.5,
    height: number = 5,
    id: string
  ) {
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
    console.log(
      `🌳 Tree collider created: ${id} at (${position[0].toFixed(
        1
      )}, ${position[1].toFixed(1)}, ${position[2].toFixed(
        1
      )}) radius=${radius.toFixed(2)} height=${height.toFixed(2)}`
    );
  }

  // Crear collider esférico para rocas
  createRockCollider(
    position: [number, number, number],
    radius: number = 1.0,
    id: string
  ) {
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
    console.log(
      `🪨 Rock collider created: ${id} at (${position[0].toFixed(
        1
      )}, ${position[1].toFixed(1)}, ${position[2].toFixed(
        1
      )}) radius=${radius.toFixed(2)}`
    );
  }

  // Crear collider de caja para edificios
  // Crear collider de caja para edificios, muros o terreno
  createBoxCollider(
    position: [number, number, number],
    size: [number, number, number],
    id: string
  ) {
    // Límite máximo por eje (mientras más grande, más impreciso)
    const MAX_SIZE = 50;

    const [sx, sy, sz] = size;

    // 🔹 Si es demasiado grande, dividirlo en sub-colliders más pequeños
    if (sx > MAX_SIZE || sz > MAX_SIZE) {
      console.warn(
        `⚠️ Collider demasiado grande (${id}) → subdividiendo (${sx.toFixed(
          1
        )} × ${sz.toFixed(1)})`
      );

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
    body.allowSleep = true; // Optimización
    body.sleepSpeedLimit = 0.1;
    body.sleepTimeLimit = 1.0;
    body.collisionResponse = true;

    // Aplicar CollisionGroups a todas las shapes
    body.shapes.forEach((shape) => {
      shape.collisionFilterGroup = CollisionGroups.Default;
      shape.collisionFilterMask = -1;
    });

    this.world.addBody(body);
    (body as ICullableBody).isActive = true; // Inicializar tag
    this.bodies.set(id, body);
    if (this.verboseColliderLogs()) {
      console.log(
        `🏢 Box collider creado: ${id} → size=(${sx.toFixed(1)}, ${sy.toFixed(
          1
        )}, ${sz.toFixed(1)})`
      );
    }
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
    body.allowSleep = true; // Optimización
    body.sleepSpeedLimit = 0.1;
    body.sleepTimeLimit = 1.0;
    body.collisionResponse = true;

    // Aplicar CollisionGroups a todas las shapes
    body.shapes.forEach((shape) => {
      shape.collisionFilterGroup = CollisionGroups.Default;
      shape.collisionFilterMask = -1;
    });

    this.world.addBody(body);
    (body as ICullableBody).isActive = true; // Inicializar tag
    this.bodies.set(id, body);
    if (this.verboseColliderLogs()) {
      console.log(
        `🚀 Automatic collider created: ${id} at (${position.x.toFixed(
          1
        )}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}) shape=${
          cannonShape.type
        }`
      );
    }

    return body;
  }

  // Crear box colliders a partir de meshes cuyo nombre cumpla un predicado (e.g., UCX_*)
  createUCXBoxCollidersFromScene(
    scene: THREE.Object3D,
    filter: (name: string) => boolean,
    idPrefix: string
  ) {
    let count = 0;
    const v = this.verboseColliderLogs();
    if (v) {
      console.log(
        `🔧 createUCXBoxCollidersFromScene: Starting with prefix ${idPrefix}`
      );
    }

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && filter(child.name)) {
        if (v) console.log(`🎯 Found UCX mesh: ${child.name}`);
        const mesh = child as THREE.Mesh;

        // 🔹 Hacer invisible el mesh UCX (solo para collider)
        mesh.visible = false;
        if (v) console.log(`👻 Mesh UCX oculto: ${child.name}`);

        mesh.updateMatrixWorld();
        const worldBox = new THREE.Box3().setFromObject(mesh);
        const size = worldBox.getSize(new THREE.Vector3());
        const center = worldBox.getCenter(new THREE.Vector3());

        const pos: [number, number, number] = [
          center.x,
          worldBox.min.y,
          center.z,
        ];
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

    if (v || count > 0) {
      console.log(
        `📊 UCX Box Colliders created: ${count} for prefix ${idPrefix}`
      );
    }
    return count;
  }

  // Crear collider desde el mesh real de un modelo GLB
  createMeshCollider(
    mesh: THREE.Object3D,
    position: [number, number, number],
    scale: [number, number, number],
    id: string
  ) {
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
    if (this.verboseColliderLogs()) {
      console.log(
        `🎨 Mesh collider created (three-to-cannon): ${id} with ${meshesProcessed} meshes at (${position[0].toFixed(
          1
        )}, ${position[1].toFixed(1)}, ${position[2].toFixed(1)})`
      );
    }
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
    if (count > 0 && this.verboseColliderLogs()) {
      console.log(`📦 BBox colliders creados: ${count} (${idPrefix})`);
    }
    return count;
  }

  // 🎯 OPTIMIZED: Crear colliders inteligentes según tipo de objeto
  // Consolida la lógica de Trimesh, Convex Hull y Primitivas en un solo pase
  createOptimizedColliders(scene: THREE.Object3D, idPrefix: string) {
    const stats = {
      trees: 0,
      rocks: 0,
      poles: 0,
      stairs: 0, // Convex Hull (Rampas suaves)
      terrain: 0, // Heightfield (Montañas/Terreno complejo)
      floors: 0, // Box (Suelo plano)
      walls: 0, // Box/Trimesh
      skipped: 0,
    };

    // 1. Identificar objetos que YA tienen collider manual (UCX_)
    const ucxObjects = new Set<string>();
    scene.traverse((child) => {
      if (child.name.startsWith("UCX_")) {
        // Extraer el nombre base del objeto (UCX_TreeName_01 -> TreeName)
        const baseName = child.name.replace(/^UCX_/, "").replace(/_\d+$/, "");
        ucxObjects.add(baseName.toLowerCase());
      }
    });

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const name = child.name.toLowerCase();

      // ⚠️ SKIP: Si es un UCX o collider manual, ignorar (ya se procesó en createUCXBoxCollidersFromScene)
      if (name.startsWith("ucx_") || name.includes("collision")) return;

      // ⚠️ SKIP: Si este objeto ya tiene UCX_ asociado, no crear collider duplicado
      const baseName = child.name.replace(/_\d+$/, "");
      if (ucxObjects.has(baseName.toLowerCase())) {
        stats.skipped++;
        return;
      }

      const id = `${idPrefix}-${child.name}-${mesh.id}`;
      if (this.bodies.has(id)) return;

      mesh.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(mesh);
      const size = bbox.getSize(new THREE.Vector3());

      // --- LÓGICA DE SELECCIÓN DE COLLIDER ---

      // 1. 🪜 ESCALERAS / RAMPAS -> Convex Hull (Para suavizar pasos)
      if (/stair|ramp|step|escalera|rampa/i.test(name)) {
        // Convex Hull crea una "envoltura" que tapa los huecos de los escalones -> Rampa lisa
        const result = threeToCannon(mesh, { type: ShapeType.HULL });
        if (result?.shape) {
          // Una sola vía: world transform desde el mesh (evita body duplicado en el mundo)
          this.createColliderFromResult(mesh, result, id);
          stats.stairs++;
          return;
        }
      }

      // 2. ⛰️ TERRENO / MONTAÑAS -> Heightfield (Súper optimizado)
      if (/hill|mountain|terrain|cliff|slope|montaña|terreno/i.test(name)) {
        // 🎯 SMART OPTIMIZATION: Si el "terreno" es plano (altura baja), usar Box
        // Esto arregla el lag si el usuario llama "Terrain" a un piso plano.
        if (size.y < 2.0) {
          const result = threeToCannon(mesh, { type: ShapeType.BOX });
          if (result?.shape) {
            this.createColliderFromResult(mesh, result, id);
            stats.floors++; // Contarlo como piso optimizado
            if (this.verboseColliderLogs()) {
              console.log(
                `🛣️ Smart Optimization: Flat Terrain '${name}' -> Box Collider`
              );
            }
            return;
          }
        }

        // Si es alto (> 2m), usar Heightfield real
        // Usar Heightfield en lugar de Trimesh
        // Resolution 1.0 = 1 metro por punto. Ajustar según necesidad.
        if (this.createHeightfieldFromMesh(mesh, id, 1.0)) {
          stats.terrain++;
          return;
        }
      }

      // 3. 🌳 ÁRBOLES -> Cilindro (Tronco) + Esfera (Copa)
      // USAR WORLD AABB para evitar problemas de rotación (Z-up vs Y-up)
      if (/tree|arbol|palm|pine|oak/i.test(name)) {
        const trunkRadius = Math.min(size.x, size.z) * 0.2;
        const trunkHeight = size.y * 0.6;
        const crownRadius = Math.max(size.x, size.z) * 0.4;

        const body = new CANNON.Body({ mass: 0 });
        // Tronco (Cylinder es Y-up por defecto)
        const trunkShape = new CANNON.Cylinder(
          trunkRadius,
          trunkRadius,
          trunkHeight,
          8
        );
        // Offset del tronco relativo al centro del AABB (que será el centro del body)
        // El AABB center está en size.y/2. El tronco mide trunkHeight.
        // Queremos que la base del tronco esté en bbox.min.y.
        // Body pos = bbox.center.
        // Trunk local pos: y = -size.y/2 + trunkHeight/2
        const trunkOffset = -size.y / 2 + trunkHeight / 2;
        body.addShape(trunkShape, new CANNON.Vec3(0, trunkOffset, 0));

        // Copa
        const crownShape = new CANNON.Sphere(crownRadius);
        const crownOffset = -size.y / 2 + trunkHeight + crownRadius * 0.5;
        body.addShape(crownShape, new CANNON.Vec3(0, crownOffset, 0));

        // Usar posición del AABB Center y Rotación Identity (Vertical)
        const center = bbox.getCenter(new THREE.Vector3());
        body.position.set(center.x, center.y, center.z);
        body.quaternion.set(0, 0, 0, 1); // Identity -> Siempre vertical

        this.addStaticBody(body, id);
        stats.trees++;
        return;
      }

      // 4. 🪨 ROCAS -> Convex Hull (Mejor ajuste que esfera)
      if (/rock|stone|piedra|boulder/i.test(name)) {
        const result = threeToCannon(mesh, { type: ShapeType.HULL });
        if (result?.shape) {
          this.createColliderFromResult(mesh, result, id);
          stats.rocks++;
          return;
        }
      }

      // 5. �️ SUELO / CALLE / PISO -> Box (Súper eficiente)
      // Si es plano y simple, usar Box es lo mejor.
      if (
        /floor|ground|piso|suelo|road|calle|street|acera|sidewalk/i.test(name)
      ) {
        // Usar Box AABB del mundo
        // Nota: Si el suelo está rotado, AABB puede ser muy grande.
        // Pero para suelos planos alineados (como calles), Box es perfecto.
        // Si es muy complejo, quizás Trimesh sea necesario, pero probemos Box primero para FPS.

        // Si tiene rotación compleja, threeToCannon BOX usa OBB (Oriented Bounding Box)
        const result = threeToCannon(mesh, { type: ShapeType.BOX });
        if (result?.shape) {
          this.createColliderFromResult(mesh, result, id);
          stats.floors++;
          if (this.verboseColliderLogs()) {
            console.log(`🛣️ Optimized Floor/Road: ${id}`);
          }
          return;
        }
      }

      // 6. 🚦 SEMÁFOROS -> Box (Alineación perfecta)
      // Solo aplicamos esto a Semáforos que el usuario reportó como "desfasados".
      // Los "Stops" ya estaban bien, así que los dejamos tranquilos (probablemente caen en Pole o Floor).
      if (/traffic|semaforo/i.test(name)) {
        // FIX: Usar AABB del mundo para forzar orientación vertical
        // threeToCannon a veces rota el Box si el mesh está rotado, causando que se "acueste".
        // Al usar AABB, obtenemos una caja alineada con los ejes del mundo (siempre vertical).
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        // 🚨 FORCE VERTICALITY: Si la caja está "acostada" (ancho > alto), intercambiamos dimensiones.
        // Esto arregla los postes que aparecen tirados en el eje X.
        let sx = size.x;
        let sy = size.y;
        let sz = size.z;

        if (sy < sx || sy < sz) {
          if (this.verboseColliderLogs()) {
            console.log(
              `🔄 Auto-Rotating Traffic Light: ${id} (was ${sx.toFixed(
                2
              )}x${sy.toFixed(2)}x${sz.toFixed(2)})`
            );
          }
          // Encontrar la dimensión más larga y asignarla a Y (altura)
          const maxDim = Math.max(sx, sy, sz);
          if (maxDim === sx) {
            sx = sy;
            sy = maxDim;
          } else if (maxDim === sz) {
            sz = sy;
            sy = maxDim;
          }
        }

        // Crear Box con las dimensiones corregidas
        const halfExtents = new CANNON.Vec3(sx / 2, sy / 2, sz / 2);
        const shape = new CANNON.Box(halfExtents);
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(center.x, center.y, center.z);

        this.addStaticBody(body, id);
        stats.poles++;
        if (this.verboseColliderLogs()) {
          console.log(`🚦 Traffic Light Optimized (AABB+Vertical): ${id}`);
        }
        return;
      }

      // 7. 🚦 POSTES (Genéricos) -> Cilindro delgado
      // USAR WORLD AABB
      if (/pole|post|lamp|farol|light/i.test(name)) {
        const radius = Math.min(size.x, size.z) * 0.3;
        const height = size.y;
        const shape = new CANNON.Cylinder(radius, radius, height, 8);
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape, new CANNON.Vec3(0, height / 2, 0));
        this.setBodyTransformFromMesh(body, mesh);
        this.addStaticBody(body, id);
        stats.poles++;
        return;
      }

      // 8. 🧱 MUROS / EDIFICIOS -> Box (Si es simple) o Convex Hull (Si es convexo)
      // EXCLUIMOS edificios especiales (Police, Hospital, etc) porque tienen escaleras/interiores
      if (/wall|building|house|muro|edificio|casa/i.test(name)) {
        // 1. Intentar Box primero (Súper rápido)
        const boxResult = threeToCannon(mesh, { type: ShapeType.BOX });
        if (boxResult?.shape) {
          this.createColliderFromResult(mesh, boxResult, id);
          stats.walls++;
          return;
        }

        // 2. Intentar Convex Hull (Rápido y mejor forma que Box)
        const hullResult = threeToCannon(mesh, { type: ShapeType.HULL });
        if (hullResult?.shape) {
          this.createColliderFromResult(mesh, hullResult, id);
          stats.walls++;
          return;
        }

        // 3. Fallback a Trimesh
        if (this.createTrimeshColliderFromWorldMesh(mesh, id)) {
          stats.walls++;
          return;
        }
      }

      // 9. 🏛️ EDIFICIOS ESPECIALES -> Trimesh (Obligatorio para escaleras/interiores)
      if (/police|hospital|cityhall|firestation|cafe/i.test(name)) {
        if (this.createTrimeshColliderFromWorldMesh(mesh, id)) {
          stats.walls++;
          if (this.verboseColliderLogs()) {
            console.log(`🏛️ Special Building Trimesh: ${id}`);
          }
          return;
        }
      }
    });

    if (this.verboseColliderLogs()) {
      console.log(`✨ Optimized Colliders Created (${idPrefix}):`, stats);
    }
    return stats;
  }

  // Helper: Configurar body estático común
  private addStaticBody(body: CANNON.Body, id: string) {
    body.material = this.staticMaterial;
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.1;
    body.sleepTimeLimit = 1.0;
    body.collisionResponse = true;
    body.shapes.forEach((s) => {
      s.collisionFilterGroup = CollisionGroups.Default;
      s.collisionFilterMask = -1;
    });
    this.world.addBody(body);
    (body as ICullableBody).isActive = true;
    this.bodies.set(id, body);
  }

  // Helper: Setear posición/rotación desde mesh
  private setBodyTransformFromMesh(body: CANNON.Body, mesh: THREE.Mesh) {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    mesh.getWorldPosition(worldPos);
    mesh.getWorldQuaternion(worldQuat);
    body.position.set(worldPos.x, worldPos.y, worldPos.z);
    body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);
  }

  // Helper: Crear collider desde resultado de three-to-cannon
  private createColliderFromResult(
    mesh: THREE.Mesh,
    result: {
      shape: CANNON.Shape;
      offset?: CANNON.Vec3;
      orientation?: CANNON.Quaternion;
    },
    id: string
  ) {
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(result.shape, result.offset, result.orientation);
    this.setBodyTransformFromMesh(body, mesh);
    this.addStaticBody(body, id);
  }

  // Construir Trimesh robusto aplicando matrixWorld y limpiando triángulos degenerados
  private createTrimeshColliderFromWorldMesh(mesh: THREE.Mesh, id: string) {
    const geom = mesh.geometry;
    const posAttr = geom?.attributes?.position;
    if (!geom || !posAttr || posAttr.count < 3) return false;

    // 1. Calcular el centro del objeto en el mundo para usarlo como posición del Body
    mesh.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = bbox.getCenter(new THREE.Vector3());

    const cloned = geom.clone();
    cloned.applyMatrix4(mesh.matrixWorld);

    const p = cloned.attributes.position as THREE.BufferAttribute;
    const idx = cloned.index;

    const vertices: number[] = [];
    // 2. Guardar vértices RELATIVOS al centro del cuerpo
    // Esto es CRUCIAL para que el culling funcione bien.
    // Si los vértices son world-space y el body está en (0,0,0), el culling falla.
    for (let i = 0; i < p.count; i++) {
      vertices.push(
        p.getX(i) - center.x,
        p.getY(i) - center.y,
        p.getZ(i) - center.z
      );
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
      const a = indices[i],
        b = indices[i + 1],
        c = indices[i + 2];
      if (a !== b && b !== c && a !== c) filtered.push(a, b, c);
    }

    const trimesh = new CANNON.Trimesh(vertices, filtered);
    const body = new CANNON.Body({
      mass: 0,
      collisionFilterGroup: CollisionGroups.Default,
      collisionFilterMask: -1, // Colisiona con todo
    });
    body.addShape(trimesh);
    // 3. Posicionar el cuerpo en el centro calculado
    body.position.set(center.x, center.y, center.z);

    body.material = this.staticMaterial;
    body.allowSleep = true; // OPTIMIZACIÓN: Permitir sleep para Trimesh
    body.sleepSpeedLimit = 0.1;
    body.sleepTimeLimit = 1.0;
    body.collisionResponse = true;

    if (this.verboseColliderLogs()) {
      if (id.includes("Tree_") || id.includes("Building") || id.includes("SM_")) {
        console.log(
          `🌳 Trimesh ${id}: pos=(${body.position.x.toFixed(
            1
          )}, ${body.position.y.toFixed(1)}, ${body.position.z.toFixed(
            1
          )}), group=${body.collisionFilterGroup}, mask=${
            body.collisionFilterMask
          }, vertices=${vertices.length / 3}, triangles=${filtered.length / 3}`
        );
      }
    }

    this.world.addBody(body);
    (body as ICullableBody).isActive = true;
    this.bodies.set(id, body);
    return true;
  }

  // 🚀 NUEVO: Convertir Mesh a Heightfield (Súper optimizado para terrenos)
  private createHeightfieldFromMesh(
    mesh: THREE.Mesh,
    id: string,
    resolution: number = 1.0
  ) {
    mesh.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = bbox.getSize(new THREE.Vector3());

    // Calcular dimensiones de la grilla
    // resolution = metros por punto (ej: 1.0 = 1 metro)
    const elementSize = resolution;
    const nx = Math.ceil(size.x / elementSize) + 1;
    const nz = Math.ceil(size.z / elementSize) + 1;

    // Matriz de alturas
    const data: number[][] = [];

    // Raycaster para muestrear alturas
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    // Altura de inicio del rayo (arriba del punto más alto)
    const rayY = bbox.max.y + 10;

    // Iterar sobre la grilla X/Z
    for (let i = 0; i < nx; i++) {
      const row: number[] = [];
      for (let j = 0; j < nz; j++) {
        // Calcular posición X/Z en el mundo
        // Heightfield en Cannon con rotación -90 en X:
        // Local X+ -> World X+
        // Local Y+ -> World Z- (Hacia atrás)
        // Por lo tanto, el origen (0,0) local está en (WorldX_min, WorldZ_max)
        // y j aumenta hacia WorldZ_min.

        const x = bbox.min.x + i * elementSize;
        const z = bbox.max.z - j * elementSize; // ⚠️ FIX: Escanear desde MaxZ hacia abajo

        // Lanzar rayo hacia abajo
        raycaster.set(new THREE.Vector3(x, rayY, z), down);
        // Intersectar solo con este mesh
        const intersects = raycaster.intersectObject(mesh, false); // false = no recursive (asumiendo mesh simple)

        if (intersects.length > 0) {
          // Tomar el punto más alto
          row.push(intersects[0].point.y);
        } else {
          // Si no hay intersección (hueco), usar altura mínima
          row.push(bbox.min.y - 1);
        }
      }
      data.push(row);
    }

    // Crear Heightfield Shape
    // elementSize es la distancia entre puntos
    const hfShape = new CANNON.Heightfield(data, {
      elementSize: elementSize,
    });

    const body = new CANNON.Body({ mass: 0 });
    body.addShape(hfShape);

    // Rotación standard para Heightfield en Cannon (Z-up local -> Y-up world):
    // Esto mapea Local Y+ a World Z-
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    // ⚠️ FIX: Posicionar en la esquina superior izquierda (MinX, 0, MaxZ)
    // Porque el heightfield crece hacia +X y -Z (en coordenadas mundo)
    body.position.set(bbox.min.x, 0, bbox.max.z);

    body.material = this.staticMaterial;
    body.collisionFilterGroup = CollisionGroups.Default;
    body.collisionFilterMask = -1;

    this.world.addBody(body);
    (body as ICullableBody).isActive = true;
    this.bodies.set(id, body);

    if (this.verboseColliderLogs()) {
      console.log(
        `🏔️ Heightfield created for ${id}: ${nx}x${nz} points (Fixed Orientation)`
      );
    }
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
    console.log("🧹 Cannon.js physics disposed");
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

  /**
   * Obtener estadísticas detalladas de física (útil para debugging)
   * Puedes llamar esto desde la consola del navegador
   */
  getPhysicsStats() {
    const activeColliders = Array.from(this.bodies.values()).filter(
      (b) => (b as ICullableBody).isActive !== false
    ).length;
    const inactiveColliders = this.bodies.size - activeColliders;

    const collidersByType: Record<string, number> = {};
    this.bodies.forEach((body) => {
      body.shapes.forEach((shape) => {
        const type = shape.type;
        collidersByType[type] = (collidersByType[type] || 0) + 1;
      });
    });

    return {
      totalColliders: this.bodies.size,
      activeColliders,
      inactiveColliders,
      bodiesInWorld: this.world.bodies.length,
      collidersByType,
      hasPlayer: !!this.playerBody,
      vehicleCount: this.vehicles.length,
    };
  }
}
