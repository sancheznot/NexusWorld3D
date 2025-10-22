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
} as const;

export type CurrencyCode = typeof GAME_CONFIG.currency.code;


