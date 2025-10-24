'use client';

import { useState, useEffect } from 'react';
import itemsClient from '@/lib/colyseus/ItemsClient';
import { ItemsStateResponse, ItemsUpdateResponse } from '@/types/items-sync.types';
import { InventoryItem, ItemType, ItemRarity } from '@/types/inventory.types';

interface ItemCollectorProps {
  spawnId: string;
  mapId: string;
  position: [number, number, number];
  item: Omit<InventoryItem, 'id' | 'isEquipped' | 'slot'>;
  onCollect?: (item: InventoryItem) => void;
  collectRadius?: number;
  playerPosition: [number, number, number];
}

export default function ItemCollector({ 
  spawnId,
  mapId,
  position, 
  item, 
  onCollect,
  collectRadius = 2,
  playerPosition 
}: ItemCollectorProps) {
  const [hasRequested, setHasRequested] = useState(false);
  const [isNearby, setIsNearby] = useState(false);

  // Calcular distancia al jugador
  const distance = Math.sqrt(
    Math.pow(position[0] - playerPosition[0], 2) +
    Math.pow(position[1] - playerPosition[1], 2) +
    Math.pow(position[2] - playerPosition[2], 2)
  );

  // Verificar si el jugador está cerca
  useEffect(() => {
    setIsNearby(distance <= collectRadius);
  }, [distance, collectRadius]);

  // Recolectar item cuando esté cerca (100% servidor)
  useEffect(() => {
    if (isNearby && !hasRequested) {
      itemsClient.collectItem({ mapId, spawnId });
      setHasRequested(true); // evitar spam mientras está cerca
      // El inventario y visibilidad se actualizarán por eventos del servidor
    }
  }, [isNearby, hasRequested, mapId, spawnId]);

  const getRarityColor = (rarity: ItemRarity) => {
    const colors = {
      common: '#9CA3AF',
      uncommon: '#10B981',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B',
      mythic: '#EC4899'
    };
    return colors[rarity];
  };

  return (
    <mesh position={position}>
      {/* Item visual */}
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshBasicMaterial 
        color={getRarityColor(item.rarity)}
        transparent
        opacity={isNearby ? 1 : 0.7}
      />
      
      {/* Efecto de brillo cuando está cerca */}
      {isNearby && (
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial 
            color={getRarityColor(item.rarity)}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}

      {/* Texto flotante */}
      {isNearby && (
        <mesh position={[0, 1, 0]}>
          <planeGeometry args={[2, 0.5]} />
          <meshBasicMaterial 
            color="#000000"
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </mesh>
  );
}

// Componente para spawnear items en el mundo
export function ItemSpawner({ mapId, playerPosition }: { mapId: string; playerPosition: [number, number, number]; }) {
  const [spawns, setSpawns] = useState<ItemsStateResponse | null>(null);

  useEffect(() => {
    const stateCb = ((data: ItemsStateResponse) => {
      if (data.mapId === mapId) setSpawns(data);
    }) as unknown as (d: unknown) => void;

    const updateCb = ((data: ItemsUpdateResponse) => {
      if (!spawns || data.mapId !== mapId) return;
      setSpawns({
        mapId,
        items: spawns.items.map(i => i.id === data.spawnId ? { ...i, isCollected: data.isCollected } : i)
      });
    }) as unknown as (d: unknown) => void;

    const collectedCb = ((data: { mapId: string; spawnId: string }) => {
      if (data.mapId !== mapId) return;
      // Confirmación del servidor; el items:update ya oculta el spawn
    }) as unknown as (d: unknown) => void;

    itemsClient.on('items:state', stateCb);
    itemsClient.on('items:update', updateCb);
    itemsClient.on('items:collected', collectedCb);
    itemsClient.requestItems({ mapId });
    return () => {
      itemsClient.off('items:state', stateCb);
      itemsClient.off('items:update', updateCb);
      itemsClient.off('items:collected', collectedCb);
    };
  }, [mapId, spawns]);

  if (!spawns) return null;
  return (
    <>
      {spawns.items.filter(i => !i.isCollected).map((spawn) => (
        <ItemCollector
          key={spawn.id}
          spawnId={spawn.id}
          mapId={mapId}
          position={[spawn.position.x, spawn.position.y, spawn.position.z]}
          item={spawn.item}
          playerPosition={playerPosition}
        />
      ))}
    </>
  );
}

// Items predefinidos para spawnear
export const SPAWN_ITEMS = [
  {
    position: [5, 1, 5] as [number, number, number],
    item: {
      itemId: 'coin_gold',
      name: 'Moneda de Oro',
      description: 'Una moneda de oro brillante',
      type: 'misc' as ItemType,
      rarity: 'common' as ItemRarity,
      quantity: 1,
      maxStack: 999,
      weight: 0.01, // Peso de la moneda
      level: 1,
      icon: '🪙'
    }
  },
  {
    position: [10, 1, 10] as [number, number, number],
    item: {
      itemId: 'potion_health',
      name: 'Poción de Vida',
      description: 'Restaura 50 puntos de vida',
      type: 'consumable' as ItemType,
      rarity: 'common' as ItemRarity,
      quantity: 1,
      maxStack: 10,
      weight: 0.5, // Peso de la poción
      stats: { health: 50 },
      level: 1,
      icon: '🧪'
    }
  },
  {
    position: [15, 1, 15] as [number, number, number],
    item: {
      itemId: 'sword_iron',
      name: 'Espada de Hierro',
      description: 'Una espada de hierro afilada',
      type: 'weapon' as ItemType,
      rarity: 'uncommon' as ItemRarity,
      quantity: 1,
      maxStack: 1,
      weight: 4.0, // Peso de la espada
      stats: { damage: 15, strength: 3 },
      level: 2,
      icon: '⚔️'
    }
  }
];
