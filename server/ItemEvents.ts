import { Room, Client } from 'colyseus';
import { InventoryItem } from '../src/types/inventory.types';
import { ITEM_SPAWNS, ItemSpawnConfig } from '../src/constants/items';

export interface WorldItemState {
  id: string; // spawn id
  mapId: string;
  position: { x: number; y: number; z: number };
  item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>;
  isCollected: boolean;
}

export class ItemEvents {
  private room: Room;
  // MapaId -> items en el suelo
  private worldItems = new Map<string, Map<string, WorldItemState>>();
  private getPlayerMapId: (clientId: string) => string | null;
  private grantItemToPlayer: (playerId: string, item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>) => void;

  constructor(room: Room, getPlayerMapId: (clientId: string) => string | null, grantItemToPlayer: (playerId: string, item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>) => void) {
    this.room = room;
    this.getPlayerMapId = getPlayerMapId;
    this.grantItemToPlayer = grantItemToPlayer;
    this.bootstrapSpawns();
    this.setupHandlers();
  }

  private bootstrapSpawns() {
    Object.entries(ITEM_SPAWNS).forEach(([mapId, spawns]) => {
      const map = new Map<string, WorldItemState>();
      spawns.forEach((s: ItemSpawnConfig) => {
        map.set(s.id, {
          id: s.id,
          mapId,
          position: s.position,
          item: s.item,
          isCollected: false,
        });
      });
      this.worldItems.set(mapId, map);
    });
  }

  private setupHandlers() {
    this.room.onMessage('items:request', (client: Client, data: { mapId: string }) => {
      const items = this.listItems(data.mapId);
      client.send('items:state', { mapId: data.mapId, items });
    });

    this.room.onMessage('items:collect', (client: Client, data: { spawnId: string; mapId: string }) => {
      const result = this.collectItem(data.mapId, data.spawnId, client.sessionId);
      const ok = result.ok;
      if (!ok) {
        client.send('inventory:error', { message: 'Item no disponible' });
        return;
      }
      // Autoridad: otorgar el ítem al inventario del jugador
      if (result.item) {
        this.grantItemToPlayer(client.sessionId, result.item);
      }
      // Confirmación al colector con datos del item
      client.send('items:collected', { mapId: data.mapId, spawnId: data.spawnId, item: result.item });
      // Broadcast nuevo estado del ítem a jugadores en el mismo mapa
      this.broadcastToMap(data.mapId, 'items:update', { mapId: data.mapId, spawnId: data.spawnId, isCollected: true });
    });
  }

  private listItems(mapId: string) {
    const map = this.worldItems.get(mapId);
    if (!map) return [];
    return Array.from(map.values());
  }

  private collectItem(mapId: string, spawnId: string, playerId: string): { ok: boolean; item?: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'> } {
    const map = this.worldItems.get(mapId);
    if (!map) return { ok: false };
    const item = map.get(spawnId);
    if (!item || item.isCollected) return { ok: false };
    item.isCollected = true;
    map.set(spawnId, item);
    // TODO: aquí podríamos integrar con InventoryEvents para añadir al inventario del jugador
    return { ok: true, item: item.item };
  }

  private broadcastToMap(mapId: string, type: string, payload: any) {
    this.room.clients.forEach((c) => {
      const pMap = this.getPlayerMapId(c.sessionId);
      if (pMap === mapId) {
        c.send(type, payload);
      }
    });
  }
}


