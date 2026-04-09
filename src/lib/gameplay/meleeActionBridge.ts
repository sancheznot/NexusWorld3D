/**
 * ES: Puente entre click fuera del Canvas (useKeyboard) y lógica 3D (raycast dentro del Canvas).
 * EN: Bridge from window mousedown to in-Canvas melee / chop raycast.
 */

type MeleeHandler = (event: MouseEvent) => void;

let handler: MeleeHandler | null = null;

export function registerMeleeClickHandler(fn: MeleeHandler | null): void {
  handler = fn;
}

/** Devuelve true si hubo handler registrado (el caller puede preventDefault). */
export function triggerMeleeClick(event: MouseEvent): boolean {
  if (!handler) return false;
  handler(event);
  return true;
}
