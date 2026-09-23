import { getMap } from '@/lib/game/mapRegistry';

type Pose = { x: number; y: number; z: number };
const finite = (p: Pose) => [p.x, p.y, p.z].every(Number.isFinite);

/** Token budgets, not per-message tolerances: flooding cannot increase travel. */
export class MovementBudget {
  private horizontal = 3;
  private vertical = 4;
  private last: number;
  constructor(now: number) { this.last = now; }

  accept(from: Pose, to: Pose, now: number): boolean {
    if (!finite(from) || !finite(to) || !Number.isFinite(now)) return false;
    const dt = Math.max(0, Math.min(0.5, (now - this.last) / 1000));
    this.last = Math.max(this.last, now);
    // Envelope includes vehicles, sprint, knockback and falling. Collision and
    // per-vehicle authority need server simulation; client speed flags aren't trusted.
    this.horizontal = Math.min(28, this.horizontal + 50 * dt);
    this.vertical = Math.min(54, this.vertical + 100 * dt);
    const h = Math.hypot(to.x - from.x, to.z - from.z);
    const v = Math.abs(to.y - from.y);
    if (h > this.horizontal || v > this.vertical) return false;
    this.horizontal -= h;
    this.vertical -= v;
    return true;
  }
}

/** Destination pose is taken exclusively from the registered active portal. */
export function resolvePortalTransition(mapId: string, position: Pose, raw: unknown) {
  if (!raw || typeof raw !== 'object' || !finite(position)) return null;
  const input = raw as Record<string, unknown>;
  if (input.fromMapId !== mapId || input.reason !== 'portal' || typeof input.portalId !== 'string') return null;
  const portal = getMap(mapId)?.portals.find(p => p.id === input.portalId && p.isActive);
  if (!portal || portal.targetMap !== input.toMapId || !getMap(portal.targetMap)) return null;
  const distance = Math.hypot(position.x - portal.position.x, position.y - portal.position.y, position.z - portal.position.z);
  if (distance > portal.radius + 1.5) return null;
  return { mapId: portal.targetMap, position: { ...portal.targetPosition }, rotation: { ...portal.targetRotation } };
}
