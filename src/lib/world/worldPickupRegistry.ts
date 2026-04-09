/**
 * ES: Registro de ítems en el mundo cercanos al jugador (para recoger con tecla).
 * EN: World pickup registrations for interact-to-collect.
 */

export type PickupRegistration = {
  spawnId: string;
  mapId: string;
  x: number;
  y: number;
  z: number;
  radius: number;
};

const pickups = new Map<string, PickupRegistration>();

export function worldPickupRegister(reg: PickupRegistration): void {
  pickups.set(reg.spawnId, { ...reg });
}

export function worldPickupUnregister(spawnId: string): void {
  pickups.delete(spawnId);
}

export function worldPickupUpdatePosition(
  spawnId: string,
  x: number,
  y: number,
  z: number
): void {
  const e = pickups.get(spawnId);
  if (e) {
    e.x = x;
    e.y = y;
    e.z = z;
  }
}

/**
 * ES: Mejor candidato dentro del radio del pickup + margen del jugador.
 */
export function worldPickupFindNearest(
  mapId: string,
  px: number,
  py: number,
  pz: number,
  playerReachMeters: number
): PickupRegistration | null {
  let best: PickupRegistration | null = null;
  let bestD = Infinity;
  for (const p of pickups.values()) {
    if (p.mapId !== mapId) continue;
    const dx = p.x - px;
    const dy = p.y - py;
    const dz = p.z - pz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const maxD = p.radius + playerReachMeters;
    if (d <= maxD && d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
