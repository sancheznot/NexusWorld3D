import { colyseusClient } from './client';

export type LedgerEntry = {
  userId: string;
  type: 'deposit' | 'withdraw' | 'transfer-in' | 'transfer-out';
  amountMinor: number;
  balanceAfterMinor: number;
  reason?: string;
  timestamp: number;
  counterpartyId?: string;
};

export type EconomyFees = {
  depositRate: number;
  withdrawRate: number;
  transferRate: number;
  purchaseRate: number;
  minFeeMajor: number;
};

export class EconomyClient {
  private static instance: EconomyClient;
  private listeners = new Map<string, ((data: unknown) => void)[]>();
  private latestWallet = 0; // major units
  private latestBank = 0;   // major units
  private latestLedger: LedgerEntry[] = [];
  private limits: { deposit: number; withdraw: number; transfer: number; fees: EconomyFees } | null = null;
  private limitsUsed: { deposit: number; withdraw: number; transfer: number } | null = null;

  static getInstance(): EconomyClient {
    if (!EconomyClient.instance) EconomyClient.instance = new EconomyClient();
    return EconomyClient.instance;
  }

  private constructor() {
    this.bindLifecycle();
  }

  private bindLifecycle() {
    colyseusClient.on('room:connected', () => {
      this.setupListeners();
      this.requestState();
    });
  }

  private setupListeners() {
    const room = colyseusClient.getSocket();
    if (!room) return;
    room.onMessage('economy:wallet', (data: { amount: number } | unknown) => {
      const raw = (data as { amount?: unknown })?.amount;
      const num = typeof raw === 'number' ? raw : Number(raw ?? 0);
      // Normalizar por si llega en minor units accidentalmente
      const normalized = num >= 10000 ? Math.round(num / 100) : num;
      this.latestWallet = normalized;
      this.emit('economy:wallet', normalized);
    });
    room.onMessage('economy:bank', (data: { amount: number } | unknown) => {
      const raw = (data as { amount?: unknown })?.amount;
      const num = typeof raw === 'number' ? raw : Number(raw ?? 0);
      const normalized = num >= 10000 ? Math.round(num / 100) : num;
      this.latestBank = normalized;
      this.emit('economy:bank', normalized);
    });
    room.onMessage('economy:ledger', (data: { entries: LedgerEntry[] }) => {
      this.latestLedger = data.entries;
      this.emit('economy:ledger', data.entries);
    });
    room.onMessage('economy:error', (data: { message: string }) => {
      this.emit('economy:error', data);
    });
    room.onMessage('economy:limits', (data: { deposit: number; withdraw: number; transfer: number; fees: EconomyFees }) => {
      this.limits = data;
      this.emit('economy:limits', data);
    });
    room.onMessage('economy:limitsUsed', (data: { deposit: number; withdraw: number; transfer: number } | unknown) => {
      const d = data as { deposit?: unknown; withdraw?: unknown; transfer?: unknown };
      const norm = {
        deposit: typeof d.deposit === 'number' ? d.deposit : Math.round(Number(d.deposit ?? 0)),
        withdraw: typeof d.withdraw === 'number' ? d.withdraw : Math.round(Number(d.withdraw ?? 0)),
        transfer: typeof d.transfer === 'number' ? d.transfer : Math.round(Number(d.transfer ?? 0)),
      };
      // Normalizar si llegan en minor units
      const normalize = (v: number) => (v >= 10000 ? Math.round(v / 100) : v);
      const normalized = {
        deposit: normalize(norm.deposit),
        withdraw: normalize(norm.withdraw),
        transfer: normalize(norm.transfer),
      };
      this.limitsUsed = normalized;
      this.emit('economy:limitsUsed', normalized);
    });
  }

  requestState() {
    colyseusClient.getSocket()?.send('economy:request');
  }

  deposit(amount: number, reason?: string) {
    colyseusClient.getSocket()?.send('economy:deposit', { amount, reason });
  }

  withdraw(amount: number, reason?: string) {
    colyseusClient.getSocket()?.send('economy:withdraw', { amount, reason });
  }

  transfer(toUserId: string, amount: number, reason?: string) {
    colyseusClient.getSocket()?.send('economy:transfer', { toUserId, amount, reason });
  }

  on(event: 'economy:wallet' | 'economy:bank' | 'economy:ledger' | 'economy:error' | 'economy:limits' | 'economy:limitsUsed', cb: (data: unknown) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
  }

  getLimits() {
    return this.limits;
  }

  getLimitsUsed() {
    return this.limitsUsed;
  }

  off(event: string, cb: (data: unknown) => void) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const i = arr.indexOf(cb);
    if (i > -1) arr.splice(i, 1);
  }

  private emit(event: string, data: unknown) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    arr.forEach(fn => fn(data));
  }

  getWallet(): number {
    return this.latestWallet;
  }

  getBank(): number {
    return this.latestBank;
  }

  getLedger(): LedgerEntry[] {
    return this.latestLedger;
  }
}

export const economyClient = EconomyClient.getInstance();
export default economyClient;


