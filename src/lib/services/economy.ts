import { GAME_CONFIG, CurrencyCode } from '@/constants/game';

export interface EconomyProvider {
  getBalance(userId: string): Promise<number>;
  deposit(userId: string, amount: number, reason?: string): Promise<number>;
  withdraw(userId: string, amount: number, reason?: string): Promise<number>;
  transfer(fromUserId: string, toUserId: string, amount: number, reason?: string): Promise<void>;
}

class InMemoryEconomy implements EconomyProvider {
  private balances = new Map<string, number>();

  async getBalance(userId: string): Promise<number> {
    return this.balances.get(userId) ?? GAME_CONFIG.currency.startingBalance;
  }

  async deposit(userId: string, amount: number): Promise<number> {
    const safe = Math.max(GAME_CONFIG.currency.minAmount, Math.min(amount, GAME_CONFIG.currency.maxTransfer));
    const current = await this.getBalance(userId);
    const next = current + safe;
    this.balances.set(userId, next);
    return next;
  }

  async withdraw(userId: string, amount: number): Promise<number> {
    const safe = Math.max(GAME_CONFIG.currency.minAmount, Math.min(amount, GAME_CONFIG.currency.maxTransfer));
    const current = await this.getBalance(userId);
    const next = Math.max(0, current - safe);
    this.balances.set(userId, next);
    return next;
  }

  async transfer(fromUserId: string, toUserId: string, amount: number): Promise<void> {
    const safe = Math.max(GAME_CONFIG.currency.minAmount, Math.min(amount, GAME_CONFIG.currency.maxTransfer));
    const from = await this.getBalance(fromUserId);
    if (from < safe) throw new Error('Insufficient funds');
    await this.withdraw(fromUserId, safe);
    await this.deposit(toUserId, safe);
  }
}

let provider: EconomyProvider = new InMemoryEconomy();

export function setEconomyProvider(p: EconomyProvider) {
  provider = p;
}

export const economy = {
  getBalance: (userId: string) => provider.getBalance(userId),
  deposit: (userId: string, amount: number, reason?: string) => provider.deposit(userId, amount, reason),
  withdraw: (userId: string, amount: number, reason?: string) => provider.withdraw(userId, amount, reason),
  transfer: (fromUserId: string, toUserId: string, amount: number, reason?: string) => provider.transfer(fromUserId, toUserId, amount, reason),
  currency: GAME_CONFIG.currency,
};


