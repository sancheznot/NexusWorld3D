import { colyseusClient } from './client';

type ShopList = { shops: { id: string; name: string }[] };
type ShopData = { id: string; name: string; items: { itemId: string; name: string; price: number; stock: number; thumb?: string; icon?: string }[] };

export class ShopClient {
  private static instance: ShopClient;
  private listeners = new Map<string, ((data: unknown) => void)[]>();
  private currentShop: ShopData | null = null;

  static getInstance(): ShopClient {
    if (!ShopClient.instance) ShopClient.instance = new ShopClient();
    return ShopClient.instance;
  }

  private constructor() {
    colyseusClient.on('room:connected', () => this.setup());
  }

  private setup() {
    const room = colyseusClient.getSocket();
    if (!room) return;
    room.onMessage('shop:list', (data: ShopList) => this.emit('shop:list', data));
    room.onMessage('shop:data', (data: ShopData) => { this.currentShop = data; this.emit('shop:data', data); });
    room.onMessage('shop:error', (data: { message: string }) => this.emit('shop:error', data));
    room.onMessage('shop:success', (data: { itemId: string; quantity: number; total: number }) => this.emit('shop:success', data));
  }

  requestShops() { colyseusClient.getSocket()?.send('shop:list'); }
  openShop(shopId: string) { colyseusClient.getSocket()?.send('shop:request', { shopId }); }
  buy(shopId: string, itemId: string, quantity = 1) { colyseusClient.getSocket()?.send('shop:buy', { shopId, itemId, quantity }); }

  on(event: 'shop:list' | 'shop:data' | 'shop:error' | 'shop:success', cb: (data: unknown) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
  }
  off(event: string, cb: (data: unknown) => void) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    const i = arr.indexOf(cb);
    if (i > -1) arr.splice(i, 1);
  }
  private emit(event: string, data: unknown) { this.listeners.get(event)?.forEach(fn => fn(data)); }

  getCurrentShop() { return this.currentShop; }
}

export const shopClient = ShopClient.getInstance();
export default shopClient;


