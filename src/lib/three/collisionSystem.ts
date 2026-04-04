import * as THREE from "three";
import { frameworkDemoLandmarkBuildingUserDataName } from "@/lib/frameworkBranding";

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
    const groundLevel = 0.5; // Nivel del suelo (terreno está en Y=-0.5, jugador en Y=0.5)
    
    // Si el jugador está por debajo del suelo, ponerlo en el suelo
    if (correctedPosition.y < groundLevel) {
      correctedPosition.y = groundLevel;
      console.log(`🏃 Aterrizando en suelo: ${correctedPosition.y}`);
    }
    
    // Verificar colisiones con edificios/árboles
    for (const collider of this.colliders) {
      if (!collider.userData.isCollider) continue;
      
      const collisionType = collider.userData.collisionType;
      const buildingName = collider.userData.buildingName;
      
      if (collisionType === 'building' || collisionType === 'tree') {
        if (this.checkBoxCollision(correctedPosition, collider)) {
          if (buildingName === frameworkDemoLandmarkBuildingUserDataName) {
            console.log("🏢 Colisión con edificio demo — bloqueando movimiento");
            return playerPosition; // Devolver posición original sin cambios
          } else {
            console.log(`🚫 Colisión con ${collisionType} - manteniendo posición`);
            return playerPosition; // Devolver posición original sin cambios
          }
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
    const margin = this.playerRadius + 0.5; // Margen reducido para colisiones más precisas
    
    if (box.userData.buildingName === frameworkDemoLandmarkBuildingUserDataName) {
      // Edificio demo (~ [0, 0, -100], escala [6, 6, 6])
      // Ajustar las dimensiones según la escala real
      const hotelWidth = halfSize.x * 2; // Ancho total
      const hotelHeight = halfSize.y * 2; // Altura total
      const hotelDepth = halfSize.z * 2; // Profundidad total
      
      console.log(
        `🏢 Demo landmark collision: pos(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}) vs box(${boxCenter.x.toFixed(2)}, ${boxCenter.y.toFixed(2)}, ${boxCenter.z.toFixed(2)}) size(${hotelWidth.toFixed(2)}x${hotelHeight.toFixed(2)}x${hotelDepth.toFixed(2)})`
      );
      
      return (
        position.x >= boxCenter.x - halfSize.x - margin &&
        position.x <= boxCenter.x + halfSize.x + margin &&
        position.y >= boxCenter.y - halfSize.y &&
        position.y <= boxCenter.y + halfSize.y + this.playerHeight &&
        position.z >= boxCenter.z - halfSize.z - margin &&
        position.z <= boxCenter.z + halfSize.z + margin
      );
    }
    
    // Colisión genérica para otros edificios
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
