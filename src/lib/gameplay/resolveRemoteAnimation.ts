/** ES: Animación remota derivada de flags de movimiento, no del string persistido. EN: Remote anim from movement flags. */

export function resolveRemoteAnimation(params: {
  animation?: string;
  isMoving?: boolean;
  isRunning?: boolean;
  lastUpdate?: number;
  now?: number;
  staleMs?: number;
}): string {
  const {
    isMoving,
    isRunning,
    lastUpdate,
    now = Date.now(),
    staleMs = 400,
  } = params;

  if (typeof lastUpdate === "number" && now - lastUpdate > staleMs) {
    return "idle";
  }
  if (!isMoving) {
    return "idle";
  }
  if (isRunning) {
    return "running";
  }
  return "walking";
}

export function deriveMovementAnimation(params: {
  isMoving: boolean;
  isRunning: boolean;
  isJumping?: boolean;
}): string {
  if (params.isJumping) return "jump";
  if (params.isRunning && params.isMoving) return "running";
  if (params.isMoving) return "walking";
  return "idle";
}
