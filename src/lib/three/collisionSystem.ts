import * as THREE from 'three';

export class CollisionSystem {
  private colliders: THREE.Mesh[] = [];
  private playerRadius = 0.5;
  private playerHeight = 2;

  addCollider(mesh: THREE.Mesh) {
    this.colliders.push(mesh);
  }

  removeCollider(mesh: THREE.Mesh) {
    const index = this.colliders.indexOf(mesh);
    if (index > -1) {
      this.colliders.splice(index, 1);
    }
  }

  checkCollision(playerPosition: THREE.Vector3): THREE.Vector3 {
    const correctedPosition = playerPosition.clone();
    
    // Manejar colisiones con el terreno (suelo)
    const groundLevel = 1; // Nivel del suelo (terreno está en Y=0, jugador en Y=1)
    
    // Si el jugador está por debajo del suelo, ponerlo en el suelo
    if (correctedPosition.y < groundLevel) {
      correctedPosition.y = groundLevel;
    }
    
    // Verificar colisiones con edificios/árboles (solo bloquear, no empujar)
    for (const collider of this.colliders) {
      if (!collider.userData.isCollider) continue;
      
      const collisionType = collider.userData.collisionType;
      
      if (collisionType === 'building' || collisionType === 'tree') {
        // Solo verificar si está chocando, pero NO empujar
        if (this.checkBoxCollision(correctedPosition, collider)) {
          // Mantener la posición anterior (no mover)
          console.log('🚫 Colisión con', collisionType, '- manteniendo posición');
          return playerPosition; // Devolver posición original sin cambios
        }
      }
    }
    
    return correctedPosition;
  }

  private checkGroundCollision(position: THREE.Vector3, terrain: THREE.Mesh): boolean {
    // Verificar si el jugador está cerca del terreno
    const terrainPosition = terrain.position;
    const terrainScale = terrain.scale;
    
    // Calcular el área del terreno (más grande para mejor detección)
    const terrainSize = 50; // Aumentado de 25 a 50
    const halfSize = terrainSize / 2;
    
    // Verificar si está dentro del área del terreno
    const inTerrainX = position.x >= terrainPosition.x - halfSize && position.x <= terrainPosition.x + halfSize;
    const inTerrainZ = position.z >= terrainPosition.z - halfSize && position.z <= terrainPosition.z + halfSize;
    
    return inTerrainX && inTerrainZ;
  }

  private getTerrainHeight(terrain: THREE.Mesh, position: THREE.Vector3): number {
    // Simplificado: asumir que el terreno está en Y=0
    // En un sistema más avanzado, usarías raycasting
    return 0;
  }

  private checkBoxCollision(position: THREE.Vector3, box: THREE.Mesh): boolean {
    // Calcular el bounding box del edificio
    const boxSize = new THREE.Vector3();
    box.geometry.computeBoundingBox();
    if (box.geometry.boundingBox) {
      box.geometry.boundingBox.getSize(boxSize);
    }
    
    // Aplicar la escala del objeto
    const scaledSize = boxSize.multiply(box.scale);
    const halfSize = scaledSize.multiplyScalar(0.5);
    
    const boxCenter = box.position;
    
    // Verificar colisión con margen de seguridad
    const margin = this.playerRadius + 1; // Margen adicional
    
    return (
      position.x >= boxCenter.x - halfSize.x - margin &&
      position.x <= boxCenter.x + halfSize.x + margin &&
      position.y >= boxCenter.y - halfSize.y &&
      position.y <= boxCenter.y + halfSize.y + this.playerHeight &&
      position.z >= boxCenter.z - halfSize.z - margin &&
      position.z <= boxCenter.z + halfSize.z + margin
    );
  }

  // Registrar todos los meshes de colisión en la escena
  registerSceneColliders(scene: THREE.Scene) {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.isCollider) {
        this.addCollider(child);
      }
    });
  }
}

// Instancia global del sistema de colisiones
export const collisionSystem = new CollisionSystem();
