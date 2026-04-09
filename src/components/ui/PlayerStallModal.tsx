'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ITEMS_CATALOG } from '@/constants/items';
import {
  PRODUCE_STALL_KIOSK,
  PRODUCE_STALL_MAX_LISTINGS,
  PRODUCE_STALL_MAX_PRICE_MAJOR,
  PRODUCE_STALL_MIN_PRICE_MAJOR,
  PRODUCE_STALL_TAX_RATE,
  isProduceStallItemId,
} from '@/constants/playerStall';
import { GameButton } from '@/components/ui/GameButton';
import { EconomyMessages } from '@nexusworld3d/protocol';
import { colyseusClient } from '@/lib/colyseus/client';
import economyClient from '@/lib/colyseus/EconomyClient';
import { parseEconomyWalletAmount } from '@/lib/economy/parseWalletPayload';
import {
  sendStallAddListing,
  sendStallBuy,
  sendStallRemoveListing,
} from '@/lib/housing/playerStallClient';
import { requestHousingSync } from '@/lib/housing/housingClient';
import { inventoryService } from '@/lib/services/inventory';
import { useHousingStore } from '@/store/housingStore';
import { useUIStore } from '@/store/uiStore';

export default function PlayerStallModal() {
  const {
    produceStallModalOpen,
    closeProduceStallModal,
    addNotification,
  } = useUIStore();
  const produceStall = useHousingStore((s) => s.produceStall);
  const ownedPlotId = useHousingStore((s) => s.ownedPlotId);

  const [balance, setBalance] = useState(0);
  const [invTick, setInvTick] = useState(0);
  const [addItemId, setAddItemId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState(12);
  const [buyQty, setBuyQty] = useState<Record<string, number>>({});

  const isOwner = ownedPlotId === PRODUCE_STALL_KIOSK.plotId;
  const listings = produceStall?.listings ?? [];
  const taxPct = Math.round(PRODUCE_STALL_TAX_RATE * 100);

  useEffect(() => {
    if (!produceStallModalOpen) return;
    requestHousingSync(PRODUCE_STALL_KIOSK.mapId);
  }, [produceStallModalOpen]);

  useEffect(() => {
    if (!produceStallModalOpen) return;
    const onWallet = (data: unknown) => {
      setBalance(parseEconomyWalletAmount(data));
    };
    economyClient.on(EconomyMessages.Wallet, onWallet);
    economyClient.requestState();
    const unsub = inventoryService.subscribe(() => {
      setInvTick((n) => n + 1);
    });
    return () => {
      economyClient.off(EconomyMessages.Wallet, onWallet);
      unsub();
    };
  }, [produceStallModalOpen]);

  useEffect(() => {
    if (!produceStallModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProduceStallModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [produceStallModalOpen, closeProduceStallModal]);

  const sellable = useMemo(() => {
    const inv = inventoryService.getInventory();
    const m = new Map<string, number>();
    for (const it of inv.items) {
      if (!it.itemId || !isProduceStallItemId(it.itemId)) continue;
      m.set(it.itemId, (m.get(it.itemId) ?? 0) + it.quantity);
    }
    return [...m.entries()].map(([itemId, qty]) => ({
      itemId,
      qty,
      name: ITEMS_CATALOG[itemId as keyof typeof ITEMS_CATALOG]?.name ?? itemId,
    }));
  }, [produceStallModalOpen, addItemId, invTick]);

  useEffect(() => {
    if (sellable.length > 0 && !addItemId) {
      setAddItemId(sellable[0].itemId);
    }
  }, [sellable, addItemId]);

  if (!produceStallModalOpen) return null;

  const sendGuard = (): boolean => {
    if (!colyseusClient.isConnectedToWorldRoom()) {
      addNotification({
        id: `stall-net-${Date.now()}`,
        type: 'warning',
        title: 'Red',
        message: 'Sin conexión a la sala / Not connected to world room',
        duration: 4000,
        timestamp: new Date(),
      });
      return false;
    }
    return true;
  };

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-amber-500/25 bg-slate-950 p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-amber-100">
              Puesto de productos · Produce stand
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Lote A1 — consumibles (comida, pociones…). Competís con la tienda
              NPC. Impuesto urbano {taxPct}% (retenido del pago del cliente).
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Plot A1 — consumables. Compete with NPC shops. City tax {taxPct}%
              (deducted from buyer payment).
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
            onClick={closeProduceStallModal}
          >
            <X size={20} />
          </button>
        </div>

        {!isOwner ? (
          <p className="mb-3 text-sm text-slate-300">
            Tu saldo / Balance:{' '}
            <span className="font-mono text-amber-200">{balance}</span>
          </p>
        ) : null}

        {listings.length === 0 ? (
          <p className="mb-4 rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
            {isOwner
              ? 'Añade consumibles desde tu inventario. / Add consumables from inventory.'
              : 'No hay ofertas ahora. / No listings right now.'}
          </p>
        ) : (
          <ul className="mb-4 space-y-2">
            {listings.map((l) => {
              const cat = ITEMS_CATALOG[l.itemId as keyof typeof ITEMS_CATALOG];
              const name = cat?.name ?? l.itemId;
              const icon = cat?.icon ?? '📦';
              const q = Math.min(
                l.quantity,
                Math.max(1, buyQty[l.id] ?? 1)
              );
              return (
                <li
                  key={l.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-700/80 bg-slate-900/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="text-base">
                      {icon} {name}
                    </span>
                    <p className="text-xs text-slate-400">
                      Stock {l.quantity} · {l.priceMajor} cr/u ·{' '}
                      {l.priceMajor * q} total ({q} u.)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isOwner ? (
                      <>
                        <input
                          type="number"
                          min={1}
                          max={l.quantity}
                          className="w-16 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm"
                          value={buyQty[l.id] ?? 1}
                          onChange={(e) =>
                            setBuyQty((prev) => ({
                              ...prev,
                              [l.id]: Math.max(
                                1,
                                Math.min(
                                  l.quantity,
                                  Math.floor(Number(e.target.value)) || 1
                                )
                              ),
                            }))
                          }
                        />
                        <GameButton
                          type="button"
                          variant="classic"
                          className="!py-1.5 text-sm"
                          onClick={() => {
                            if (!sendGuard()) return;
                            const n = Math.min(
                              l.quantity,
                              Math.max(1, buyQty[l.id] ?? 1)
                            );
                            sendStallBuy(l.id, n);
                          }}
                        >
                          Comprar / Buy
                        </GameButton>
                      </>
                    ) : (
                      <GameButton
                        type="button"
                        variant="classic"
                        className="!border-rose-500/40 !py-1.5 text-sm text-rose-200"
                        onClick={() => {
                          if (!sendGuard()) return;
                          sendStallRemoveListing(l.id);
                        }}
                      >
                        Quitar / Remove
                      </GameButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {isOwner ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
            <h3 className="mb-2 text-sm font-medium text-emerald-200">
              Surte el puesto / Stock your stand
            </h3>
            <p className="mb-3 text-xs text-slate-400">
              Máx. {PRODUCE_STALL_MAX_LISTINGS} anuncios. Precio{' '}
              {PRODUCE_STALL_MIN_PRICE_MAJOR}–{PRODUCE_STALL_MAX_PRICE_MAJOR}{' '}
              créditos.
            </p>
            {sellable.length === 0 ? (
              <p className="text-sm text-slate-500">
                No tienes consumibles vendibles en el inventario.
              </p>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-slate-400">
                  Ítem / Item
                  <select
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-white"
                    value={addItemId}
                    onChange={(e) => setAddItemId(e.target.value)}
                  >
                    {sellable.map((o) => (
                      <option key={o.itemId} value={o.itemId}>
                        {o.name} (×{o.qty})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex w-20 flex-col gap-1 text-xs text-slate-400">
                  Cant. / Qty
                  <input
                    type="number"
                    min={1}
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
                    value={addQty}
                    onChange={(e) =>
                      setAddQty(Math.max(1, Math.floor(Number(e.target.value)) || 1))
                    }
                  />
                </label>
                <label className="flex w-24 flex-col gap-1 text-xs text-slate-400">
                  Precio / Price
                  <input
                    type="number"
                    min={PRODUCE_STALL_MIN_PRICE_MAJOR}
                    max={PRODUCE_STALL_MAX_PRICE_MAJOR}
                    className="rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm"
                    value={addPrice}
                    onChange={(e) =>
                      setAddPrice(
                        Math.max(
                          PRODUCE_STALL_MIN_PRICE_MAJOR,
                          Math.min(
                            PRODUCE_STALL_MAX_PRICE_MAJOR,
                            Math.floor(Number(e.target.value)) || 1
                          )
                        )
                      )
                    }
                  />
                </label>
                <GameButton
                  type="button"
                  variant="classic"
                  className="!border-emerald-500/40 !py-2 text-emerald-100"
                  onClick={() => {
                    if (!sendGuard()) return;
                    const max =
                      sellable.find((s) => s.itemId === addItemId)?.qty ?? 0;
                    const q = Math.min(addQty, max);
                    if (q < 1) return;
                    sendStallAddListing(addItemId, q, addPrice);
                  }}
                >
                  Publicar / List
                </GameButton>
              </div>
            )}
          </div>
        ) : null}

        <GameButton
          type="button"
          variant="classic"
          className="mt-6 w-full !py-2"
          onClick={closeProduceStallModal}
        >
          Cerrar / Close
        </GameButton>
      </div>
    </div>
  );
}
