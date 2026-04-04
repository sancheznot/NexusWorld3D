import { WebGPURenderer } from "three/webgpu";

/**
 * Factory para la prop `gl` de `<Canvas />`.
 * WebGPU si el navegador lo permite; Three.js usa backend WebGL2 si no.
 *
 * `props` está sin tipar fino para alinearlo con el `DefaultGLProps` interno de R3F
 * (evita conflictos entre distintas definiciones de `OffscreenCanvas`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- contrato definido por R3F `gl(props)`
export default async function createWebGPUGameRenderer(props: any): Promise<WebGPURenderer> {
  const powerPreference: GPUPowerPreference | undefined =
    props.powerPreference === "high-performance"
      ? "high-performance"
      : props.powerPreference === "low-power"
        ? "low-power"
        : undefined;

  const renderer = new WebGPURenderer({
    canvas: props.canvas,
    antialias: props.antialias ?? true,
    alpha: props.alpha ?? true,
    powerPreference,
  });
  await renderer.init();
  return renderer;
}
