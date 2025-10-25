/**
 * Constantes para el sistema de física y colliders
 */

// 🎯 Patrones de nombres para meshes que usan colliders especializados (Convex Hull)
export const NATURAL_MESH_PATTERNS = [
  'HIL', 'Hill', 'Rock', 'Cliff', 'Slope', 'Hill_',
  // Terrenos y suelos
  'Terrain', 'Ground', 'Sidewalk', 'Asphalt',
  // Vías y estructuras urbanas
  'Road', 'Road_', 'MobileRoad_', 'Street', 'Street_', 'Bridge', 'Bridge_', 'Ramp', 'Stairs',
  // Edificios y muros
  'Building', 'Building_', 'Wall', 'Wall_','Parking_',
  // Naturaleza y props grandes
  'Tree_', 'Grass_', 'Plant_', 'Rock_', 'Cliff_', 'Pond_', 'Pool_',
  // Vehículos grandes u obstáculos
  'Car_', 'Truck_', 'Vehicle_','CarRig_','CarRig_15',
  // Institucionales
  'Police_', 'Hospital_', 'CityHall_', 'FireStation_', 'Cafe_'
] as const;

// 🎯 Patrones para meshes UCX (colliders de caja, invisibles)
export const UCX_MESH_PATTERNS = [
  'UCX_', 'collision', 'Collision', 'Box_', 'Collider_'
] as const;

// 🎯 Configuración de física
export const PHYSICS_CONFIG = {
  MAX_COLLIDER_SIZE: 50, // Tamaño máximo antes de subdividir
  PLAYER_BASE_HEIGHT: 1.05,
  ACCELERATION: 30, // Aceleración lateral
  DECELERATION: 25, // Frenado lateral
  GRAVITY: -19, // Caída más rápida y pegada al suelo
  TARGET_FPS: 120, // FPS objetivo por defecto
  MAX_DELTA_TIME: 1/90, // Paso fijo un poco más grande para responder mejor
} as const;

// Función para obtener FPS dinámico desde configuraciones
export const getTargetFPS = () => {
  if (typeof window !== 'undefined') {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        return settings.targetFPS || PHYSICS_CONFIG.TARGET_FPS;
      } catch (error) {
        console.error('Error loading FPS settings:', error);
      }
    }
  }
  return PHYSICS_CONFIG.TARGET_FPS;
};

// 🎯 Tipos de colliders
export const COLLIDER_TYPES = {
  HULL: 'hull',
  TRIMESH: 'trimesh', 
  BOX: 'box',
  CYLINDER: 'cylinder',
  SPHERE: 'sphere'
} as const;
