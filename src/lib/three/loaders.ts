import * as THREE from 'three';

// Texture loader
export const textureLoader = new THREE.TextureLoader();

// GLTF loader for 3D models
export const gltfLoader = new THREE.ObjectLoader();

// Load texture with error handling
export const loadTexture = (url: string): Promise<THREE.Texture> => {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      url,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        resolve(texture);
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
        reject(error);
      }
    );
  });
};

// Load GLTF model with error handling
export const loadGLTF = (url: string): Promise<THREE.Object3D> => {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (object) => {
        resolve(object);
      },
      undefined,
      (error) => {
        console.error('Error loading GLTF:', error);
        reject(error);
      }
    );
  });
};

// Create basic materials
export const createBasicMaterial = (color: number = 0x00ff00): THREE.MeshBasicMaterial => {
  return new THREE.MeshBasicMaterial({ color });
};

export const createLambertMaterial = (color: number = 0x00ff00): THREE.MeshLambertMaterial => {
  return new THREE.MeshLambertMaterial({ color });
};

export const createPhongMaterial = (color: number = 0x00ff00): THREE.MeshPhongMaterial => {
  return new THREE.MeshPhongMaterial({ color });
};

// Create basic geometries
export const createBoxGeometry = (width: number = 1, height: number = 1, depth: number = 1): THREE.BoxGeometry => {
  return new THREE.BoxGeometry(width, height, depth);
};

export const createSphereGeometry = (radius: number = 1, segments: number = 32): THREE.SphereGeometry => {
  return new THREE.SphereGeometry(radius, segments, segments);
};

export const createCylinderGeometry = (radiusTop: number = 1, radiusBottom: number = 1, height: number = 1): THREE.CylinderGeometry => {
  return new THREE.CylinderGeometry(radiusTop, radiusBottom, height);
};

export const createPlaneGeometry = (width: number = 1, height: number = 1): THREE.PlaneGeometry => {
  return new THREE.PlaneGeometry(width, height);
};
