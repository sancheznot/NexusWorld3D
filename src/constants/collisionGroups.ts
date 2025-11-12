/**
 * Sistema de CollisionGroups (Sketchbook Integration)
 * 
 * Este sistema permite controlar qué objetos colisionan con qué otros objetos
 * usando máscaras de bits (bitwise operations).
 * 
 * Basado en: Sketchbook by swift502
 * Referencia: docs/Sketchbook/enum/CollisionGroups.md
 */

/**
 * Grupos de colisión
 * 
 * Cada grupo es una potencia de 2 para poder usar operaciones de bits:
 * - 1 = 0001 (bit 0)
 * - 2 = 0010 (bit 1)
 * - 4 = 0100 (bit 2)
 * - 8 = 1000 (bit 3)
 */
export enum CollisionGroups {
  Default = 1,           // Terreno, objetos estáticos, árboles, edificios
  Characters = 2,        // Personajes (jugadores, NPCs)
  TrimeshColliders = 4,  // Objetos que NO deben colisionar con vehículos (ruedas internas, efectos)
  Vehicles = 8,          // Cuerpos de vehículos
}

/**
 * Máscaras de colisión predefinidas
 * 
 * Estas máscaras determinan CON QUÉ puede colisionar cada tipo de objeto.
 * 
 * Ejemplos:
 * - Default: -1 (colisiona con TODO)
 * - ~TrimeshColliders: colisiona con TODO EXCEPTO TrimeshColliders
 * - Default | Characters: colisiona SOLO con Default y Characters
 */
export const CollisionMasks = {
  /**
   * Terreno y objetos estáticos
   * Colisionan con: TODO
   */
  Default: -1,
  
  /**
   * Personajes (jugadores, NPCs)
   * Colisionan con: Default (terreno) y Vehicles (cuerpos de vehículos)
   * NO colisionan con: TrimeshColliders (ruedas), Characters (otros personajes)
   */
  Character: CollisionGroups.Default | CollisionGroups.Vehicles,
  
  /**
   * Cuerpo de vehículo
   * Colisionan con: TODO EXCEPTO TrimeshColliders
   * Esto permite colisionar con terreno, personajes, árboles, edificios, etc.
   * Sketchbook usa ~TrimeshColliders para evitar colisiones con objetos internos
   */
  VehicleBody: ~CollisionGroups.TrimeshColliders,
  
  /**
   * Ruedas de vehículo
   * Colisionan con: SOLO Default (terreno)
   * NO colisionan con: Cuerpo del vehículo, personajes, otras ruedas
   */
  VehicleWheel: CollisionGroups.Default,
  
  /**
   * Raycast de personaje (detectar suelo)
   * Detecta: SOLO Default (terreno)
   * NO detecta: Characters, TrimeshColliders, Vehicles
   */
  GroundRaycast: CollisionGroups.Default,
};

/**
 * Descripción de cada grupo para debugging
 */
export const CollisionGroupNames = {
  [CollisionGroups.Default]: 'Default (Terreno)',
  [CollisionGroups.Characters]: 'Characters (Personajes)',
  [CollisionGroups.TrimeshColliders]: 'TrimeshColliders (Ruedas)',
  [CollisionGroups.Vehicles]: 'Vehicles (Vehículos)',
};

/**
 * Utilidad para debug: verificar si dos objetos deberían colisionar
 */
export function shouldCollide(
  groupA: CollisionGroups,
  maskA: number,
  groupB: CollisionGroups,
  maskB: number
): boolean {
  // Fórmula de Cannon.js para determinar colisión
  return ((groupA & maskB) !== 0 && (groupB & maskA) !== 0);
}

/**
 * Utilidad para debug: mostrar información de colisión
 */
export function debugCollisionInfo(group: CollisionGroups, mask: number): string {
  const groupName = CollisionGroupNames[group] || `Unknown (${group})`;
  const canCollideWith: string[] = [];
  
  Object.entries(CollisionGroups).forEach(([name, value]) => {
    if (typeof value === 'number' && (mask & value) !== 0) {
      canCollideWith.push(name);
    }
  });
  
  return `${groupName} | Colisiona con: ${canCollideWith.join(', ')}`;
}

