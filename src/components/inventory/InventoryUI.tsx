'use client';

import { useEffect, useRef, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useUIStore } from '@/store/uiStore';
import { InventoryItem, ItemRarity } from '@/types/inventory.types';
import { inventoryService } from '@/lib/services/inventory';
import { modelLoader } from '@/lib/three/modelLoader';
import type { Object3D } from 'three';

export default function InventoryUI() {
  const { isInventoryOpen, toggleInventory } = useUIStore();
  
  const {
    inventory,
    equipment,
    isLoading,
    addItem,
    removeItem,
    equipItem,
    unequipItem,
    consumeItem,
    addGold,
    removeGold,
    addTestItems,
    clearInventory,
    getTotalStats
  } = useInventory();

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'equipment' | 'stats'>('inventory');

  if (!isInventoryOpen) return null;

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
  };

  const handleEquipItem = (item: InventoryItem) => {
    if (item.isEquipped) {
      unequipItem(item.type);
    } else {
      equipItem(item.id);
    }
  };

  const handleUseItem = (item: InventoryItem) => {
    if (item.type === 'consumable') {
      consumeItem(item.id);
    }
  };

  const handleRemoveItem = (item: InventoryItem) => {
    if (confirm(`¿Remover ${item.name}?`)) {
      removeItem(item.id, 1);
    }
  };

  const getRarityColor = (rarity: ItemRarity) => {
    const colors = {
      common: 'text-gray-400',
      uncommon: 'text-green-400',
      rare: 'text-blue-400',
      epic: 'text-purple-400',
      legendary: 'text-orange-400',
      mythic: 'text-pink-400'
    };
    return colors[rarity];
  };

  const getRarityBg = (rarity: ItemRarity) => {
    const colors = {
      common: 'bg-gray-800',
      uncommon: 'bg-green-900',
      rare: 'bg-blue-900',
      epic: 'bg-purple-900',
      legendary: 'bg-orange-900',
      mythic: 'bg-pink-900'
    };
    return colors[rarity];
  };

  const totalStats = getTotalStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Inventario</h2>
          <div className="flex gap-2">
            <button
              onClick={addTestItems}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              🧪 Test Items
            </button>
            <button
              onClick={() => {
                // Obtener nivel actual y subir 1 nivel
                const currentLevel = inventoryService.getInventory().maxSlots === 20 ? 1 : 
                  Math.floor((inventoryService.getInventory().maxSlots - 20) / 2) + 1;
                const newLevel = currentLevel + 1;
                
                console.log(`🎮 Subiendo del nivel ${currentLevel} al ${newLevel}`);
                
                // Actualizar nivel en el servicio
                inventoryService.updatePlayerLevel(newLevel);
                
                // Forzar actualización del inventario
                // El hook useInventory se encarga de la actualización automática
                
                console.log(`📦 Nuevos slots: ${inventoryService.getInventory().maxSlots}`);
                console.log(`⚖️ Nuevo peso: ${inventoryService.getInventory().maxWeight} kg`);
              }}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              ⬆️ Level Up
            </button>
            <button
              onClick={clearInventory}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              🗑️ Limpiar
            </button>
            <button
              onClick={toggleInventory}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gray-800 rounded p-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <span className="text-yellow-400">₿ {inventory.gold}</span>
              <span className="text-gray-300">
                📦 {inventory.usedSlots}/{inventory.maxSlots} slots
              </span>
              <span className={`${
                inventory.currentWeight >= inventory.maxWeight 
                  ? 'text-red-500 font-bold' 
                  : inventory.currentWeight > inventory.maxWeight * 0.9 
                    ? 'text-red-400' 
                    : 'text-gray-300'
              }`}>
                ⚖️ {inventory.currentWeight.toFixed(1)}/{inventory.maxWeight} kg
                {inventory.currentWeight >= inventory.maxWeight && ' 🔒'}
              </span>
            </div>
            <div className="flex gap-4 text-sm">
              {totalStats.damage && <span className="text-red-400">⚔️ {totalStats.damage}</span>}
              {totalStats.defense && <span className="text-blue-400">🛡️ {totalStats.defense}</span>}
              {totalStats.health && <span className="text-green-400">❤️ {totalStats.health}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded ${
              activeTab === 'inventory' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            📦 Inventario
          </button>
          <button
            onClick={() => {
              setActiveTab('equipment');
              setSelectedItem(null); // Cerrar sidebar al cambiar a equipamiento
            }}
            className={`px-4 py-2 rounded ${
              activeTab === 'equipment' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            ⚔️ Equipamiento
          </button>
          <button
            onClick={() => {
              setActiveTab('stats');
              setSelectedItem(null); // Cerrar sidebar al cambiar a estadísticas
            }}
            className={`px-4 py-2 rounded ${
              activeTab === 'stats' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            📊 Estadísticas
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex gap-4">
          {/* Main Content */}
          <div className={`flex-1 transition-all duration-300 ${selectedItem ? 'w-2/3' : 'w-full'}`}>
            {activeTab === 'inventory' && (
              <div className="h-full overflow-y-auto p-3">
                <div className={`grid gap-3 max-h-full ${selectedItem ? 'grid-cols-5' : 'grid-cols-6'}`}>
                  {Array.from({ length: inventory.maxSlots }, (_, index) => {
                    const item = inventory.items.find(i => i.slot === index);
                    return (
                      <div
                        key={index}
                        className={`aspect-square border-2 border-dashed border-gray-600 rounded-lg p-2 cursor-pointer hover:border-gray-400 hover:scale-105 transition-all duration-200 ${
                          selectedItem ? 'min-h-[70px] max-h-[90px]' : 'min-h-[80px] max-h-[100px]'
                        } ${
                          item ? getRarityBg(item.rarity) : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        onClick={() => item && handleItemClick(item)}
                      >
                        {item ? (
                          <SlotContent item={item} compact={!!selectedItem} />
                        ) : (
                          <div className={`flex items-center justify-center h-full text-gray-500 font-medium ${
                            selectedItem ? 'text-xs' : 'text-sm'
                          }`}>
                            {index + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="h-full p-4 flex justify-center items-center">
                <div className="relative bg-gray-900 rounded-lg border border-gray-700 w-full max-w-2xl h-full max-h-[600px]">
                  {/* Imagen de fondo del personaje - Centrada */}
                  <img 
                    src="/models/characters/men/men_shape.png" 
                    alt="Character Silhouette" 
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-auto h-auto max-w-full max-h-full object-contain opacity-30"
                  />
                  
                  {/* Equipamiento con mejor distribución */}
                  <div className="relative w-full h-full p-6">
                    {/* Anillos y Collar - Arriba */}
                    <div className="flex justify-center gap-3 mb-6">
                      {['Anillo 1', 'Anillo 2', 'Anillo 3', 'Collar'].map((name, i) => (
                        <div key={i} className={`border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                          selectedItem ? 'w-12 h-12 text-[8px]' : 'w-14 h-14 text-[9px]'
                        }`}>
                          {name}
                        </div>
                      ))}
                    </div>

                    {/* Silueta con slots principales - Más espacio */}
                    <div className="flex justify-center items-center mb-6">
                      <div className="relative w-32 h-40">
                        {/* Casco */}
                        <div className={`absolute top-11 left-12 transform -translate-x-1/3 border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                          selectedItem ? 'w-14 h-14 text-[8px]' : 'w-16 h-16 text-[9px]'
                        }`}>
                          Casco
                        </div>

                        {/* Guantes - En las manos */}
                        <div className={`absolute -left-28 top-32 transform -translate-y-1/2 border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                          selectedItem ? 'w-12 h-12 text-[8px]' : 'w-14 h-14 text-[9px]'
                        }`}>
                          Guante L
                        </div>
                        <div className={`absolute -right-28 top-32 transform -translate-y-1/2 border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                          selectedItem ? 'w-12 h-12 text-[8px]' : 'w-14 h-14 text-[9px]'
                        }`}>
                          Guante R
                        </div>

                        {/* Pecho - Centro */}
                        <div className={`absolute -bottom-16 left-1/2 transform -translate-x-1/2 border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                          selectedItem ? 'w-20 h-24 text-[8px]' : 'w-24 h-28 text-[9px]'
                        }`}>
                          Pecho
                        </div>

                        {/* no hay cinturón Cinturón de momento */}
                        {/* <div className={`absolute -bottom-24 left-1/2 transform -translate-x-1/2 border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                          selectedItem ? 'w-16 h-8 text-[8px]' : 'w-20 h-10 text-[9px]'
                        }`}>
                          Cinturón
                        </div> */}
                      </div>
                    </div>

                    {/* Armas - A los lados */}
                    <div className="absolute left-10 top-1/2 transform -translate-y-1/2">
                      <div className={`border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                        selectedItem ? 'w-12 h-16 text-[8px]' : 'w-14 h-20 text-[9px]'
                      }`}>
                        Arma L
                      </div>
                    </div>
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                      <div className={`border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                        selectedItem ? 'w-12 h-16 text-[8px]' : 'w-14 h-20 text-[9px]'
                      }`}>
                        Arma R
                      </div>
                    </div>

                    {/* Piernas y Botas */}
                    <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex justify-center gap-3">
                      <div className="flex flex-col ">
                      <div className={`border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                        selectedItem ? 'w-16 h-16 text-[8px]' : 'w-20 h-20 text-[9px]'
                      }`}>
                        Piernas
                      </div>
                      <div className={`border-2 border-dashed border-gray-600 rounded bg-gray-800 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:bg-gray-700 transition-all cursor-pointer ${
                        selectedItem ? 'w-16 h-12 text-[8px]' : 'w-20 h-14 text-[9px]'
                      }`}>
                        Botas
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="bg-gray-800 rounded p-4 h-full overflow-y-auto">
                <h3 className="text-white font-bold mb-4">Estadísticas Totales</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(totalStats).map(([stat, value]) => (
                    <div key={stat} className="flex justify-between">
                      <span className="text-gray-300 capitalize">{stat}:</span>
                      <span className="text-white font-bold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Item Details */}
          {selectedItem && (
            <div className="w-80 bg-gray-800 rounded p-4 relative">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">{selectedItem.icon}</span>
                <div>
                  <h3 className={`text-white font-bold ${getRarityColor(selectedItem.rarity)}`}>
                    {selectedItem.name}
                  </h3>
                  <p className="text-xs text-gray-400 capitalize">
                    {selectedItem.rarity} • {selectedItem.type}
                  </p>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4">{selectedItem.description}</p>

              {selectedItem.stats && (
                <div className="mb-4">
                  <h4 className="text-white font-bold mb-2">Estadísticas:</h4>
                  <div className="space-y-1">
                    {Object.entries(selectedItem.stats).map(([stat, value]) => (
                      <div key={stat} className="flex justify-between text-sm">
                        <span className="text-gray-300 capitalize">{stat}:</span>
                        <span className="text-white">+{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {selectedItem.type === 'consumable' && (
                  <button
                    onClick={() => handleUseItem(selectedItem)}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                  >
                    🍎 Usar
                  </button>
                )}

                {['weapon', 'armor', 'tool'].includes(selectedItem.type) && (
                  <button
                    onClick={() => handleEquipItem(selectedItem)}
                    className={`w-full py-2 rounded ${
                      selectedItem.isEquipped
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {selectedItem.isEquipped ? '🔄 Desequipar' : '⚔️ Equipar'}
                  </button>
                )}

                <button
                  onClick={() => handleRemoveItem(selectedItem)}
                  className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
                >
                  🗑️ Remover
                </button>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white">Cargando...</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SlotContent({ item, compact }: { item: InventoryItem; compact: boolean }) {
  const ref = useRef<Object3D | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const visualPath = item.model || undefined;
      const visualType = visualPath?.endsWith('.glb') || visualPath?.endsWith('.gltf') ? 'glb' : undefined;
      if (!visualPath || !visualType) return;
      try {
        const obj = await modelLoader.loadModel({
          name: item.itemId,
          path: visualPath,
          type: 'glb',
          category: 'prop',
          scale: 0.9
        });
        if (!cancelled) ref.current = obj;
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [item]);

  const thumb = (item as InventoryItem).thumb as string | undefined;
  return (
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden">
      {thumb ? (
        <img src={thumb} alt={item.name} className="w-full h-auto object-contain mb-1" />
      ) : (
        <div className={`leading-none mb-1 ${compact ? 'text-lg' : 'text-xl'}`}>{item.icon}</div>
      )}
      <div className={`text-center text-white leading-tight truncate w-full ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
        {item.name}
      </div>
      <div className={`absolute top-1 right-1 bg-yellow-600 text-white px-2 py-0.5 rounded-full font-bold ${
        compact ? 'text-[10px]' : 'text-[11px]'
      }`}>
        {item.quantity}
      </div>
    </div>
  );
}