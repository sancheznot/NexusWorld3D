import { GAME_CONFIG, CurrencyCode } from '@/constants/game';
import { money } from '@/lib/utils/money';

export interface EconomyProvider {
  /** Returns balance in MAJOR units (e.g., 12.34) */
  getBalance(userId: string): Promise<number>;
  /** Accepts amount in MAJOR units; returns new balance in MAJOR units */
  deposit(userId: string, amount: number, reason?: string): Promise<number>;
  /** Accepts amount in MAJOR units; returns new balance in MAJOR units */
  withdraw(userId: string, amount: number, reason?: string): Promise<number>;
  /** Accepts amount in MAJOR units */
  transfer(fromUserId: string, toUserId: string, amount: number, reason?: string): Promise<void>;
  /** Optional: return recent ledger entries */
  getLedger?(userId: string): Promise<TransactionEntry[]>;
}

export interface TransactionEntry {
  userId: string;
  type: 'deposit' | 'withdraw' | 'transfer-in' | 'transfer-out';
  amountMinor: number; // signed, in minor units
  balanceAfterMinor: number;
  reason?: string;
  timestamp: number;
  counterpartyId?: string;
}

class InMemoryEconomy implements EconomyProvider {
  // Store balances in MINOR units to avoid float errors
  private balancesMinor = new Map<string, number>();
  private ledger = new Map<string, TransactionEntry[]>();

  private getBalanceMinor(userId: string): number {
    const defaultMinor = money.toMinor(GAME_CONFIG.currency.startingBalance);
    return this.balancesMinor.get(userId) ?? defaultMinor;
  }

  private pushLedger(entry: TransactionEntry) {
    const list = this.ledger.get(entry.userId) ?? [];
    list.unshift(entry);
    // prevent unbounded growth (keep last 100)
    if (list.length > 100) list.pop();
    this.ledger.set(entry.userId, list);
  }

  async getBalance(userId: string): Promise<number> {
    const minor = this.getBalanceMinor(userId);
    return money.toMajor(minor);
  }

  async deposit(userId: string, amountMajor: number, reason?: string): Promise<number> {
    const minorRaw = money.toMinor(amountMajor);
    const minor = money.clampTransferMinor(minorRaw);
    const currentMinor = this.getBalanceMinor(userId);
    const nextMinor = money.addMinor(currentMinor, minor);
    this.balancesMinor.set(userId, nextMinor);
    this.pushLedger({
      userId,
      type: 'deposit',
      amountMinor: minor,
      balanceAfterMinor: nextMinor,
      reason,
      timestamp: Date.now(),
    });
    return money.toMajor(nextMinor);
  }

  async withdraw(userId: string, amountMajor: number, reason?: string): Promise<number> {
    const minorRaw = money.toMinor(amountMajor);
    const minor = money.clampTransferMinor(minorRaw);
    const currentMinor = this.getBalanceMinor(userId);
    if (currentMinor < minor) throw new Error('Insufficient funds');
    const nextMinor = money.subMinor(currentMinor, minor);
    this.balancesMinor.set(userId, nextMinor);
    this.pushLedger({
      userId,
      type: 'withdraw',
      amountMinor: -minor,
      balanceAfterMinor: nextMinor,
      reason,
      timestamp: Date.now(),
    });
    return money.toMajor(nextMinor);
  }

  async transfer(fromUserId: string, toUserId: string, amountMajor: number, reason?: string): Promise<void> {
    const minorRaw = money.toMinor(amountMajor);
    const minor = money.clampTransferMinor(minorRaw);
    const fromMinor = this.getBalanceMinor(fromUserId);
    if (fromMinor < minor) throw new Error('Insufficient funds');

    const fromNext = money.subMinor(fromMinor, minor);
    this.balancesMinor.set(fromUserId, fromNext);
    this.pushLedger({
      userId: fromUserId,
      type: 'transfer-out',
      amountMinor: -minor,
      balanceAfterMinor: fromNext,
      reason,
      timestamp: Date.now(),
      counterpartyId: toUserId,
    });

    const toMinor = this.getBalanceMinor(toUserId);
    const toNext = money.addMinor(toMinor, minor);
    this.balancesMinor.set(toUserId, toNext);
    this.pushLedger({
      userId: toUserId,
      type: 'transfer-in',
      amountMinor: minor,
      balanceAfterMinor: toNext,
      reason,
      timestamp: Date.now(),
      counterpartyId: fromUserId,
    });
  }

  async getLedger(userId: string): Promise<TransactionEntry[]> {
    return this.ledger.get(userId) ?? [];
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
  format: (amountMajor: number, opts?: { withCode?: boolean; withSymbol?: boolean }) => money.formatMajor(amountMajor, opts),
  getLedger: (userId: string) => (provider.getLedger ? provider.getLedger(userId) : Promise.resolve([])),
};


