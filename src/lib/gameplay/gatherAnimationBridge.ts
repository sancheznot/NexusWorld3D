/** ES: Animación temporal al talar/minar (click). EN: Short gather swing animation lock. */
export type GatherAnimKind = 'chop' | 'mine';

let untilMs = 0;
let kind: GatherAnimKind | null = null;

export function triggerGatherSwing(
  anim: GatherAnimKind,
  durationMs = 900
): void {
  kind = anim;
  untilMs = performance.now() + durationMs;
}

export function getActiveGatherAnimation(): GatherAnimKind | null {
  if (performance.now() >= untilMs) {
    kind = null;
    return null;
  }
  return kind;
}
