/**
 * Collision Helper - Utilidades para crear y gestionar colliders optimizados
 * Inspirado en Sketchbook
 * 
 * Este helper funciona en conjunto con:
 * - cannonPhysics.ts: Sistema principal de física con Cannon.js
 * - collisionSystem.ts: Sistema de colisiones básico de Three.js (fallback)
 * 
 * Proporciona métodos de alto nivel para crear colliders optimizados
 * sin necesidad de conocer los detalles de implementación.
 */

import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { CollisionGroups } from '@/constants/collisionGroups';
import type { CannonPhysics } from '@/lib/three/cannonPhysics';

export interface ColliderConfig {
  type: 'box' | 'sphere' | 'cylinder' | 'trimesh' | 'compound';
  mass?: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  group?: number;
  mask?: number;
  material?: CANNON.Material;
  friction?: number;
  restitution?: number;
}

export class CollisionHelper {
  /**
   * Crea un collider box optimizado
   */
  static createBoxCollider(
    size: { x: number; y: number; z: number },
    config: ColliderConfig
  ): CANNON.Body {
    const MIN_THICKNESS = 0.2;
    const halfExtents = new CANNON.Vec3(
      Math.max(size.x / 2, MIN_THICKNESS),
      Math.max(size.y / 2, MIN_THICKNESS),
      Math.max(size.z / 2, MIN_THICKNESS)
    );

    const shape = new CANNON.Box(halfExtents);
    const body = new CANNON.Body({
      mass: config.mass ?? 0,
      shape,
      collisionFilterGroup: config.group ?? CollisionGroups.Default,
      collisionFilterMask: config.mask ?? -1, // Colisiona con todo
      material: config.material,
    });

    if (config.position) {
      body.position.set(config.position.x, config.position.y, config.position.z);
    }

    if (config.rotation) {
      body.quaternion.setFromEuler(config.rotation.x, config.rotation.y, config.rotation.z);
    }

    return body;
  }

  /**
   * Crea un collider esférico optimizado
   */
  static createSphereCollider(
    radius: number,
    config: ColliderConfig
  ): CANNON.Body {
    const shape = new CANNON.Sphere(Math.max(radius, 0.1));
    const body = new CANNON.Body({
      mass: config.mass ?? 0,
      shape,
      collisionFilterGroup: config.group ?? CollisionGroups.Default,
      collisionFilterMask: config.mask ?? -1, // Colisiona con todo
      material: config.material,
    });

    if (config.position) {
      body.position.set(config.position.x, config.position.y, config.position.z);
    }

    return body;
  }

  /**
   * Crea un collider cilíndrico optimizado
   */
  static createCylinderCollider(
    radius: number,
    height: number,
    config: ColliderConfig
  ): CANNON.Body {
    const shape = new CANNON.Cylinder(
      Math.max(radius, 0.1),
      Math.max(radius, 0.1),
      Math.max(height, 0.2),
      8 // segments
    );
    const body = new CANNON.Body({
      mass: config.mass ?? 0,
      shape,
      collisionFilterGroup: config.group ?? CollisionGroups.Default,
      collisionFilterMask: config.mask ?? -1, // Colisiona con todo
      material: config.material,
    });

    if (config.position) {
      body.position.set(config.position.x, config.position.y, config.position.z);
    }

    if (config.rotation) {
      body.quaternion.setFromEuler(config.rotation.x, config.rotation.y, config.rotation.z);
    }

    return body;
  }

  /**
   * Crea un collider compuesto para objetos complejos (ej: árbol = cilindro + esfera)
   */
  static createCompoundCollider(
    shapes: Array<{ shape: CANNON.Shape; offset?: CANNON.Vec3; orientation?: CANNON.Quaternion }>,
    config: ColliderConfig
  ): CANNON.Body {
    const body = new CANNON.Body({
      mass: config.mass ?? 0,
      collisionFilterGroup: config.group ?? CollisionGroups.Default,
      collisionFilterMask: config.mask ?? -1, // Colisiona con todo
      material: config.material,
    });

    shapes.forEach(({ shape, offset, orientation }) => {
      body.addShape(shape, offset, orientation);
    });

    if (config.position) {
      body.position.set(config.position.x, config.position.y, config.position.z);
    }

    if (config.rotation) {
      body.quaternion.setFromEuler(config.rotation.x, config.rotation.y, config.rotation.z);
    }

    return body;
  }

  /**
   * Crea un collider optimizado para un árbol (cilindro + esfera)
   */
  static createTreeCollider(
    position: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
    config: Partial<ColliderConfig> = {}
  ): CANNON.Body {
    const trunkRadius = Math.min(size.x, size.z) * 0.2;
    const trunkHeight = size.y * 0.6;
    const canopyRadius = Math.max(size.x, size.z) * 0.4;

    const trunk = new CANNON.Cylinder(trunkRadius, trunkRadius, trunkHeight, 8);
    const canopy = new CANNON.Sphere(canopyRadius);

    return this.createCompoundCollider(
      [
        { shape: trunk, offset: new CANNON.Vec3(0, trunkHeight / 2, 0) },
        { shape: canopy, offset: new CANNON.Vec3(0, trunkHeight + canopyRadius, 0) },
      ],
      {
        ...config,
        type: 'compound',
        position,
        group: config.group ?? CollisionGroups.Default,
        mask: config.mask ?? -1,
      }
    );
  }

  /**
   * Crea un collider optimizado para una roca (esfera)
   */
  static createRockCollider(
    position: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
    config: Partial<ColliderConfig> = {}
  ): CANNON.Body {
    const radius = Math.max(size.x, size.y, size.z) * 0.5;

    return this.createSphereCollider(radius, {
      ...config,
      type: 'sphere',
      position,
      group: config.group ?? CollisionGroups.Default,
      mask: config.mask ?? -1,
    });
  }

  /**
   * Crea un collider optimizado para un edificio (box)
   */
  static createBuildingCollider(
    position: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
    config: Partial<ColliderConfig> = {}
  ): CANNON.Body {
    return this.createBoxCollider(size, {
      ...config,
      type: 'box',
      position,
      group: config.group ?? CollisionGroups.Default,
      mask: config.mask ?? -1,
    });
  }

  /**
   * Extrae información de un mesh de Three.js para crear collider
   */
  static extractMeshInfo(mesh: THREE.Mesh): {
    position: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
    center: { x: number; y: number; z: number };
  } {
    mesh.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());

    return {
      position: { x: center.x, y: bbox.min.y, z: center.z },
      size: { x: size.x, y: size.y, z: size.z },
      center: { x: center.x, y: center.y, z: center.z },
    };
  }

  /**
   * Detecta el tipo de objeto basándose en su nombre
   */
  static detectObjectType(name: string): 'tree' | 'rock' | 'building' | 'pole' | 'unknown' {
    const lowerName = name.toLowerCase();

    if (/tree|arbol|palm|pine|oak|bush/i.test(lowerName)) {
      return 'tree';
    }

    if (/rock|stone|boulder|piedra/i.test(lowerName)) {
      return 'rock';
    }

    if (/building|house|edificio|casa|wall|pared/i.test(lowerName)) {
      return 'building';
    }

    if (/pole|post|poste|column|columna/i.test(lowerName)) {
      return 'pole';
    }

    return 'unknown';
  }

  /**
   * Crea un collider automático basándose en el tipo de objeto
   */
  static createAutoCollider(
    mesh: THREE.Mesh,
    config: Partial<ColliderConfig> = {}
  ): CANNON.Body | null {
    const type = this.detectObjectType(mesh.name);
    const info = this.extractMeshInfo(mesh);

    switch (type) {
      case 'tree':
        return this.createTreeCollider(info.position, info.size, config);
      case 'rock':
        return this.createRockCollider(info.position, info.size, config);
      case 'building':
        return this.createBuildingCollider(info.position, info.size, config);
      case 'pole':
        return this.createCylinderCollider(
          Math.min(info.size.x, info.size.z) * 0.5,
          info.size.y,
          { ...config, type: 'cylinder', position: info.position }
        );
      default:
        // Fallback: box genérico
        return this.createBoxCollider(info.size, { ...config, type: 'box', position: info.position });
    }
  }

  /**
   * Verifica si un objeto tiene UCX collider
   */
  static hasUCXCollider(scene: THREE.Object3D, objectName: string): boolean {
    let hasUCX = false;
    const baseName = objectName.replace(/_\d+$/, '').toLowerCase();

    scene.traverse((child) => {
      if (child.name.startsWith('UCX_')) {
        const ucxBaseName = child.name
          .replace(/^UCX_/, '')
          .replace(/_\d+$/, '')
          .toLowerCase();
        if (ucxBaseName === baseName) {
          hasUCX = true;
        }
      }
    });

    return hasUCX;
  }

  /**
   * Crea colliders para toda una escena de forma optimizada
   * NOTA: Este método es de bajo nivel. Para uso normal, usa el método
   * createCollidersWithPhysics() que integra con CannonPhysics.
   */
  static createCollidersForScene(
    scene: THREE.Object3D,
    world: CANNON.World,
    options: {
      useUCX?: boolean;
      skipObjects?: string[];
      onlyObjects?: string[];
    } = {}
  ): Map<string, CANNON.Body> {
    const bodies = new Map<string, CANNON.Body>();
    let count = 0;

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      // Skip si está en la lista de exclusión
      if (options.skipObjects?.includes(mesh.name)) return;

      // Skip si no está en la lista de inclusión (si se especificó)
      if (options.onlyObjects && !options.onlyObjects.includes(mesh.name)) return;

      // Skip si tiene UCX y useUCX está activado
      if (options.useUCX && this.hasUCXCollider(scene, mesh.name)) return;

      // Crear collider automático
      const body = this.createAutoCollider(mesh);
      if (body) {
        const id = `auto-collider-${count++}`;
        bodies.set(id, body);
        world.addBody(body);
      }
    });

    console.log(`✅ Created ${count} auto colliders for scene`);
    return bodies;
  }

  /**
   * Método de alto nivel: Crea colliders usando el sistema CannonPhysics
   * Este es el método recomendado para usar en el juego.
   * 
   * @param physics - Instancia de CannonPhysics
   * @param scene - Escena de Three.js
   * @param mapId - ID del mapa (para prefijo de colliders)
   * @param options - Opciones de creación
   * @returns Estadísticas de colliders creados
   */
  static createCollidersWithPhysics(
    physics: CannonPhysics,
    scene: THREE.Object3D,
    mapId: string,
    options: {
      useUCX?: boolean;
      usePrecise?: boolean;
      skipObjects?: string[];
    } = {}
  ): {
    ucx: number;
    precise: { trees: number; rocks: number; poles: number; skipped: number };
    total: number;
  } {
    console.log(`🔧 CollisionHelper: Creando colliders para mapa ${mapId}`);
    
    let ucxCount = 0;
    let preciseStats = { trees: 0, rocks: 0, poles: 0, skipped: 0 };

    // 1. Crear colliders UCX si están habilitados
    if (options.useUCX !== false) {
      ucxCount = physics.createUCXAutoCollidersFromScene(scene, mapId);
      console.log(`✅ UCX Colliders: ${ucxCount}`);
    }

    // 2. Crear colliders precisos si están habilitados
    if (options.usePrecise !== false) {
      preciseStats = physics.createPreciseCollidersFromScene(scene, mapId);
      console.log(`✅ Precise Colliders: ${preciseStats.trees} árboles, ${preciseStats.rocks} rocas, ${preciseStats.poles} postes`);
    }

    const total = ucxCount + preciseStats.trees + preciseStats.rocks + preciseStats.poles;
    
    console.log(`🎉 Total de colliders creados: ${total}`);
    console.log(`⏭️  Objetos saltados (ya tienen UCX): ${preciseStats.skipped}`);

    return {
      ucx: ucxCount,
      precise: preciseStats,
      total,
    };
  }

  /**
   * Crea un collider para un edificio/estructura usando CannonPhysics
   * Usa el método optimizado de CannonPhysics que divide colliders grandes
   */
  static createBuildingColliderWithPhysics(
    physics: CannonPhysics,
    position: { x: number; y: number; z: number },
    size: { x: number; y: number; z: number },
    id: string
  ): void {
    // Usar el método de CannonPhysics que maneja subdivisión automática
    physics.createBoxCollider(
      [position.x, position.y, position.z],
      [size.x, size.y, size.z],
      id
    );
  }

  /**
   * Crea un collider para un árbol usando CannonPhysics
   */
  static createTreeColliderWithPhysics(
    physics: CannonPhysics,
    position: { x: number; y: number; z: number },
    radius: number = 0.5,
    height: number = 5,
    id: string
  ): void {
    physics.createTreeCollider(
      [position.x, position.y, position.z],
      radius,
      height,
      id
    );
  }

  /**
   * Crea un collider para una roca usando CannonPhysics
   */
  static createRockColliderWithPhysics(
    physics: CannonPhysics,
    position: { x: number; y: number; z: number },
    radius: number = 1.0,
    id: string
  ): void {
    physics.createRockCollider(
      [position.x, position.y, position.z],
      radius,
      id
    );
  }

  /**
   * Limpia todos los colliders de un mapa específico
   */
  static clearMapColliders(
    physics: CannonPhysics,
    mapId: string
  ): number {
    return physics.removeBodiesByPrefix(mapId);
  }

  /**
   * Obtiene información de debug sobre los colliders
   */
  static getColliderStats(physics: CannonPhysics): {
    totalBodies: number;
    playerBody: boolean;
    vehicleBodies: number;
  } {
    const world = physics.getWorld();
    const bodies = world.bodies;
    
    // Contar vehículos (bodies con masa > 0 que no son el jugador)
    const vehicleBodies = bodies.filter(b => b.mass > 1).length;
    
    return {
      totalBodies: bodies.length,
      playerBody: bodies.some(b => b.mass === 1), // El jugador tiene masa 1
      vehicleBodies,
    };
  }

  /**
   * Valida que un collider esté correctamente configurado
   */
  static validateCollider(body: CANNON.Body): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Verificar que tenga al menos una shape
    if (body.shapes.length === 0) {
      warnings.push('Body no tiene shapes');
    }

    // Verificar collision groups
    if (body.collisionFilterGroup === 0) {
      warnings.push('CollisionFilterGroup no está configurado');
    }

    // Verificar collision mask
    if (body.collisionFilterMask === 0) {
      warnings.push('CollisionFilterMask está en 0 (no colisionará con nada)');
    }

    // Verificar material
    if (!body.material) {
      warnings.push('Body no tiene material asignado');
    }

    // Verificar collisionResponse
    if (!body.collisionResponse) {
      warnings.push('collisionResponse está desactivado');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }
}


/**
 * GUÍA DE USO RÁPIDO
 * ===================
 * 
 * 1. Crear colliders para un mapa completo (RECOMENDADO):
 * 
 *    const stats = CollisionHelper.createCollidersWithPhysics(
 *      physics,
 *      scene,
 *      'exterior',
 *      { useUCX: true, usePrecise: true }
 *    );
 * 
 * 2. Crear collider individual para edificio:
 * 
 *    CollisionHelper.createBuildingColliderWithPhysics(
 *      physics,
 *      { x: 0, y: 0, z: 0 },
 *      { x: 10, y: 5, z: 10 },
 *      'building-hotel'
 *    );
 * 
 * 3. Crear collider individual para árbol:
 * 
 *    CollisionHelper.createTreeColliderWithPhysics(
 *      physics,
 *      { x: 5, y: 0, z: 5 },
 *      0.5,  // radio
 *      8,    // altura
 *      'tree-01'
 *    );
 * 
 * 4. Limpiar colliders de un mapa:
 * 
 *    const removed = CollisionHelper.clearMapColliders(physics, 'exterior');
 *    console.log(`Removed ${removed} colliders`);
 * 
 * 5. Obtener estadísticas:
 * 
 *    const stats = CollisionHelper.getColliderStats(physics);
 *    console.log(`Total bodies: ${stats.totalBodies}`);
 */

