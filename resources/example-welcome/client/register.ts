/**
 * ES: Recurso de ejemplo — se ejecuta al cargar el cliente del juego.
 * EN: Sample resource — runs when the game client loads.
 */

let didRun = false;

export function registerExampleWelcomeClient(): void {
  if (didRun) return;
  didRun = true;
  if (typeof console !== "undefined") {
    console.log(
      '[NexusWorld3D] Resource "example-welcome" loaded (client)'
    );
  }
}
