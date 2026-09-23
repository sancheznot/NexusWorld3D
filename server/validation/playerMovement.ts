type Vector3 = { x: number; y: number; z: number };
export type PlayerMovement = {
  position: Vector3;
  rotation: Vector3;
  isMoving: boolean;
  isRunning: boolean;
};

function vector(value: unknown): Vector3 | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (![v.x, v.y, v.z].every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1_000_000)) return null;
  return { x: v.x as number, y: v.y as number, z: v.z as number };
}

/** Structural validation only; this does not establish collision/speed authority. */
export function parsePlayerMovement(value: unknown): PlayerMovement | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const position = vector(input.position);
  const rotation = vector(input.rotation);
  if (!position || !rotation) return null;
  for (const flag of [input.isMoving, input.isRunning]) {
    if (flag !== undefined && typeof flag !== 'boolean') return null;
  }
  return { position, rotation, isMoving: input.isMoving === true, isRunning: input.isRunning === true };
}
