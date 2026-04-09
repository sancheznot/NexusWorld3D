'use client';

import { useEffect, useState } from 'react';
import { EconomyMessages } from '@nexusworld3d/protocol';
import economyClient from '@/lib/colyseus/EconomyClient';
import { parseEconomyWalletAmount } from '@/lib/economy/parseWalletPayload';
import { inventoryService } from '@/lib/services/inventory';
import { getHousingPlotById } from '@/constants/housingPlots';
import {
  purchaseHousingPlot,
  requestHousingSync,
} from '@/lib/housing/housingClient';
import { colyseusClient } from '@/lib/colyseus/client';
import { useUIStore } from '@/store/uiStore';
import { useHousingStore } from '@/store/housingStore';

export default function HousingPlotModal() {
  const {
    housingPlotModalOpen,
    housingPlotModalPlotId,
    closeHousingPlotModal,
    addNotification,
  } = useUIStore();
  const ownedPlotId = useHousingStore((s) => s.ownedPlotId);
  const [balance, setBalance] = useState(() =>
    inventoryService.getInventory().gold
  );

  useEffect(() => {
    if (!housingPlotModalOpen) return;
    const onWallet = (data: unknown) => {
      setBalance(parseEconomyWalletAmount(data));
    };
    economyClient.on(EconomyMessages.Wallet, onWallet);
    economyClient.requestState();
    const sync = () => setBalance(inventoryService.getInventory().gold);
    sync();
    const unsub = inventoryService.subscribe(sync);
    return () => {
      economyClient.off(EconomyMessages.Wallet, onWallet);
      unsub();
    };
  }, [housingPlotModalOpen]);

  useEffect(() => {
    if (!housingPlotModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHousingPlotModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [housingPlotModalOpen, closeHousingPlotModal]);

  if (!housingPlotModalOpen || !housingPlotModalPlotId) return null;

  const plot = getHousingPlotById(housingPlotModalPlotId);
  if (!plot) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950 p-6 text-white shadow-xl">
          <p className="text-sm text-rose-300">Lote desconocido / Unknown plot</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            onClick={closeHousingPlotModal}
          >
            Cerrar / Close
          </button>
        </div>
      </div>
    );
  }

  const ownsThis = ownedPlotId === plot.id;
  const ownsOther = ownedPlotId != null && ownedPlotId !== plot.id;

  const buy = () => {
    if (!colyseusClient.isConnectedToWorldRoom()) {
      addNotification({
        id: `hp-${Date.now()}`,
        type: 'warning',
        title: 'Lote',
        message: 'Conéctate al mundo primero.',
        timestamp: new Date(),
        duration: 4000,
      });
      return;
    }
    requestHousingSync(plot.mapId);
    purchaseHousingPlot(plot.id);
    addNotification({
      id: `hp-${Date.now()}`,
      type: 'info',
      title: 'Lote',
      message: 'Compra enviada — revisa saldo y notificaciones.',
      timestamp: new Date(),
      duration: 5000,
    });
    closeHousingPlotModal();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="housing-plot-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-slate-950/95 p-6 text-white shadow-2xl shadow-emerald-900/20">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="housing-plot-title"
              className="text-lg font-bold tracking-tight text-emerald-100"
            >
              {plot.labelEs}
            </h2>
            <p className="text-xs text-slate-400">{plot.labelEn}</p>
          </div>
          <button
            type="button"
            onClick={closeHousingPlotModal}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <dl className="mb-4 space-y-2 text-sm">
          <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
            <dt className="text-slate-400">Precio / Price</dt>
            <dd className="font-mono text-amber-200">
              {plot.priceMajor} créditos
            </dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
            <dt className="text-slate-400">Tu saldo / Balance</dt>
            <dd className="font-mono text-slate-200">{balance}</dd>
          </div>
          <div className="text-xs text-slate-500">
            Bounds XZ: [{plot.minX}–{plot.maxX}], Z [{plot.minZ}–{plot.maxZ}]
          </div>
        </dl>

        {ownsThis ? (
          <p className="mb-4 text-sm text-emerald-300">
            Ya es tu lote. Puedes construir aquí. / This plot is already yours.
          </p>
        ) : ownsOther ? (
          <p className="mb-4 text-sm text-amber-200">
            Ya tienes otro lote asignado. / You already own a different plot.
          </p>
        ) : (
          <p className="mb-4 text-sm text-slate-300">
            Compra desde el mundo (sin pausa). Errores de saldo llegan como aviso.
            / Buy from the world; insufficient funds show as notifications.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!ownsThis && !ownsOther ? (
            <button
              type="button"
              onClick={buy}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
            >
              Comprar / Buy
            </button>
          ) : null}
          <button
            type="button"
            onClick={closeHousingPlotModal}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10"
          >
            Cerrar / Close
          </button>
        </div>
      </div>
    </div>
  );
}
