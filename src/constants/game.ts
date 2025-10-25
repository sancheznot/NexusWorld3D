export const GAME_CONFIG = {
  currency: {
    code: 'HBC', // Humboldt Coin
    symbol: '₿',
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
    treasuryAccountId: 'treasury',
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
  player: {
    spawnPosition: {
      x: -4.9,
      y: 1.05,
      z: 33.9,
    },
  },
} as const;

export type CurrencyCode = typeof GAME_CONFIG.currency.code;


