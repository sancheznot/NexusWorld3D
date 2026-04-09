'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useUIStore } from '@/store/uiStore';
import { InventoryItem, ItemRarity } from '@/types/inventory.types';
import { inventoryService } from '@/lib/services/inventory';
import { modelLoader } from '@/lib/three/modelLoader';
import type { Object3D } from 'three';
import { tryDropInventoryItemById } from '@/lib/gameplay/dropActions';
import { GAME_KEYBINDINGS } from '@/config/gameKeybindings';
import { colyseusClient } from '@/lib/colyseus/client';
import { inventoryClient } from '@/lib/colyseus/InventoryClient';
import { usePlayerStore } from '@/store/playerStore';
import {
  RPG_INITIAL_UNSPENT_POINTS,
  RPG_STAT_IDS,
  RPG_STAT_META,
  RPG_STAT_POINTS_PER_LEVEL,
  type RpgStatId,
} from '@/constants/rpgProgression';

const INV_SLOT_DRAG_MIME = 'application/x-hh-inv-slot';

/** ES: Botón primario estilo HUD del juego. EN: Primary game-style control. */
function BtnPrimary({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`rounded-xl border border-emerald-400/35 bg-emerald-600/90 px-3 py-2 text-sm font-bold text-white shadow-[0_4px_20px_rgba(16,185,129,0.25)] transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function BtnSecondary({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/[0.14] active:scale-[0.98] disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function BtnCyan({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`rounded-xl border border-cyan-400/35 bg-cyan-600/90 px-3 py-2 text-sm font-bold text-white transition hover:bg-cyan-500 active:scale-[0.98] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function InventoryUI() {
  const { isInventoryOpen, toggleInventory, addNotification } = useUIStore();
  const rpgSync = usePlayerStore((s) => s.rpgSync);
  const storeLevel = usePlayerStore((s) => s.level);
  const storeExp = usePlayerStore((s) => s.experience);

  const {
    inventory,
    isLoading,
    removeItem,
    equipItem,
    unequipItem,
    consumeItem,
    addTestItems,
    clearInventory,
    getTotalStats,
  } = useInventory();

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'equipment' | 'stats'>('inventory');
  const [dropQtyInput, setDropQtyInput] = useState('1');

  useEffect(() => {
    setDropQtyInput('1');
  }, [selectedItem?.id]);

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

  const handleDropWorld = (item: InventoryItem, quantity: number = 1) => {
    if (item.isEquipped) {
      addNotification({
        id: `inv-${Date.now()}`,
        type: 'warning',
        title: 'Inventario',
        message: 'Desequipa el objeto antes de soltarlo.',
        timestamp: new Date(),
        duration: 3500,
      });
      return;
    }
    const qty = Math.max(1, Math.min(item.quantity, Math.floor(quantity)));
    if (tryDropInventoryItemById(item.id, qty)) {
      addNotification({
        id: `inv-${Date.now()}`,
        type: 'success',
        title: 'Mundo',
        message:
          qty >= item.quantity
            ? `Has soltado todo: ${item.name}`
            : `Has soltado ${qty}× ${item.name}`,
        timestamp: new Date(),
        duration: 2800,
      });
      setSelectedItem(null);
    } else {
      addNotification({
        id: `inv-${Date.now()}`,
        type: 'error',
        title: 'Soltar',
        message: 'No se pudo soltar (¿conectado a la sala?).',
        timestamp: new Date(),
        duration: 3500,
      });
    }
  };

  const handleDestroyLocal = (item: InventoryItem) => {
    if (confirm(`¿Destruir ${item.name} solo en cliente? (no recomendado)`)) {
      removeItem(item.id, 1);
    }
  };

  const getRarityColor = (rarity: ItemRarity) => {
    const colors = {
      common: 'text-slate-300',
      uncommon: 'text-emerald-300',
      rare: 'text-cyan-300',
      epic: 'text-violet-300',
      legendary: 'text-amber-300',
      mythic: 'text-fuchsia-300',
    };
    return colors[rarity];
  };

  const getRarityBg = (rarity: ItemRarity) => {
    const colors = {
      common: 'bg-slate-800/70',
      uncommon: 'bg-emerald-950/60',
      rare: 'bg-cyan-950/55',
      epic: 'bg-violet-950/55',
      legendary: 'bg-amber-950/50',
      mythic: 'bg-fuchsia-950/50',
    };
    return colors[rarity];
  };

  const totalStats = getTotalStats();

  const allocateStat = (stat: RpgStatId) => {
    const room = colyseusClient.getSocket();
    if (!room?.connection.isOpen) {
      addNotification({
        id: `rpg-${Date.now()}`,
        type: 'warning',
        title: 'Progresión',
        message: 'Conéctate a la sala del mundo para asignar stats.',
        timestamp: new Date(),
        duration: 4000,
      });
      return;
    }
    room.send('rpg:allocate-stat', { stat });
  };

  const xpToNext = rpgSync?.xpToNext ?? 1;
  const curExp = rpgSync?.experience ?? storeExp;
  const curLevel = rpgSync?.level ?? storeLevel;
  const xpPct = Math.min(100, Math.max(0, (curExp / Math.max(1, xpToNext)) * 100));

  const handleInventorySlotDrop = (e: React.DragEvent, toSlot: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(INV_SLOT_DRAG_MIME);
    const from = parseInt(raw, 10);
    if (!Number.isFinite(from) || from === toSlot) return;
    const room = colyseusClient.getSocket();
    if (!room?.connection.isOpen) {
      addNotification({
        id: `inv-dnd-${Date.now()}`,
        type: 'warning',
        title: 'Inventario',
        message: 'Conéctate al mundo para mover objetos entre ranuras.',
        timestamp: new Date(),
        duration: 3500,
      });
      return;
    }
    inventoryClient.swapInventorySlots(from, toSlot);
  };

  const keyHint = (
    <>
      {GAME_KEYBINDINGS.find((b) => b.id === 'interact_pickup')?.label ?? 'E'} recoger ·{' '}
      {GAME_KEYBINDINGS.find((b) => b.id === 'drop_world')?.label ?? 'G'} soltar ·{' '}
      {GAME_KEYBINDINGS.find((b) => b.id === 'use_hotbar')?.label ?? 'Q'} usar ·{' '}
      {GAME_KEYBINDINGS.find((b) => b.id === 'crafting')?.label ?? 'C'} craft ·{' '}
      {GAME_KEYBINDINGS.find((b) => b.id === 'inventory')?.label ?? 'I'} cerrar
    </>
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex justify-end p-3 sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-label="Inventario"
    >
      <div
        data-game-scroll-region
        className="pointer-events-auto flex max-h-[min(82vh,760px)] w-full max-w-[min(440px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950/50 shadow-[0_12px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-white/10 px-4 pb-3 pt-3">
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
              Inventario
            </h2>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-400">{keyHint}</p>
            <p className="mt-0.5 text-[9px] text-slate-500">
              Arrastra un objeto a otra ranura para moverlo (requiere conexión al mundo).
            </p>
          </div>
          <button
            type="button"
            onClick={toggleInventory}
            className="shrink-0 rounded-xl border border-white/15 bg-white/10 p-2 text-slate-300 transition hover:bg-white/15 hover:text-white"
            aria-label="Cerrar inventario"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Dev tools — compact row */}
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-white/5 px-3 py-2">
          <button
            type="button"
            onClick={addTestItems}
            className="rounded-lg border border-cyan-500/25 bg-cyan-600/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/50"
          >
            Test
          </button>
          <button
            type="button"
            title="Solo cliente: no cambia el límite del servidor. El peso/ranuras reales vienen del RPG (stats/nivel) al sincronizar."
            onClick={() => {
              const currentLevel =
                inventoryService.getInventory().maxSlots === 20
                  ? 1
                  : Math.floor((inventoryService.getInventory().maxSlots - 20) / 2) + 1;
              const newLevel = currentLevel + 1;
              inventoryService.updatePlayerLevel(newLevel);
            }}
            className="rounded-lg border border-emerald-500/25 bg-emerald-600/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/50"
          >
            +Nivel
          </button>
          <button
            type="button"
            onClick={clearInventory}
            className="rounded-lg border border-red-500/25 bg-red-600/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-100 transition hover:bg-red-500/50"
          >
            Limpiar
          </button>
        </div>

        {/* Stats */}
        <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
            <span className="font-mono font-bold text-amber-300">₿ {inventory.gold}</span>
            <span className="text-slate-300">
              📦 {inventory.usedSlots}/{inventory.maxSlots}
            </span>
            <span
              className={
                inventory.currentWeight >= inventory.maxWeight
                  ? 'font-bold text-red-400'
                  : inventory.currentWeight > inventory.maxWeight * 0.9
                    ? 'text-amber-400'
                    : 'text-slate-300'
              }
            >
              ⚖️ {inventory.currentWeight.toFixed(1)}/{inventory.maxWeight} kg
              {inventory.currentWeight >= inventory.maxWeight && ' 🔒'}
            </span>
            {totalStats.damage ? (
              <span className="text-rose-300">⚔️ {totalStats.damage}</span>
            ) : null}
            {totalStats.defense ? (
              <span className="text-cyan-300">🛡️ {totalStats.defense}</span>
            ) : null}
            {totalStats.health ? (
              <span className="text-emerald-300">❤️ {totalStats.health}</span>
            ) : null}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1.5 px-3 pt-2">
          {(
            [
              ['inventory', '📦 Inventario'],
              ['equipment', '⚔️ Equipo'],
              ['stats', '📊 Stats'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                if (id !== 'inventory') setSelectedItem(null);
              }}
              className={`flex-1 rounded-xl border px-2 py-2 text-center text-[11px] font-bold transition sm:text-xs ${
                activeTab === id
                  ? 'border-emerald-400/45 bg-emerald-500/20 text-emerald-100 shadow-[inset_0_0_12px_rgba(16,185,129,0.12)]'
                  : 'border-white/10 bg-black/20 text-slate-400 hover:border-white/15 hover:bg-white/[0.06] hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          {activeTab === 'inventory' && (
            <>
              <div
                data-game-scroll-region
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                tabIndex={0}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {Array.from({ length: inventory.maxSlots }, (_, index) => {
                    const item = inventory.items.find((i) => i.slot === index);
                    return (
                      <div
                        key={index}
                        role="presentation"
                        className="aspect-square min-h-0"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => handleInventorySlotDrop(e, index)}
                      >
                        <button
                          type="button"
                          draggable={!!item}
                          onDragStart={
                            item
                              ? (e) => {
                                  e.dataTransfer.setData(INV_SLOT_DRAG_MIME, String(index));
                                  e.dataTransfer.effectAllowed = 'move';
                                }
                              : undefined
                          }
                          className={`flex h-full min-h-0 w-full flex-col rounded-xl border-2 border-dashed p-1.5 transition ${
                            item
                              ? `${getRarityBg(item.rarity)} cursor-grab border-white/20 active:cursor-grabbing hover:border-emerald-400/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]`
                              : 'cursor-default border-white/12 bg-black/25 hover:border-white/25'
                          } ${selectedItem?.id === item?.id ? 'ring-2 ring-emerald-400/60' : ''}`}
                          onClick={() => item && handleItemClick(item)}
                          disabled={!item}
                        >
                          {item ? (
                            <SlotContent item={item} compact />
                          ) : (
                            <span className="flex h-full items-center justify-center text-[10px] font-mono text-slate-500">
                              {index + 1}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedItem && (
                <div className="shrink-0 rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-2xl leading-none">{selectedItem.icon}</span>
                      <div className="min-w-0">
                        <h3
                          className={`truncate text-sm font-black ${getRarityColor(selectedItem.rarity)}`}
                        >
                          {selectedItem.name}
                        </h3>
                        <p className="text-[10px] capitalize text-slate-500">
                          {selectedItem.rarity} · {selectedItem.type}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedItem(null)}
                      className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-white/10 hover:text-white"
                      aria-label="Cerrar detalle"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="mb-3 line-clamp-3 text-[11px] leading-relaxed text-slate-400">
                    {selectedItem.description}
                  </p>
                  {selectedItem.stats && (
                    <div className="mb-3 space-y-0.5 text-[10px]">
                      {Object.entries(selectedItem.stats).map(([stat, value]) => (
                        <div key={stat} className="flex justify-between text-slate-400">
                          <span className="capitalize">{stat}</span>
                          <span className="font-mono text-emerald-200/90">+{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {typeof selectedItem.maxDurability === 'number' &&
                    selectedItem.maxDurability > 0 && (
                      <div className="mb-3">
                        <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                          <span>Durabilidad</span>
                          <span className="font-mono text-emerald-200/90">
                            {Math.max(
                              0,
                              Math.floor(
                                selectedItem.durability ?? selectedItem.maxDurability
                              )
                            )}{' '}
                            / {selectedItem.maxDurability}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-amber-500 transition-[width]"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  ((selectedItem.durability ?? selectedItem.maxDurability) /
                                    selectedItem.maxDurability) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  <div className="flex flex-col gap-1.5">
                    {selectedItem.type === 'consumable' && (
                      <BtnPrimary onClick={() => handleUseItem(selectedItem)}>🍎 Usar</BtnPrimary>
                    )}
                    {['weapon', 'armor', 'tool'].includes(selectedItem.type) && (
                      <BtnCyan onClick={() => handleEquipItem(selectedItem)}>
                        {selectedItem.isEquipped ? '🔄 Desequipar' : '⚔️ Equipar'}
                      </BtnCyan>
                    )}
                    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-2">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        Soltar al suelo
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <BtnSecondary
                          className="!px-2 !py-1.5 !text-[11px]"
                          onClick={() => handleDropWorld(selectedItem, 1)}
                        >
                          1
                        </BtnSecondary>
                        <BtnSecondary
                          className="!px-2 !py-1.5 !text-[11px]"
                          onClick={() =>
                            handleDropWorld(
                              selectedItem,
                              Math.max(1, Math.ceil(selectedItem.quantity / 2))
                            )
                          }
                        >
                          Mitad
                        </BtnSecondary>
                        <BtnSecondary
                          className="!px-2 !py-1.5 !text-[11px]"
                          onClick={() => handleDropWorld(selectedItem, selectedItem.quantity)}
                        >
                          Todo
                        </BtnSecondary>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={selectedItem.quantity}
                          value={dropQtyInput}
                          onChange={(e) => setDropQtyInput(e.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-center font-mono text-xs text-white outline-none focus:border-emerald-500/50"
                          aria-label="Cantidad a soltar"
                        />
                        <BtnSecondary
                          className="shrink-0 !px-3 !py-1.5 !text-[11px]"
                          onClick={() => {
                            const n = parseInt(dropQtyInput, 10);
                            const qty = Number.isFinite(n)
                              ? n
                              : 1;
                            handleDropWorld(selectedItem, qty);
                          }}
                        >
                          Soltar N
                        </BtnSecondary>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDestroyLocal(selectedItem)}
                      className="rounded-lg py-1.5 text-center text-[10px] text-red-400/90 underline-offset-2 hover:text-red-300 hover:underline"
                    >
                      Destruir (solo cliente)
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'equipment' && (
            <div
              data-game-scroll-region
              className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain rounded-xl border border-white/10 bg-black/25 p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              tabIndex={0}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="relative mx-auto max-w-sm rounded-xl border border-white/10 bg-slate-950/40">
                <img
                  src="/models/characters/men/men_shape.png"
                  alt=""
                  className="pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain opacity-25"
                />
                <div className="relative space-y-3 p-4 text-[9px] text-slate-500">
                  <div className="flex justify-center gap-2">
                    {['A1', 'A2', 'A3', 'Collar'].map((name, i) => (
                      <div
                        key={i}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center">
                    <div className="relative h-36 w-28">
                      <div className="absolute left-1/2 top-2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30">
                        Casco
                      </div>
                      <div className="absolute -left-16 top-20 flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30">
                        GL
                      </div>
                      <div className="absolute -right-16 top-20 flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30">
                        GR
                      </div>
                      <div className="absolute bottom-6 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30">
                        Pecho
                      </div>
                      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col gap-1">
                        <div className="flex h-12 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30">
                          Piernas
                        </div>
                        <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30">
                          Botas
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between px-2">
                    <div className="flex h-14 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30">
                      Arma L
                    </div>
                    <div className="flex h-14 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/30">
                      Arma R
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div
              data-game-scroll-region
              className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain rounded-xl border border-white/10 bg-black/25 p-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              tabIndex={0}
              onWheel={(e) => e.stopPropagation()}
            >
              <h3 className="mb-1 text-xs font-black uppercase tracking-wide text-emerald-200/90">
                Progresión / Stats
              </h3>
              <p className="mb-3 text-[10px] leading-snug text-slate-500">
                Ganas EXP al <span className="text-emerald-400">talar árboles</span> y al{' '}
                <span className="text-cyan-400">recoger ítems</span> del mundo. Cada nivel
                otorga {RPG_STAT_POINTS_PER_LEVEL} puntos extra. Los personajes nuevos empiezan
                con {RPG_INITIAL_UNSPENT_POINTS} puntos para repartir (estilo ARK / MU).
              </p>

              {rpgSync ? (
                <>
                  <div className="mb-4 rounded-xl border border-emerald-500/25 bg-black/30 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-black text-white">Nivel {curLevel}</span>
                      <span className="font-mono text-[11px] text-emerald-300/90">
                        EXP {curExp} / {xpToNext}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-500 transition-[width] duration-300"
                        style={{ width: `${xpPct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500">
                      Puntos libres:{' '}
                      <span className="font-mono font-bold text-amber-300">
                        {rpgSync.unspentStatPoints}
                      </span>
                      {' · '}
                      EXP +{(rpgSync.xpGainMul * 100 - 100).toFixed(1)}% (suerte)
                    </p>
                  </div>

                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Atributos (clic +)
                  </h4>
                  <ul className="mb-4 space-y-2">
                    {RPG_STAT_IDS.map((id) => {
                      const meta = RPG_STAT_META[id];
                      const pts = rpgSync.alloc[id];
                      return (
                        <li
                          key={id}
                          className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/25 px-2 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-white">{meta.nameEs}</span>
                              <span className="font-mono text-[11px] text-cyan-300">{pts}</span>
                            </div>
                            <p className="mt-0.5 text-[9px] leading-snug text-slate-500">
                              {meta.descEs}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={rpgSync.unspentStatPoints < 1}
                            onClick={() => allocateStat(id)}
                            className="shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-600/50 px-2 py-1 text-[11px] font-black text-white transition hover:bg-emerald-500/80 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            +
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Bonos activos
                  </h4>
                  <ul className="mb-4 space-y-1 text-[10px] text-slate-400">
                    <li>
                      ⚡ Velocidad ×{rpgSync.moveSpeedMul.toFixed(2)} (agilidad)
                    </li>
                    <li>
                      🍖 Hambre ×{rpgSync.hungerDrainMul.toFixed(2)} intervalo (resistencia)
                    </li>
                    <li>
                      ⚖️ Carga {rpgSync.maxWeight} kg · {rpgSync.maxSlots} slots
                    </li>
                    <li>
                      ❤️ +{rpgSync.maxHealthBonus} vida máx. (vitalidad)
                    </li>
                    <li>⚔️ +{rpgSync.damageBonus} daño base (fuerza)</li>
                  </ul>
                </>
              ) : colyseusClient.isConnectedToWorldRoom() ? (
                <p className="mb-4 rounded-lg border border-cyan-500/25 bg-cyan-950/35 px-2 py-2 text-[11px] text-cyan-100/95">
                  Sincronizando progresión con el servidor… Si no ves tus stats en unos segundos,
                  cierra y vuelve a abrir el inventario (I).
                </p>
              ) : (
                <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-950/30 px-2 py-2 text-[11px] text-amber-200/90">
                  Entra a la sala del mundo 3D (desde el lobby) para cargar nivel, EXP y atributos.
                </p>
              )}

              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Equipo (ítems)
              </h4>
              <div className="space-y-1.5 text-[11px]">
                {Object.keys(totalStats).length === 0 ? (
                  <p className="text-slate-500">Sin bonos de equipo equipados.</p>
                ) : (
                  Object.entries(totalStats).map(([stat, value]) => (
                    <div
                      key={stat}
                      className="flex justify-between rounded-lg border border-white/5 bg-black/20 px-2 py-1.5"
                    >
                      <span className="capitalize text-slate-400">{stat}</span>
                      <span className="font-mono font-bold text-white">{value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm">
            <span className="text-sm font-bold text-emerald-200">Cargando…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SlotContent({ item, compact }: { item: InventoryItem; compact: boolean }) {
  const ref = useRef<Object3D | null>(null);
  const maxD = item.maxDurability;
  const curD = item.durability ?? maxD;
  const durPct =
    typeof maxD === 'number' && maxD > 0
      ? Math.min(100, Math.max(0, ((curD ?? 0) / maxD) * 100))
      : null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const visualPath = item.model || undefined;
      const visualType =
        visualPath?.endsWith('.glb') || visualPath?.endsWith('.gltf') ? 'glb' : undefined;
      if (!visualPath || !visualType) return;
      try {
        const obj = await modelLoader.loadModel({
          name: item.itemId,
          path: visualPath,
          type: 'glb',
          category: 'prop',
          scale: 0.9,
        });
        if (!cancelled) ref.current = obj;
      } catch {}
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [item]);

  const thumb = (item as InventoryItem).thumb as string | undefined;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {thumb ? (
        <img src={thumb} alt="" className="mb-0.5 max-h-[55%] w-full object-contain" />
      ) : (
        <div className={`mb-0.5 leading-none ${compact ? 'text-lg' : 'text-xl'}`}>{item.icon}</div>
      )}
      <div
        className={`w-full truncate text-center font-semibold leading-tight text-white/95 ${
          compact ? 'text-[8px]' : 'text-[9px]'
        }`}
      >
        {item.name}
      </div>
      {Number.isFinite(item.quantity) && item.quantity > 1 && (
        <div
          className={`absolute right-0.5 top-0.5 rounded-md border border-amber-400/40 bg-amber-600/90 px-1 font-mono font-bold text-white ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          {Math.floor(item.quantity)}
        </div>
      )}
      {durPct !== null && (
        <div
          className={`absolute bottom-0 left-0.5 right-0.5 rounded-sm bg-black/55 ${
            compact ? 'h-[3px]' : 'h-1'
          }`}
          title={`Durabilidad ${Math.floor(curD ?? 0)}/${maxD}`}
        >
          <div
            className={`h-full rounded-sm ${
              durPct < 25 ? 'bg-red-500/95' : durPct < 50 ? 'bg-amber-400/95' : 'bg-emerald-500/95'
            }`}
            style={{ width: `${durPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
