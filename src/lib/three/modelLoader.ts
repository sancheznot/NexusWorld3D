import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export interface ModelInfo {
  name: string;
  path: string;
  type: 'gltf' | 'fbx' | 'obj' | 'glb';
  category: 'nature' | 'building' | 'interior' | 'weapon' | 'prop' | 'terrain';
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export class ModelLoader {
  private gltfLoader = new GLTFLoader();
  private fbxLoader = new FBXLoader();
  private objLoader = new OBJLoader();
  private cache = new Map<string, THREE.Object3D>();

  async loadModel(modelInfo: ModelInfo): Promise<THREE.Object3D> {
    const cacheKey = `${modelInfo.category}/${modelInfo.name}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.clone();
    }

    // If path is empty, use fallback immediately
    if (!modelInfo.path || modelInfo.path.trim() === '') {
      console.log(`🔄 Using fallback for ${modelInfo.name} (no path provided)`);
      const fallback = this.createFallbackModel(modelInfo);
      this.cache.set(cacheKey, fallback.clone());
      return fallback;
    }

    try {
      let object: THREE.Object3D;

      switch (modelInfo.type) {
        case 'gltf':
        case 'glb':
          const gltf = await this.gltfLoader.loadAsync(modelInfo.path);
          object = gltf.scene;
          break;
        case 'fbx':
          object = await this.fbxLoader.loadAsync(modelInfo.path);
          break;
        case 'obj':
          object = await this.objLoader.loadAsync(modelInfo.path);
          break;
        default:
          throw new Error(`Unsupported model type: ${modelInfo.type}`);
      }

      // Apply transformations
      if (modelInfo.scale) {
        object.scale.setScalar(modelInfo.scale);
      }
      if (modelInfo.position) {
        object.position.set(...modelInfo.position);
      }
      if (modelInfo.rotation) {
        object.rotation.set(...modelInfo.rotation);
      }

      // Enable shadows
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      console.log(`✅ Loaded model: ${modelInfo.name}`);
      this.cache.set(cacheKey, object.clone());
      return object;
    } catch (error) {
      console.warn(`❌ Failed to load model ${modelInfo.name} from ${modelInfo.path}:`, error);
      console.log(`🔄 Using fallback geometry for ${modelInfo.name}`);
      // Return a fallback cube
      const fallback = this.createFallbackModel(modelInfo);
      this.cache.set(cacheKey, fallback.clone());
      return fallback;
    }
  }

  private createFallbackModel(modelInfo: ModelInfo): THREE.Object3D {
    let geometry: THREE.BufferGeometry;
    let color: number;
    
    // Use model name to determine type instead of random
    const modelName = modelInfo.name.toLowerCase();
    
    switch (modelInfo.category) {
      case 'nature':
        if (modelName.includes('grass')) {
          // Grass - thin vertical cylinder with slight variation
          geometry = new THREE.CylinderGeometry(0.05, 0.1, 1.5 + Math.random() * 0.5, 6);
          color = 0x4a5d23;
        } else if (modelName.includes('plant')) {
          // Plant - cone shape with variation
          geometry = new THREE.ConeGeometry(0.3 + Math.random() * 0.2, 1.5 + Math.random() * 0.5, 6);
          color = 0x2d5016;
        } else if (modelName.includes('flower')) {
          // Flower - sphere with petals
          geometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.1, 8, 6);
          color = 0xff6b9d;
        } else if (modelName.includes('rock')) {
          // Rock - irregular box
          geometry = new THREE.BoxGeometry(0.6 + Math.random() * 0.4, 0.4 + Math.random() * 0.2, 0.6 + Math.random() * 0.4);
          color = 0x8b7355;
        } else if (modelName.includes('tree')) {
          // Tree - trunk + leaves
          const group = new THREE.Group();
          
          // Trunk
          const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3, 8);
          const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
          const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
          trunk.position.y = 1.5;
          group.add(trunk);
          
          // Leaves
          const leavesGeometry = new THREE.SphereGeometry(1.2, 8, 6);
          const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
          const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
          leaves.position.y = 3.5;
          group.add(leaves);
          
          group.castShadow = true;
          group.receiveShadow = true;
          return group;
        } else if (modelName.includes('mushroom')) {
          // Mushroom - stem + cap
          const group = new THREE.Group();
          
          // Stem
          const stemGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1, 6);
          const stemMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
          const stem = new THREE.Mesh(stemGeometry, stemMaterial);
          stem.position.y = 0.5;
          group.add(stem);
          
          // Cap
          const capGeometry = new THREE.SphereGeometry(0.4, 8, 6);
          const capMaterial = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
          const cap = new THREE.Mesh(capGeometry, capMaterial);
          cap.position.y = 1.2;
          cap.scale.set(1, 0.6, 1);
          group.add(cap);
          
          group.castShadow = true;
          group.receiveShadow = true;
          return group;
        } else {
          // Default nature - simple cylinder
          geometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 6);
          color = 0x4a5d23;
        }
        break;
        
      case 'interior':
        if (modelName.includes('chair')) {
          // Chair - seat + back
          const group = new THREE.Group();
          
          // Seat
          const seatGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
          const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
          const seat = new THREE.Mesh(seatGeometry, seatMaterial);
          seat.position.y = 0.4;
          group.add(seat);
          
          // Back
          const backGeometry = new THREE.BoxGeometry(0.8, 1, 0.1);
          const backMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
          const back = new THREE.Mesh(backGeometry, backMaterial);
          back.position.set(0, 1, -0.35);
          group.add(back);
          
          group.castShadow = true;
          group.receiveShadow = true;
          return group;
        } else if (modelName.includes('table')) {
          // Table - top + legs
          const group = new THREE.Group();
          
          // Top
          const topGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.5);
          const topMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
          const top = new THREE.Mesh(topGeometry, topMaterial);
          top.position.y = 0.7;
          group.add(top);
          
          // Legs
          const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6);
          const legMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
          const legPositions = [[-0.6, 0.35, -0.6], [0.6, 0.35, -0.6], [-0.6, 0.35, 0.6], [0.6, 0.35, 0.6]];
          legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            group.add(leg);
          });
          
          group.castShadow = true;
          group.receiveShadow = true;
          return group;
        } else {
          // Default furniture
          geometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
          color = 0x8b4513;
        }
        break;
        
      case 'building':
        // Building shapes
        geometry = new THREE.BoxGeometry(2, 4, 2);
        color = 0x696969;
        break;
        
      case 'weapon':
        // Weapon shapes
        if (modelName.includes('sword')) {
          // Sword - blade + handle
          const group = new THREE.Group();
          
          // Blade
          const bladeGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.05);
          const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
          const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
          blade.position.y = 0.75;
          group.add(blade);
          
          // Handle
          const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6);
          const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
          const handle = new THREE.Mesh(handleGeometry, handleMaterial);
          handle.position.y = -0.15;
          group.add(handle);
          
          group.castShadow = true;
          group.receiveShadow = true;
          return group;
        } else {
          // Gun - box
          geometry = new THREE.BoxGeometry(0.3, 1, 0.2);
          color = 0x2f2f2f;
        }
        break;
        
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        color = 0x8b4513;
    }
    
    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Predefined model configurations for Hotel Humboldt
  getNatureModels(): ModelInfo[] {
    return [
      // Árboles reales
      {
        name: 'tree_04',
        path: '/models/terrain/trees/Tree_04.glb',
        type: 'gltf',
        category: 'nature',
        scale: 1.0
      },
      {
        name: 'tree_05',
        path: '/models/terrain/trees/Tree_05.glb',
        type: 'gltf',
        category: 'nature',
        scale: 1.0
      },
      {
        name: 'tree_06',
        path: '/models/terrain/trees/Tree_06.glb',
        type: 'gltf',
        category: 'nature',
        scale: 1.0
      },
      
      // Rocas reales
      {
        name: 'rock_01',
        path: '/models/terrain/rocks/Rock_01.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'rock_04',
        path: '/models/terrain/rocks/Rock_04.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'rock_05',
        path: '/models/terrain/rocks/Rock_05.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'rock_17',
        path: '/models/terrain/rocks/Rock_17.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      
      // Environment models - Grass
      {
        name: 'grass_01',
        path: '/models/terrain/environment/Grass_01.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_02',
        path: '/models/terrain/environment/Grass_02.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_03',
        path: '/models/terrain/environment/Grass_03.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_04_1',
        path: '/models/terrain/environment/Grass_04-1.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_04_2',
        path: '/models/terrain/environment/Grass_04-2.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_05_1',
        path: '/models/terrain/environment/Grass_05-1.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_05_2',
        path: '/models/terrain/environment/Grass_05-2.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_06_1',
        path: '/models/terrain/environment/Grass_06-1.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_06_2',
        path: '/models/terrain/environment/Grass_06-2.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_07_1',
        path: '/models/terrain/environment/Grass_07-1.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_07_2',
        path: '/models/terrain/environment/Grass_07-2.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_08_1',
        path: '/models/terrain/environment/Grass_08-1.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      {
        name: 'grass_08_2',
        path: '/models/terrain/environment/Grass_08-2.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.5
      },
      
      // Environment models - Plants
      {
        name: 'plant_01',
        path: '/models/terrain/environment/Plant_01.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_02',
        path: '/models/terrain/environment/Plant_02.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_03',
        path: '/models/terrain/environment/Plant_03.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_04',
        path: '/models/terrain/environment/Plant_04.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_05',
        path: '/models/terrain/environment/Plant_05.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_06',
        path: '/models/terrain/environment/Plant_06.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_07',
        path: '/models/terrain/environment/Plant_07.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_08',
        path: '/models/terrain/environment/Plant_08.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_09',
        path: '/models/terrain/environment/Plant_09.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_10',
        path: '/models/terrain/environment/Plant_10.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_11',
        path: '/models/terrain/environment/Plant_11.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_12',
        path: '/models/terrain/environment/Plant_12.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      {
        name: 'plant_13',
        path: '/models/terrain/environment/Plant_13.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      },
      
      // Environment models - Flowers
      {
        name: 'flower_01',
        path: '/models/terrain/environment/Flower_01.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.3
      },
      {
        name: 'flower_02',
        path: '/models/terrain/environment/Flower_02.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.3
      },
      {
        name: 'flower_03',
        path: '/models/terrain/environment/Flower_03.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.3
      },
      {
        name: 'flower_04',
        path: '/models/terrain/environment/Flower_04.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.3
      },
      {
        name: 'flower_05',
        path: '/models/terrain/environment/Flower_05.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.3
      },
      {
        name: 'flower_06',
        path: '/models/terrain/environment/Flower_06.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.3
      },
      
      // Environment models - Rocks
      {
        name: 'rock_02',
        path: '/models/terrain/environment/Rock_02.glb',
        type: 'gltf',
        category: 'nature',
        scale: 0.8
      }
    ];
  }

  getInteriorModels(): ModelInfo[] {
    return [
      // For now, we'll use fallback geometries
      {
        name: 'chair_01',
        path: '',
        type: 'gltf',
        category: 'interior',
        scale: 0.8
      },
      {
        name: 'table_01',
        path: '',
        type: 'gltf',
        category: 'interior',
        scale: 0.9
      },
      {
        name: 'sofa_01',
        path: '',
        type: 'gltf',
        category: 'interior',
        scale: 1.0
      }
    ];
  }

  getBuildingModels(): ModelInfo[] {
    return [
      // For now, we'll use fallback geometries
      {
        name: 'building_01',
        path: '',
        type: 'gltf',
        category: 'building',
        scale: 2.0
      },
      {
        name: 'house_01',
        path: '',
        type: 'gltf',
        category: 'building',
        scale: 1.5
      }
    ];
  }

  getWeaponModels(): ModelInfo[] {
    return [
      // For now, we'll use fallback geometries
      {
        name: 'sword_01',
        path: '',
        type: 'gltf',
        category: 'weapon',
        scale: 0.5
      },
      {
        name: 'gun_01',
        path: '',
        type: 'gltf',
        category: 'weapon',
        scale: 0.3
      }
    ];
  }

  // Load all models by category
  async loadModelsByCategory(category: 'nature' | 'interior' | 'building' | 'weapon'): Promise<THREE.Object3D[]> {
    let models: ModelInfo[];
    
    switch (category) {
      case 'nature':
        models = this.getNatureModels();
        break;
      case 'interior':
        models = this.getInteriorModels();
        break;
      case 'building':
        models = this.getBuildingModels();
        break;
      case 'weapon':
        models = this.getWeaponModels();
        break;
      default:
        return [];
    }

    const loadedModels: THREE.Object3D[] = [];
    
    for (const modelInfo of models) {
      try {
        const model = await this.loadModel(modelInfo);
        loadedModels.push(model);
      } catch (error) {
        console.warn(`Failed to load ${modelInfo.name}:`, error);
      }
    }

    return loadedModels;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const modelLoader = new ModelLoader();
