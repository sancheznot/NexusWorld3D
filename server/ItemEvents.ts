import { Room, Client } from 'colyseus';
import { InventoryItem } from '../src/types/inventory.types';
import { ITEM_SPAWNS, ItemSpawnConfig, ITEMS_CATALOG } from '../src/constants/items';

export interface WorldItemState {
  id: string; // spawn id
  mapId: string;
  position: { x: number; y: number; z: number };
  item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>;
  isCollected: boolean;
  // extras para respawn/variantes
  points?: Array<{ x: number; y: number; z: number }>;
  respawnSec?: number;
}

export class ItemEvents {
  private room: Room;
  // MapaId -> items en el suelo
  private worldItems = new Map<string, Map<string, WorldItemState>>();
  private getPlayerMapId: (clientId: string) => string | null;
  private grantItemToPlayer: (playerId: string, item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>) => void;
  private static readonly MIN_SPAWN_DISTANCE = 1.2; // metros (permite spawns cercanos pero no superpuestos)

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
        const cat = ITEMS_CATALOG[s.item.itemId];
        const mergedItem = {
          ...s.item,
          icon: (s.item as any).icon || cat?.icon || '📦',
          thumb: (s.item as any).thumb || cat?.thumb,
          visual: (s.item as any).visual || cat?.visual,
        } as Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'> & { visual?: { path: string; type: 'glb' | 'gltf' | 'fbx' | 'obj'; scale?: number; rotation?: [number, number, number] } };
        // Elegir posición libre
        const pos = this.chooseFreePosition(s, mapId, map) || s.position || (s.points && s.points[0]) || { x: 0, y: 1, z: 0 };
        map.set(s.id, {
          id: s.id,
          mapId,
          position: pos,
          item: mergedItem,
          isCollected: false,
          points: s.points,
          respawnSec: s.respawnSec,
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
      // Programar respawn si aplica
      const state = this.worldItems.get(data.mapId)?.get(data.spawnId);
      if (state && state.respawnSec && state.respawnSec > 0) {
        setTimeout(() => {
          const map = this.worldItems.get(data.mapId);
          if (!map) return;
          const current = map.get(data.spawnId);
          if (!current) return;
          // elegir nueva posición libre; si no hay, reintentar en 3s
          const pos = this.chooseFreePosition({ id: current.id, mapId: current.mapId, points: current.points, position: current.position, item: current.item, respawnSec: current.respawnSec } as any, data.mapId, map);
          if (!pos) {
            setTimeout(() => {
              // reintento simple
              const retryPos = this.chooseFreePosition({ id: current.id, mapId: current.mapId, points: current.points, position: current.position, item: current.item, respawnSec: current.respawnSec } as any, data.mapId, map);
              if (!retryPos) return; // si sigue ocupado, dejamos sin respawn hasta próximo ciclo
              current.isCollected = false;
              current.position = retryPos;
              map.set(data.spawnId, current);
              this.broadcastToMap(data.mapId, 'items:update', { mapId: data.mapId, spawnId: data.spawnId, isCollected: false, position: current.position });
            }, 3000);
            return;
          }
          current.isCollected = false;
          current.position = pos;
          map.set(data.spawnId, current);
          this.broadcastToMap(data.mapId, 'items:update', { mapId: data.mapId, spawnId: data.spawnId, isCollected: false, position: current.position });
        }, state.respawnSec * 1000);
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
    // La entrega al inventario se realiza en el handler 'items:collect' usando this.grantItemToPlayer
    // devolvemos el item para que el caller lo otorgue de forma autoritativa.
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

  // Utilidad para elegir punto de spawn: usa position si existe, si no, toma uno de points
  private chooseSpawnPosition(cfg: ItemSpawnConfig): { x: number; y: number; z: number } {
    if (cfg.position) return cfg.position;
    if (cfg.points && cfg.points.length > 0) {
      const idx = Math.floor(Math.random() * cfg.points.length);
      return cfg.points[idx];
    }
    return { x: 0, y: 1, z: 0 };
  }

  private chooseFreePosition(cfg: ItemSpawnConfig, mapId: string, map: Map<string, WorldItemState>): { x: number; y: number; z: number } | null {
    const candidates = [] as Array<{ x: number; y: number; z: number }>;
    if (cfg.position) candidates.push(cfg.position);
    if (cfg.points && cfg.points.length) candidates.push(...cfg.points);
    if (candidates.length === 0) candidates.push({ x: 0, y: 1, z: 0 });

    const occupied = (p: { x: number; y: number; z: number }) => {
      for (const s of map.values()) {
        if (!s.isCollected) {
          const dx = s.position.x - p.x;
          const dy = s.position.y - p.y;
          const dz = s.position.z - p.z;
          const dist2 = dx*dx + dy*dy + dz*dz;
          if (dist2 < ItemEvents.MIN_SPAWN_DISTANCE * ItemEvents.MIN_SPAWN_DISTANCE) return true;
        }
      }
      return false;
    };

    for (const candidate of candidates) {
      if (!occupied(candidate)) return candidate;
    }
    // Si todas están ocupadas, usar la primera como fallback
    return candidates[0] || null;
  }
}


