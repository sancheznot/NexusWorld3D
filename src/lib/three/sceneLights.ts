import * as THREE from 'three';

export interface SceneLightsOptions {
  patterns?: RegExp[]; // defaults to /^LM_/i
  color?: number;
  intensity?: number;
  distance?: number;
  decay?: number;
  maxLights?: number;
  debugHelpers?: boolean;
  yOffset?: number; // small vertical offset if desired
}

const DEFAULT_PATTERNS: RegExp[] = [/^LM_/i];

export function generateSceneLights(root: THREE.Object3D, options: SceneLightsOptions = {}): number {
  const {
    patterns = DEFAULT_PATTERNS,
    color = 0xfff2cc,
    intensity = 1.0,
    distance = 12,
    decay = 2,
    maxLights = 1024,
    debugHelpers = false,
    yOffset = 0,
  } = options;

  // Remove previous auto lights to avoid duplicates on hot reload
  const toRemove: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name && o.name.startsWith('autoLight__')) toRemove.push(o);
  });
  toRemove.forEach((o) => o.parent?.remove(o));

  let created = 0;
  const matcher = (name: string) => patterns.some((re) => re.test(name));
  const wp = new THREE.Vector3();

  root.traverse((obj) => {
    if (created >= maxLights) return;
    if (!obj.name || !matcher(obj.name)) return;

    obj.updateWorldMatrix(true, false);
    obj.getWorldPosition(wp);

    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.name = `autoLight__${obj.name}`;
    light.castShadow = false;
    light.position.set(wp.x, wp.y + yOffset, wp.z);

    if (debugHelpers) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      sphere.name = `${light.name}__helper`;
      light.add(sphere);
      // Log marker info for debugging
      // eslint-disable-next-line no-console
      console.log(`💡 LM marker: ${obj.name} @ (${wp.x.toFixed(2)}, ${wp.y.toFixed(2)}, ${wp.z.toFixed(2)})`);
    }

    root.add(light);
    created += 1;
  });

  return created;
}
