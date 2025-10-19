export const THREE_CONFIG = {
  // Camera settings
  camera: {
    fov: 75,
    near: 0.1,
    far: 100,
    position: { x: 0, y: 10, z: 15 },
  },
  
  // Lighting settings
  lighting: {
    ambient: {
      color: 0xffffff,
      intensity: 0.8,
    },
    directional: {
      color: 0xffffff,
      intensity: 2.5,
      position: { x: 20, y: 30, z: 10 },
      castShadow: true,
    },
  },
  
  // Player settings
  player: {
    size: 1,
    height: 2,
    speed: {
      walk: 5,
      run: 8,
    },
    jumpHeight: 3,
  },
  
  // World settings
  world: {
    size: 100, // Reducido para mejor rendimiento
    height: 0.1,
    gridSize: 10,
  },
  
  // Rendering settings
  rendering: {
    antialias: true,
    shadowMap: {
      enabled: true,
      type: 'PCFSoftShadowMap',
    },
    toneMapping: 'ACESFilmicToneMapping',
    toneMappingExposure: 1,
  },
  
  // Controls settings
  controls: {
    enableDamping: true,
    dampingFactor: 0.05,
    maxPolarAngle: Math.PI / 2,
    minDistance: 3,
    maxDistance: 20,
  },
} as const;
