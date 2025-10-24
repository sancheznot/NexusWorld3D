/**
 * Constantes del sistema de inventario
 * Configuración centralizada para slots, peso, oro y más
 */

// ===== CONFIGURACIÓN DE SLOTS =====
export const INVENTORY_SLOTS = {
  // Slots base (nivel 1)
  BASE_SLOTS: 20,
  
  // Slots por nivel
  SLOTS_PER_LEVEL: 2,
  
  // Slots máximos posibles
  ABSOLUTE_MAX_SLOTS: 50,
} as const;

// ===== CONFIGURACIÓN DE PESO =====
export const INVENTORY_WEIGHT = {
  // Peso base (nivel 1)
  MIN_WEIGHT: 50,
  MAX_WEIGHT: 100,
  
  // Peso por nivel
  WEIGHT_PER_LEVEL: 25,
  
  // Peso máximo absoluto
  ABSOLUTE_MAX_WEIGHT: 500,
} as const;

// ===== CONFIGURACIÓN DE ORO =====
export const INVENTORY_GOLD = {
  // Oro inicial
  STARTING_GOLD: 500,
  
  // Oro máximo por nivel
  MAX_GOLD_PER_LEVEL: 1000,
  
  // Oro máximo absoluto
  ABSOLUTE_MAX_GOLD: 999999,
} as const;

// ===== CONFIGURACIÓN DE ITEMS =====
export const INVENTORY_ITEMS = {
  // Cantidad máxima de items del mismo tipo
  MAX_STACK_SIZE: 99,
  
  // Durabilidad base de items
  BASE_DURABILITY: 100,
  
  // Durabilidad máxima
  MAX_DURABILITY: 1000,
} as const;

// ===== CONFIGURACIÓN DE RAREZAS =====
export const ITEM_RARITY_WEIGHTS = {
  common: 0.5,      // 50% de peso
  uncommon: 0.3,    // 30% de peso
  rare: 0.15,       // 15% de peso
  epic: 0.04,       // 4% de peso
  legendary: 0.008,  // 0.8% de peso
  mythic: 0.002,    // 0.2% de peso
} as const;

// ===== CONFIGURACIÓN DE EQUIPAMIENTO =====
export const EQUIPMENT_SLOTS = {
  // Slots de equipamiento disponibles
  WEAPON: 'weapon',
  HELMET: 'helmet',
  CHEST: 'chest',
  LEGS: 'legs',
  BOOTS: 'boots',
  GLOVES: 'gloves',
  RING: 'ring',
  NECKLACE: 'necklace',
} as const;

// ===== CONFIGURACIÓN DE ESTADÍSTICAS =====
export const STAT_BONUSES = {
  // Bonificaciones por nivel
  DAMAGE_PER_LEVEL: 5,
  DEFENSE_PER_LEVEL: 3,
  HEALTH_PER_LEVEL: 10,
  MANA_PER_LEVEL: 8,
  SPEED_PER_LEVEL: 1,
} as const;

// ===== CONFIGURACIÓN DE PRECIOS =====
export const SHOP_PRICES = {
  // Multiplicadores de precio por rareza
  COMMON_MULTIPLIER: 1,
  UNCOMMON_MULTIPLIER: 2,
  RARE_MULTIPLIER: 5,
  EPIC_MULTIPLIER: 10,
  LEGENDARY_MULTIPLIER: 25,
  MYTHIC_MULTIPLIER: 50,
} as const;

// ===== CONFIGURACIÓN DE ANIMACIONES =====
export const INVENTORY_ANIMATIONS = {
  // Duración de animaciones (ms)
  ITEM_PICKUP_DURATION: 300,
  ITEM_DROP_DURATION: 200,
  INVENTORY_OPEN_DURATION: 150,
  INVENTORY_CLOSE_DURATION: 100,
} as const;

// ===== CONFIGURACIÓN DE SONIDOS =====
export const INVENTORY_SOUNDS = {
  // Sonidos del inventario
  ITEM_PICKUP: 'item_pickup.wav',
  ITEM_DROP: 'item_drop.wav',
  INVENTORY_OPEN: 'inventory_open.wav',
  INVENTORY_CLOSE: 'inventory_close.wav',
  ITEM_EQUIP: 'item_equip.wav',
  ITEM_UNEQUIP: 'item_unequip.wav',
} as const;

// ===== CONFIGURACIÓN DE UI =====
export const INVENTORY_UI = {
  // Configuración de la interfaz
  GRID_COLUMNS: 5,
  GRID_ROWS: 4,
  ITEM_SIZE: 64,
  ITEM_SPACING: 8,
  ANIMATION_DURATION: 200,
} as const;

// ===== CONFIGURACIÓN DE VALIDACIÓN =====
export const INVENTORY_VALIDATION = {
  // Reglas de validación
  MIN_ITEM_NAME_LENGTH: 1,
  MAX_ITEM_NAME_LENGTH: 50,
  MIN_ITEM_DESCRIPTION_LENGTH: 0,
  MAX_ITEM_DESCRIPTION_LENGTH: 200,
  MAX_STATS_PER_ITEM: 10,
} as const;

// ===== CONFIGURACIÓN DE BACKUP =====
export const INVENTORY_BACKUP = {
  // Configuración de respaldo
  AUTO_SAVE_INTERVAL: 30000, // 30 segundos
  MAX_BACKUP_FILES: 5,
  BACKUP_PREFIX: 'inventory_backup_',
} as const;

// ===== CONFIGURACIÓN DE DEBUG =====
export const INVENTORY_DEBUG = {
  // Configuración de debug
  ENABLE_LOGS: process.env.NODE_ENV === 'development',
  LOG_LEVEL: 'info', // 'debug', 'info', 'warn', 'error'
  ENABLE_PERFORMANCE_MONITORING: true,
} as const;

// ===== CONFIGURACIÓN PRINCIPAL DEL INVENTARIO =====
export const INVENTORY_CONFIG = {
  slots: INVENTORY_SLOTS,
  weight: INVENTORY_WEIGHT,
  gold: INVENTORY_GOLD,
  items: INVENTORY_ITEMS,
  rarity: ITEM_RARITY_WEIGHTS,
  equipment: EQUIPMENT_SLOTS,
  stats: STAT_BONUSES,
  prices: SHOP_PRICES,
  animations: INVENTORY_ANIMATIONS,
  sounds: INVENTORY_SOUNDS,
  ui: INVENTORY_UI,
  validation: INVENTORY_VALIDATION,
  backup: INVENTORY_BACKUP,
  debug: INVENTORY_DEBUG,
} as const;
