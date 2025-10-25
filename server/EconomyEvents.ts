import { Room, Client } from 'colyseus';
import { GAME_CONFIG } from '../src/constants/game';
import { money } from '../src/lib/utils/money';

interface EconomyState {
  walletMinor: Map<string, number>; // Monedero (HUD)
  bankMinor: Map<string, number>;   // Banco (solo en sucursal)
  ledger: Map<string, TransactionEntry[]>;
  dailyUsageMinor: Map<string, DailyUsage>; // key: userId|YYYY-MM-DD
}

interface TransactionEntry {
  userId: string;
  type: 'deposit' | 'withdraw' | 'transfer-in' | 'transfer-out';
  amountMinor: number;
  balanceAfterMinor: number;
  reason?: string;
  timestamp: number;
  counterpartyId?: string;
}

interface DailyUsage {
  depositMinor: number;
  withdrawMinor: number;
  transferMinor: number;
}

export class EconomyEvents {
  private room: Room;
  private state: EconomyState = {
    walletMinor: new Map(),
    bankMinor: new Map(),
    ledger: new Map(),
    dailyUsageMinor: new Map(),
  };

  constructor(room: Room) {
    this.room = room;
    this.setupHandlers();
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getDaily(userId: string): DailyUsage {
    const key = `${userId}|${this.todayKey()}`;
    const existing = this.state.dailyUsageMinor.get(key);
    if (existing) return existing;
    const fresh: DailyUsage = { depositMinor: 0, withdrawMinor: 0, transferMinor: 0 };
    this.state.dailyUsageMinor.set(key, fresh);
    return fresh;
  }

  private getWalletMinor(userId: string): number {
    const defaultMinor = money.toMinor(GAME_CONFIG.currency.startingBalance);
    return this.state.walletMinor.get(userId) ?? defaultMinor;
  }

  private getBankMinor(userId: string): number {
    return this.state.bankMinor.get(userId) ?? 0;
  }

  private pushLedger(entry: TransactionEntry) {
    const list = this.state.ledger.get(entry.userId) ?? [];
    list.unshift(entry);
    if (list.length > 100) list.pop();
    this.state.ledger.set(entry.userId, list);
  }

  private sendWallet(client: Client, userId: string) {
    const minor = this.getWalletMinor(userId);
    client.send('economy:wallet', { amount: money.toMajor(minor) });
  }

  private sendBank(client: Client, userId: string) {
    const minor = this.getBankMinor(userId);
    client.send('economy:bank', { amount: money.toMajor(minor) });
  }

  private sendLimitsUsed(client: Client, userId: string) {
    const d = this.getDaily(userId);
    client.send('economy:limitsUsed', {
      deposit: money.toMajor(d.depositMinor),
      withdraw: money.toMajor(d.withdrawMinor),
      transfer: money.toMajor(d.transferMinor),
    });
  }

  private sendLedger(client: Client, userId: string) {
    const entries = this.state.ledger.get(userId) ?? [];
    client.send('economy:ledger', { entries });
  }

  private setupHandlers() {
    this.room.onMessage('economy:request', (client: Client) => {
      const userId = client.sessionId;
      this.sendWallet(client, userId);
      this.sendBank(client, userId);
      this.sendLedger(client, userId);
      this.sendLimitsUsed(client, userId);
      client.send('economy:limits', {
        deposit: GAME_CONFIG.currency.maxDailyDeposit,
        withdraw: GAME_CONFIG.currency.maxDailyWithdraw,
        transfer: GAME_CONFIG.currency.maxDailyTransfer,
        fees: GAME_CONFIG.currency.fees,
      });
    });

    // Depositar: de monedero -> banco
    this.room.onMessage('economy:deposit', (client: Client, data: { amount: number; reason?: string }) => {
      const userId = client.sessionId;
      const minor = money.clampTransferMinor(money.toMinor(data.amount));
      // Apply deposit fee
      const feeMinor = this.applyRate(minor, GAME_CONFIG.currency.fees.depositRate);
      const netMinor = Math.max(0, minor - feeMinor);
      const daily = this.getDaily(userId);
      const maxMinor = money.toMinor(GAME_CONFIG.currency.maxDailyDeposit);
      if (daily.depositMinor + minor > maxMinor) {
        client.send('economy:error', { message: 'Daily deposit limit reached' });
        return;
      }
      const wallet = this.getWalletMinor(userId);
      if (wallet < minor) {
        client.send('economy:error', { message: 'Insufficient wallet funds' });
        return;
      }
      // Debit wallet full amount, credit bank net
      const walletNext = money.subMinor(wallet, minor);
      const bank = this.getBankMinor(userId);
      const bankNext = money.addMinor(bank, netMinor);
      this.state.walletMinor.set(userId, walletNext);
      this.state.bankMinor.set(userId, bankNext);
      daily.depositMinor += minor;
      this.pushLedger({ userId, type: 'deposit', amountMinor: netMinor, balanceAfterMinor: bankNext, reason: data.reason, timestamp: Date.now() });
      if (feeMinor > 0) this.creditTreasury(feeMinor, `fee:deposit:${userId}`);
      this.sendWallet(client, userId);
      this.sendBank(client, userId);
      this.sendLimitsUsed(client, userId);
      this.sendLedger(client, userId);
    });

    // Retirar: de banco -> monedero
    this.room.onMessage('economy:withdraw', (client: Client, data: { amount: number; reason?: string }) => {
      const userId = client.sessionId;
      const minor = money.clampTransferMinor(money.toMinor(data.amount));
      // Apply withdraw fee
      const feeMinor = this.applyRate(minor, GAME_CONFIG.currency.fees.withdrawRate);
      const grossMinor = minor + feeMinor; // user pays fee on top
      const daily = this.getDaily(userId);
      const maxMinor = money.toMinor(GAME_CONFIG.currency.maxDailyWithdraw);
      const bank = this.getBankMinor(userId);
      if (bank < grossMinor) {
        client.send('economy:error', { message: 'Insufficient funds' });
        return;
      }
      if (daily.withdrawMinor + minor > maxMinor) {
        client.send('economy:error', { message: 'Daily withdraw limit reached' });
        return;
      }
      const bankNext = money.subMinor(bank, grossMinor);
      const wallet = this.getWalletMinor(userId);
      const walletNext = money.addMinor(wallet, minor);
      this.state.bankMinor.set(userId, bankNext);
      this.state.walletMinor.set(userId, walletNext);
      daily.withdrawMinor += minor;
      this.pushLedger({ userId, type: 'withdraw', amountMinor: -minor, balanceAfterMinor: bankNext, reason: data.reason, timestamp: Date.now() });
      if (feeMinor > 0) this.creditTreasury(feeMinor, `fee:withdraw:${userId}`);
      this.sendWallet(client, userId);
      this.sendBank(client, userId);
      this.sendLimitsUsed(client, userId);
      this.sendLedger(client, userId);
    });

    // Transferir: banco -> banco
    this.room.onMessage('economy:transfer', (client: Client, data: { toUserId: string; amount: number; reason?: string }) => {
      const fromUserId = client.sessionId;
      const toUserId = data.toUserId;
      if (!toUserId || toUserId === fromUserId) {
        client.send('economy:error', { message: 'Invalid target user' });
        return;
      }
      const minor = money.clampTransferMinor(money.toMinor(data.amount));
      // Apply transfer fee (deduct from sender additionally)
      const feeMinor = this.applyRate(minor, GAME_CONFIG.currency.fees.transferRate);
      const totalDebit = minor + feeMinor;
      const daily = this.getDaily(fromUserId);
      const maxMinor = money.toMinor(GAME_CONFIG.currency.maxDailyTransfer);
      if (daily.transferMinor + minor > maxMinor) {
        client.send('economy:error', { message: 'Daily transfer limit reached' });
        return;
      }
      const fromCurrent = this.getBankMinor(fromUserId);
      if (fromCurrent < totalDebit) {
        client.send('economy:error', { message: 'Insufficient funds' });
        return;
      }
      const fromNext = money.subMinor(fromCurrent, totalDebit);
      this.state.bankMinor.set(fromUserId, fromNext);
      daily.transferMinor += minor;
      this.pushLedger({ userId: fromUserId, type: 'transfer-out', amountMinor: -minor, balanceAfterMinor: fromNext, reason: data.reason, timestamp: Date.now(), counterpartyId: toUserId });
      if (feeMinor > 0) this.creditTreasury(feeMinor, `fee:transfer:${fromUserId}->${toUserId}`);

      const toCurrent = this.getBankMinor(toUserId);
      const toNext = money.addMinor(toCurrent, minor);
      this.state.bankMinor.set(toUserId, toNext);
      this.pushLedger({ userId: toUserId, type: 'transfer-in', amountMinor: minor, balanceAfterMinor: toNext, reason: data.reason, timestamp: Date.now(), counterpartyId: fromUserId });

      // Notify both parties if connected
      const toClient = this.room.clients.find(c => c.sessionId === toUserId);
      if (toClient) {
        this.sendBank(toClient, toUserId);
        this.sendLedger(toClient, toUserId);
        this.sendLimitsUsed(toClient, toUserId);
      }
      this.sendBank(client, fromUserId);
      this.sendLimitsUsed(client, fromUserId);
      this.sendLedger(client, fromUserId);
    });

    // Purchase endpoint (for shop integration)
    // Compra: usa monedero (wallet)
    this.room.onMessage('economy:purchase', (client: Client, data: { total: number; reason?: string }) => {
      const userId = client.sessionId;
      const amountMinor = money.clampTransferMinor(money.toMinor(data.total));
      const feeMinor = this.applyRate(amountMinor, GAME_CONFIG.currency.fees.purchaseRate);
      const gross = amountMinor + feeMinor;
      const current = this.getWalletMinor(userId);
      if (current < gross) {
        client.send('economy:error', { message: 'Insufficient funds' });
        return;
      }
      const next = money.subMinor(current, gross);
      this.state.walletMinor.set(userId, next);
      this.pushLedger({ userId, type: 'withdraw', amountMinor: -amountMinor, balanceAfterMinor: this.getBankMinor(userId), reason: data.reason ?? 'purchase', timestamp: Date.now() });
      if (feeMinor > 0) this.creditTreasury(feeMinor, `fee:purchase:${userId}`);
      this.sendWallet(client, userId);
      this.sendLedger(client, userId);
    });

    // Pago de trabajos: acredita monedero (wallet)
    this.room.onMessage('economy:job-pay', (client: Client, data: { amount: number; reason?: string }) => {
      const userId = client.sessionId;
      const amountMinor = money.clampTransferMinor(money.toMinor(data.amount));
      const feeMinor = this.applyRate(amountMinor, GAME_CONFIG.currency.fees.jobRate);
      const net = Math.max(0, amountMinor - feeMinor);
      const wallet = this.getWalletMinor(userId);
      const next = money.addMinor(wallet, net);
      this.state.walletMinor.set(userId, next);
      this.pushLedger({ userId, type: 'deposit', amountMinor: net, balanceAfterMinor: this.getBankMinor(userId), reason: data.reason ?? 'job', timestamp: Date.now() });
      if (feeMinor > 0) this.creditTreasury(feeMinor, `fee:job:${userId}`);
      this.sendWallet(client, userId);
      this.sendLedger(client, userId);
    });
  }

  private applyRate(amountMinor: number, rate: number): number {
    const raw = Math.floor(amountMinor * rate);
    const min = money.toMinor(GAME_CONFIG.currency.fees.minFeeMajor);
    return Math.max(min, raw);
  }

  private creditTreasury(feeMinor: number, reason: string) {
    const id = GAME_CONFIG.currency.treasuryAccountId;
    const current = this.getBankMinor(id);
    const next = money.addMinor(current, feeMinor);
    this.state.bankMinor.set(id, next);
    this.pushLedger({ userId: id, type: 'deposit', amountMinor: feeMinor, balanceAfterMinor: next, reason, timestamp: Date.now() });
  }

  // Crédito directo al monedero (usado por Inventario al usar bolsas de dinero)
  public creditWalletMajor(userId: string, amountMajor: number, reason?: string) {
    const addMinor = money.clampTransferMinor(money.toMinor(amountMajor));
    const curr = this.getWalletMinor(userId);
    const next = money.addMinor(curr, addMinor);
    this.state.walletMinor.set(userId, next);
    this.pushLedger({ userId, type: 'deposit', amountMinor: addMinor, balanceAfterMinor: this.getBankMinor(userId), reason: reason ?? 'item', timestamp: Date.now() });
    const client = this.room.clients.find(c => c.sessionId === userId);
    if (client) {
      this.sendWallet(client, userId);
      this.sendLedger(client, userId);
    }
  }
}


