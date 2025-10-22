export const GAME_CONFIG = {
  currency: {
    code: 'HBC', // Humboldt Coin
    symbol: '₿',
    startingBalance: 500,
    maxTransfer: 100000,
    minAmount: 1,
  },
  triggers: {
    defaultRadius: 3,
    interactKey: 'e',
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
    distance: 3.5,
    height: 2,
    smoothness: 0.15,
    collisionOffset: 0.2,
    collisionEnableDelayMs: 2000,
    enableCollision: true,
    minClearance: 1.2,
    requireStablePose: false,
    throttleMs: 80,
  },
  player: {
    spawnPosition: {
      x: -4.9,
      y: 1.03,
      z: 33.9,
    },
  },
} as const;

export type CurrencyCode = typeof GAME_CONFIG.currency.code;


