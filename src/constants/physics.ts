/**
 * Constantes para el sistema de física y colliders
 */

// 🎯 Patrones de nombres para meshes que usan colliders especializados (Convex Hull)
export const NATURAL_MESH_PATTERNS = [
  'HIL', 'Hill', 'Rock', 'Cliff', 'Slope', 'Road_', 'Hill_',
  'MobileRoad_', 'Street_', 'Bridge_', 'Building_', 'Wall_',
  'Tree_', 'Grass_', 'Plant_', 'Car_', 'Truck_', 'Vehicle_','Pond_','Pool_', 'Police_', 'Hospital_',
  'CityHall_', 'FireStation_', 'Cafe_'
] as const;

// 🎯 Patrones para meshes UCX (colliders de caja, invisibles)
export const UCX_MESH_PATTERNS = [
  'UCX_', 'collision', 'Collision', 'Box_', 'Collider_'
] as const;

// 🎯 Configuración de física
export const PHYSICS_CONFIG = {
  MAX_COLLIDER_SIZE: 50, // Tamaño máximo antes de subdividir
  PLAYER_BASE_HEIGHT: 1.05,
  ACCELERATION: 20,
  DECELERATION: 15,
  GRAVITY: -9.82
} as const;

// 🎯 Tipos de colliders
export const COLLIDER_TYPES = {
  HULL: 'hull',
  TRIMESH: 'trimesh', 
  BOX: 'box',
  CYLINDER: 'cylinder',
  SPHERE: 'sphere'
} as const;
