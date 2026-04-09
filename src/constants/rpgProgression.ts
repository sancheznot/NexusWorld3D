/**
 * ES: Nivel, EXP, stats asignables y modificadores (cliente + servidor).
 * EN: Level, XP, allocatable stats and modifiers (client + server).
 */

import { INVENTORY_SLOTS, INVENTORY_WEIGHT } from '@/constants/inventory';

export const RPG_STAT_IDS = [
  'strength',
  'agility',
  'vitality',
  'endurance',
  'luck',
] as const;

export type RpgStatId = (typeof RPG_STAT_IDS)[number];

export type RpgAlloc = Record<RpgStatId, number>;

export const RPG_DEFAULT_ALLOC: RpgAlloc = {
  strength: 0,
  agility: 0,
  vitality: 0,
  endurance: 0,
  luck: 0,
};

/** ES: Puntos de stat por subir de nivel. EN: Stat points per level-up. */
export const RPG_STAT_POINTS_PER_LEVEL = 3;

/**
 * ES: Puntos libres al crear el PJ (estilo ARK / MU) si aún no hay bloque `rpg` guardado.
 * EN: Free stat points on first-time character (no saved `rpg` block yet).
 */
export const RPG_INITIAL_UNSPENT_POINTS = 10;

/** ES: EXP fija por golpe de tala exitoso. EN: XP per successful tree chop hit. */
export const RPG_XP_CHOP_HIT = 12;

/** ES: EXP base al recoger un ítem del mundo. EN: Base XP for world item pickup. */
export const RPG_XP_ITEM_PICKUP = 18;

/** ES: Tope por stat (puntos invertidos). EN: Cap per stat (allocated points). */
export const RPG_MAX_POINTS_PER_STAT = 80;

/** ES: Curva: EXP necesaria para pasar de nivel L a L+1. EN: XP to level up from L. */
export function xpRequiredForLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  return Math.floor(120 + (L - 1) * 45 + (L - 1) * (L - 1) * 8);
}

export function clampAlloc(a: Partial<RpgAlloc> | undefined): RpgAlloc {
  const out = { ...RPG_DEFAULT_ALLOC };
  if (!a) return out;
  for (const k of RPG_STAT_IDS) {
    const v = a[k];
    out[k] =
      typeof v === 'number' && Number.isFinite(v)
        ? Math.max(0, Math.min(RPG_MAX_POINTS_PER_STAT, Math.floor(v)))
        : 0;
  }
  return out;
}

/** ES: +kg de carga por punto de resistencia. EN: +kg carry per endurance point. */
export const RPG_ENDURANCE_KG_PER_POINT = 3;

/** ES: +slots por cada N puntos de fuerza (floor). EN: +slots per N strength. */
export const RPG_STRENGTH_SLOTS_DIVISOR = 4;

/** ES: Velocidad base + por agilidad. EN: Move speed multiplier from agility. */
export function moveSpeedMultiplierFromAgility(agility: number): number {
  const a = Math.max(0, agility);
  return 1 + a * 0.012;
}

/** ES: >1 = hambre baja más lento (intervalo más largo). EN: >1 = slower hunger drain. */
export function hungerDrainIntervalMultiplierFromEndurance(endurance: number): number {
  const e = Math.max(0, endurance);
  return 1 + e * 0.04;
}

/** ES: HP máximo extra por vitalidad. EN: Bonus max HP from vitality. */
export function maxHealthBonusFromVitality(vitality: number): number {
  const v = Math.max(0, vitality);
  return Math.floor(v * 4);
}

/** ES: Multiplicador de EXP ganada (luck). EN: XP gain multiplier from luck. */
export function xpGainMultiplierFromLuck(luck: number): number {
  const L = Math.max(0, luck);
  return 1 + Math.min(0.35, L * 0.006);
}

/** ES: Daño extra por fuerza (placeholder para melee). EN: Flat damage from strength. */
export function damageBonusFromStrength(strength: number): number {
  const s = Math.max(0, strength);
  return Math.floor(s * 0.5);
}

export function computeMaxSlots(level: number, alloc: RpgAlloc): number {
  const baseSlots = INVENTORY_SLOTS.BASE_SLOTS;
  const levelBonus = (Math.max(1, level) - 1) * INVENTORY_SLOTS.SLOTS_PER_LEVEL;
  const strSlots = Math.floor(alloc.strength / RPG_STRENGTH_SLOTS_DIVISOR);
  const total = baseSlots + levelBonus + strSlots;
  return Math.min(total, INVENTORY_SLOTS.ABSOLUTE_MAX_SLOTS);
}

export function computeMaxWeight(level: number, alloc: RpgAlloc): number {
  const baseWeight = INVENTORY_WEIGHT.MIN_WEIGHT;
  const levelBonus = (Math.max(1, level) - 1) * INVENTORY_WEIGHT.WEIGHT_PER_LEVEL;
  const endBonus = alloc.endurance * RPG_ENDURANCE_KG_PER_POINT;
  const total = baseWeight + levelBonus + endBonus;
  return Math.min(total, INVENTORY_WEIGHT.ABSOLUTE_MAX_WEIGHT);
}

export type RpgSyncPayload = {
  level: number;
  experience: number;
  xpToNext: number;
  unspentStatPoints: number;
  alloc: RpgAlloc;
  maxWeight: number;
  maxSlots: number;
  moveSpeedMul: number;
  hungerDrainMul: number;
  maxHealthBonus: number;
  damageBonus: number;
  xpGainMul: number;
};

export function buildRpgSyncPayload(
  level: number,
  experience: number,
  unspent: number,
  alloc: RpgAlloc
): RpgSyncPayload {
  const xpToNext = xpRequiredForLevel(level);
  const a = clampAlloc(alloc);
  return {
    level,
    experience,
    xpToNext,
    unspentStatPoints: Math.max(0, unspent),
    alloc: a,
    maxWeight: computeMaxWeight(level, a),
    maxSlots: computeMaxSlots(level, a),
    moveSpeedMul: moveSpeedMultiplierFromAgility(a.agility),
    hungerDrainMul: hungerDrainIntervalMultiplierFromEndurance(a.endurance),
    maxHealthBonus: maxHealthBonusFromVitality(a.vitality),
    damageBonus: damageBonusFromStrength(a.strength),
    xpGainMul: xpGainMultiplierFromLuck(a.luck),
  };
}

export const RPG_STAT_META: Record<
  RpgStatId,
  { nameEs: string; nameEn: string; descEs: string; descEn: string }
> = {
  strength: {
    nameEs: 'Fuerza',
    nameEn: 'Strength',
    descEs: 'Más daño cuerpo a cuerpo y +1 slot cada 4 pts.',
    descEn: 'More melee damage; +1 inventory slot per 4 pts.',
  },
  agility: {
    nameEs: 'Agilidad',
    nameEn: 'Agility',
    descEs: 'Corres y caminas un poco más rápido.',
    descEn: 'Slightly faster move speed.',
  },
  vitality: {
    nameEs: 'Vitalidad',
    nameEn: 'Vitality',
    descEs: 'Más vida máxima (+4 HP por punto).',
    descEn: 'Higher max health (+4 HP per point).',
  },
  endurance: {
    nameEs: 'Resistencia',
    nameEn: 'Endurance',
    descEs: 'Más peso de carga y hambre más lenta.',
    descEn: 'More carry weight; slower hunger drain.',
  },
  luck: {
    nameEs: 'Suerte',
    nameEn: 'Luck',
    descEs: 'Ganas algo más de EXP.',
    descEn: 'Slightly more XP gains.',
  },
};
