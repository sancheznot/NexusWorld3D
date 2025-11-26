export const GAME_CONFIG = {
  currency: {
    code: "HBC", // Humboldt Coin
    symbol: "₿",
    startingBalance: 1000,
    maxTransfer: 100000,
    minAmount: 1,
    // Daily limits (major units)
    maxDailyDeposit: 50000,
    maxDailyWithdraw: 50000,
    maxDailyTransfer: 100000,
    // Fees (rates as decimals)
    fees: {
      depositRate: 0.0, // 0% por defecto
      withdrawRate: 0.01, // 1%
      transferRate: 0.005, // 0.5%
      purchaseRate: 0.02, // 2% impuesto de compra
      jobRate: 0.0, // 0% por defecto para pagos de trabajo
      minFeeMajor: 0.0, // mínimo absoluto en unidades mayores
    },
    treasuryAccountId: "treasury",
  },
  triggers: {
    defaultRadius: 3,
    interactKey: "e",
    cooldownMs: 300,
  },
  gameplay: {
    stamina: {
      runDrainPerSecond: 4, // ~25s de 100→0 si mantienes correr
      regenPerSecond: 5, // 0→100 en ~20s
      regenDelayMs: 500, // medio segundo antes de empezar a regenerar
    },
    hunger: {
      drainPerMinute: 2, // 2 pts por minuto
      starvationDamagePerSecond: 1,
    },
    health: {
      fallDamage: {
        minImpactSpeed: 6, // velocidad Y hacia abajo para empezar a dañar
        damagePerUnitSpeed: 5,
      },
    },
  },
  camera: {
    distance: 3,
    height: 2.5,
    smoothness: 0.15,
    collisionOffset: 0.2,
    collisionEnableDelayMs: 2000,
    enableCollision: true,
    minClearance: 1.2,
    requireStablePose: false,
    throttleMs: 80,
  },
  physics: {
    performance: {
      cullingActivationDistance: 80, // Metros (Aumentado para evitar que el coche entre en el vacío)
      cullingDeactivationDistance: 100, // Hysteresis para evitar parpadeo
      optimizationInterval: 1000, // ms
    },
    // Configuración general de física
    maxColliderSize: 50, // Tamaño máximo antes de subdividir
    playerBaseHeight: 1.05,
    acceleration: 60, // Aceleración aumentada para respuesta rápida
    airControl: 5, // Fuerza de control en el aire
    deceleration: 50, // Frenado lateral
    gravity: -30, // Gravedad aumentada
    targetFPS: 120, // FPS objetivo por defecto
    maxDeltaTime: 1 / 90, // Paso fijo
    // Patrones de nombres para meshes
    patterns: {
      naturalMesh: [
        "HIL",
        "Hill",
        "Rock",
        "Cliff",
        "Slope",
        "Hill_",
        "Terrain",
        "Ground",
        "Sidewalk",
        "Asphalt",
        "Road",
        "Road_",
        "MobileRoad_",
        "Street",
        "Street_",
        "Bridge",
        "Bridge_",
        "Ramp",
        "Stairs",
        "Building",
        "Building_",
        "Wall",
        "Wall_",
        "Parking_",
        "Tree_",
        "Grass_",
        "Plant_",
        "Rock_",
        "Cliff_",
        "Pond_",
        "Pool_",
        "Car_",
        "Truck_",
        "Vehicle_",
        "CarRig_",
        "CarRig_15",
        "Police_",
        "Hospital_",
        "CityHall_",
        "FireStation_",
        "Cafe_",
      ],
      ucxMesh: ["UCX_", "collision", "Collision", "Box_", "Collider_"],
    },
  },
  player: {
    spawnPosition: {
      x: 46,
      y: 1.05,
      z: -25,
    },
    // Sistema de inclinación del personaje (Sketchbook)
    tilt: {
      multiplier: 0.6, // Multiplicador de inclinación base (se escala con velocidad)
      verticalOffset: 0, // Offset vertical base - 0 para mantener altura normal
      verticalCompensation: 0.1, // Compensación vertical para evitar flotación - Reducido
    },
    // Sistema de física de caída (Sketchbook)
    fall: {
      // Umbrales de velocidad Y (valores negativos)
      softLandingThreshold: -2, // Menor que esto = caída media
      hardLandingThreshold: -6, // Menor que esto = caída fuerte (roll)

      // Daño por caída (ya existe en gameplay.health.fallDamage, pero aquí para referencia)
      rollDamageReduction: 0.5, // 50% menos daño cuando haces roll

      // Duración de animaciones de aterrizaje (ms)
      dropRunningDuration: 800, // Duración de animación drop_running
      dropRollingDuration: 1200, // Duración de animación drop_rolling (roll)

      // Control en el aire
      airControl: 0.05, // Control muy reducido mientras cae
    },
    // Sistema de estados (Sketchbook) - EXPERIMENTAL
    stateMachine: {
      enabled: true, // ✅ ACTIVADO - State Machine arreglado (respeta duraciones)
      debugLogs: true, // Mostrar logs de transiciones de estado
    },
  },
  vehicle: {
    // Física del vehículo
    physics: {
      engineForce: 10000, // Fuerza del motor (mayor = más potencia)
      brakeForce: 260, // Fuerza de frenado
      maxSteer: 0.95, // Ángulo máximo de dirección - Aumentado ~58% (0.6 → 0.95 rad / ~54°)
    },
    // Sistema de transmisión
    transmission: {
      maxGears: 5,
      timeToShift: 0.2, // Tiempo de transición entre marchas (segundos)
      gearsMaxSpeeds: {
        "-1": -4, // Reversa: -14 km/h
        "0": 0, // Neutro
        "1": 8, // Primera: ~29 km/h
        "2": 14, // Segunda: ~50 km/h
        "3": 20, // Tercera: ~72 km/h
        "4": 26, // Cuarta: ~94 km/h
        "5": 33, // Quinta: ~119 km/h
      },
    },
    // SpringSimulator para dirección suave
    steering: {
      frequency: 60, // Qué tan rápido responde (Hz)
      damping: 10, // Qué tan suave es (mayor = menos oscilación)
      mass: 0.6, // Cuánta inercia tiene (mayor = más lento)
    },
  },
} as const;

export type CurrencyCode = typeof GAME_CONFIG.currency.code;

// 🎯 Tipos de colliders
export const COLLIDER_TYPES = {
  HULL: "hull",
  TRIMESH: "trimesh",
  BOX: "box",
  CYLINDER: "cylinder",
  SPHERE: "sphere",
} as const;

// Función para obtener FPS dinámico desde configuraciones
export const getTargetFPS = () => {
  if (typeof window !== "undefined") {
    const savedSettings = localStorage.getItem("gameSettings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        return settings.targetFPS || GAME_CONFIG.physics.targetFPS;
      } catch (error) {
        console.error("Error loading FPS settings:", error);
      }
    }
  }
  return GAME_CONFIG.physics.targetFPS;
};
