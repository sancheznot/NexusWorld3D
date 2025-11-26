import { Room, Client } from 'colyseus';
import { SHOPS, ShopId } from '../src/constants/shops';
import { ITEMS_CATALOG } from '../src/constants/items';
import { InventoryItem } from '../src/types/inventory.types';

export class ShopEvents {
  private room: Room;
  private grantItemToPlayer: (playerId: string, item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>) => void;
  private getPlayerRole: (playerId: string) => string | undefined;
  private getPlayerMapId: (playerId: string) => string | null;
  private economy: { chargeWalletMajor: (userId: string, amount: number, reason?: string) => boolean };

  constructor(
    room: Room,
    opts: {
      grantItemToPlayer: (playerId: string, item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>) => void;
      getPlayerRole: (playerId: string) => string | undefined;
      getPlayerMapId: (playerId: string) => string | null;
      economy: { chargeWalletMajor: (userId: string, amount: number, reason?: string) => boolean };
    }
  ) {
    this.room = room;
    this.grantItemToPlayer = opts.grantItemToPlayer;
    this.getPlayerRole = opts.getPlayerRole;
    this.getPlayerMapId = opts.getPlayerMapId;
    this.economy = opts.economy;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.room.onMessage('shop:list', (client: Client) => {
      const mapId = this.getPlayerMapId(client.sessionId) || 'exterior';
      const shops = Object.values(SHOPS).filter(s => s.mapId === mapId);
      client.send('shop:list', { shops: shops.map(s => ({ id: s.id, name: s.name })) });
    });

    this.room.onMessage('shop:request', (client: Client, data: { shopId: ShopId }) => {
      const cfg = SHOPS[data.shopId];
      if (!cfg) { client.send('shop:error', { message: 'Tienda no encontrada' }); return; }
      if (!this.checkAccess(client.sessionId, cfg.id)) { client.send('shop:error', { message: 'Acceso denegado' }); return; }
      const items = cfg.items.map(it => {
        const cat = ITEMS_CATALOG[it.itemId];
        return { itemId: it.itemId, name: cat?.name ?? it.itemId, price: it.price, stock: it.stock ?? -1, thumb: cat?.thumb, icon: cat?.icon };
      });
      client.send('shop:data', { id: cfg.id, name: cfg.name, items });
    });

    this.room.onMessage('shop:buy', (client: Client, data: { shopId: ShopId; itemId: string; quantity?: number }) => {
      const cfg = SHOPS[data.shopId];
      if (!cfg) { client.send('shop:error', { message: 'Tienda no encontrada' }); return; }
      if (!this.checkAccess(client.sessionId, cfg.id)) { client.send('shop:error', { message: 'Acceso denegado' }); return; }
      const entry = cfg.items.find(i => i.itemId === data.itemId);
      if (!entry) { client.send('shop:error', { message: 'Artículo no disponible' }); return; }
      const qty = Math.max(1, Math.floor(data.quantity ?? 1));
      if (typeof entry.stock === 'number' && entry.stock < qty) { client.send('shop:error', { message: 'Stock insuficiente' }); return; }
      const total = entry.price * qty;
      const ok = this.economy.chargeWalletMajor(client.sessionId, total, `shop:${cfg.id}:${entry.itemId}`);
      if (!ok) { client.send('shop:error', { message: 'Fondos insuficientes' }); return; }
      // grant items
      const cat = ITEMS_CATALOG[entry.itemId];
      this.grantItemToPlayer(client.sessionId, {
        itemId: entry.itemId,
        name: cat?.name ?? entry.itemId,
        description: cat?.name ?? entry.itemId,
        type: (cat?.type ?? 'misc') as any,
        rarity: (cat?.rarity ?? 'common') as any,
        quantity: qty,
        maxStack: Math.max(1, (cat as any)?.maxStack ?? 99),
        weight: cat?.weight ?? 0,
        level: 1,
        icon: cat?.icon ?? '📦',
        thumb: cat?.thumb,
      });
      if (typeof entry.stock === 'number') entry.stock -= qty;
      client.send('shop:success', { itemId: entry.itemId, quantity: qty, total });
    });
  }

  private checkAccess(playerId: string, shopId: ShopId): boolean {
    const cfg = SHOPS[shopId];
    if (!cfg?.exclusive) return true;
    if (cfg.exclusive.role) {
      const role = this.getPlayerRole(playerId);
      if (role !== cfg.exclusive.role) return false;
    }
    if (cfg.exclusive.time) {
      const h = new Date().getHours();
      const { fromHour, toHour } = cfg.exclusive.time;
      if (!(h >= fromHour && h < toHour)) return false;
    }
    return true;
  }
}


