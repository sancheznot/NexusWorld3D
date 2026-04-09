/**
 * ES: Puesto de productos en parcela (Fase 8) — competencia suave con NPCs (precios jugador).
 * EN: Plot produce stall (Phase 8) — player pricing vs NPC shops.
 */

import { ITEMS_CATALOG } from "@/constants/items";
import type {
  HousingPlayerStall,
  StallListing,
} from "@/types/housing.types";

/** ES: Impuesto suave sobre venta (retenido del bruto). EN: Soft tax on gross sale. */
export const PRODUCE_STALL_TAX_RATE = 0.08;

export const PRODUCE_STALL_MAX_LISTINGS = 6;

export const PRODUCE_STALL_MIN_PRICE_MAJOR = 1;

export const PRODUCE_STALL_MAX_PRICE_MAJOR = 499;

export const PRODUCE_STALL_MAX_QTY_PER_STACK = 99;

/** ES: Monedas / ítems no vendibles en puesto. EN: Blocked stall items. */
const STALL_ITEM_BLOCKLIST = new Set<string>(["coin_gold"]);

export function isProduceStallItemId(itemId: string): boolean {
  if (STALL_ITEM_BLOCKLIST.has(itemId)) return false;
  const cat = ITEMS_CATALOG[itemId as keyof typeof ITEMS_CATALOG];
  return cat?.type === "consumable";
}

export function normalizePlayerStall(raw: unknown): HousingPlayerStall {
  const empty: HousingPlayerStall = {
    listings: [],
    pendingCreditsMajor: 0,
  };
  if (raw == null || typeof raw !== "object") return empty;
  const o = raw as Partial<HousingPlayerStall>;
  const pendingRaw = o.pendingCreditsMajor;
  const pending =
    typeof pendingRaw === "number" && Number.isFinite(pendingRaw)
      ? Math.max(0, Math.floor(pendingRaw))
      : 0;
  const rows = Array.isArray(o.listings) ? o.listings : [];
  const listings: StallListing[] = [];
  const seenId = new Set<string>();
  for (const row of rows) {
    if (typeof row !== "object" || row == null) continue;
    const r = row as Partial<StallListing>;
    if (typeof r.id !== "string" || r.id.length < 2) continue;
    if (typeof r.itemId !== "string" || !isProduceStallItemId(r.itemId))
      continue;
    if (!ITEMS_CATALOG[r.itemId as keyof typeof ITEMS_CATALOG]) continue;
    const qty = Math.floor(Number(r.quantity));
    const price = Math.floor(Number(r.priceMajor));
    if (!Number.isFinite(qty) || qty < 1 || qty > PRODUCE_STALL_MAX_QTY_PER_STACK)
      continue;
    if (
      !Number.isFinite(price) ||
      price < PRODUCE_STALL_MIN_PRICE_MAJOR ||
      price > PRODUCE_STALL_MAX_PRICE_MAJOR
    )
      continue;
    if (seenId.has(r.id)) continue;
    seenId.add(r.id);
    listings.push({
      id: r.id,
      itemId: r.itemId,
      quantity: qty,
      priceMajor: price,
    });
    if (listings.length >= PRODUCE_STALL_MAX_LISTINGS) break;
  }
  return { listings, pendingCreditsMajor: pending };
}

/** ES: Trigger cliente [E] — mismo mapa que el lote. EN: Client trigger zone. */
export const PRODUCE_STALL_KIOSK = {
  plotId: "exterior_lot_a1",
  mapId: "exterior",
  position: { x: 49.2, y: 0.55, z: -8.8 },
  radius: 2.6,
} as const;

const KIOSK_DIST_SLACK = 0.9;

export function isNearProduceStallKiosk(
  mapId: string,
  pos: { x: number; z: number }
): boolean {
  if (mapId !== PRODUCE_STALL_KIOSK.mapId) return false;
  const d = Math.hypot(
    pos.x - PRODUCE_STALL_KIOSK.position.x,
    pos.z - PRODUCE_STALL_KIOSK.position.z
  );
  return d <= PRODUCE_STALL_KIOSK.radius + KIOSK_DIST_SLACK;
}
