/**
 * ES: Costes de mejora Fase 2 (cabaña madera → refuerzo piedra).
 * EN: Phase 2 upgrade costs (wood cabin → stone reinforcement).
 */

export type HousingUpgradeMode = "materials" | "cash";

/** ES: Solo `cabin_t1` tiene tiers 1–2 en Fase 2. EN: Only cabin_t1 has tiers 1–2. */
export const CABIN_T1_MAX_TIER = 2;

export type CabinTierDef = {
  /** ES: Tier destino tras aplicar esta mejora. EN: Target tier after upgrade. */
  nextTier: number;
  materials: { itemId: string; quantity: number }[];
  /** ES: Atajo: pago único en lugar de materiales. EN: Wallet shortcut instead of mats. */
  cashShortcutMajor: number;
};

/** ES: Mejora de tier 1 → 2 (refuerzo piedra). EN: Tier 1 → 2 stone reinforcement. */
export const CABIN_T1_UPGRADE_T1_TO_T2: CabinTierDef = {
  nextTier: 2,
  materials: [
    { itemId: "material_stone_raw", quantity: 12 },
    { itemId: "material_wood_plank", quantity: 8 },
  ],
  cashShortcutMajor: 320,
};

export function getCabinUpgradeDef(
  kind: string,
  currentTier: number
): CabinTierDef | null {
  if (kind !== "cabin_t1") return null;
  if (currentTier >= CABIN_T1_MAX_TIER) return null;
  if (currentTier === 1) return CABIN_T1_UPGRADE_T1_TO_T2;
  return null;
}
