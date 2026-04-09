'use client';

import { useEffect } from 'react';
import { WorldMessages } from '@nexusworld3d/protocol';
import { colyseusClient } from '@/lib/colyseus/client';
import itemsClient from '@/lib/colyseus/ItemsClient';
import { useUIStore } from '@/store/uiStore';
import { ITEMS_CATALOG } from '@/constants/items';
import type { ItemCollectedResponse } from '@/types/items-sync.types';

type ChopResult = {
  ok?: boolean | number | string;
  treeId?: string;
  message?: string;
  felled?: boolean;
  logQty?: number;
  logsThisHit?: number;
  /** ES: Troncos que realmente entraron al inventario (servidor). EN: Logs actually granted server-side. */
  logsGranted?: number;
  hitsRemaining?: number;
  treeHealthRemainingPct?: number;
  maxHits?: number;
};

function chopHitOk(d: ChopResult): boolean {
  const ok = d?.ok;
  if (ok === true || ok === 1) return true;
  if (typeof ok === 'string' && ok.toLowerCase() === 'true') return true;
  return false;
}

/**
 * ES: Toasts a la derecha (+cantidad, icono, nombre) — tala, recogida mundo, etc.
 * EN: Right-side item gain toasts.
 */
export default function ItemGainHud() {
  const toasts = useUIStore((s) => s.itemGainToasts);
  const pushItemGainToast = useUIStore((s) => s.pushItemGainToast);

  useEffect(() => {
    const onChop = (raw: unknown) => {
      const d = raw as ChopResult;
      if (!chopHitOk(d)) return;
      const qty = Math.floor(
        Number(
          d.logsGranted ?? d.logQty ?? d.logsThisHit ?? 0
        )
      );
      if (!Number.isFinite(qty) || qty <= 0) return;
      const cat = ITEMS_CATALOG.material_wood_log;
      const hp =
        typeof d.treeHealthRemainingPct === 'number'
          ? Math.max(0, Math.min(100, Math.round(d.treeHealthRemainingPct)))
          : null;
      const subtitle =
        hp != null
          ? d.felled
            ? '¡Árbol derribado!'
            : `Árbol · ${hp}% restante`
          : undefined;
      useUIStore.getState().pushItemGainToast({
        itemId: 'material_wood_log',
        name: cat?.name ?? 'Tronco',
        icon: cat?.icon ?? '🪵',
        quantity: qty,
        subtitle,
        variant: 'chop',
      });
    };
    colyseusClient.on(WorldMessages.TreeChopResult, onChop);
    return () => {
      colyseusClient.off(WorldMessages.TreeChopResult, onChop);
    };
  }, []);

  useEffect(() => {
    const onMine = (raw: unknown) => {
      const d = raw as {
        ok?: boolean | number | string;
        rockId?: string;
        stoneGranted?: number;
        stoneQty?: number;
        stoneThisHit?: number;
        rockHealthRemainingPct?: number;
        depleted?: boolean;
      };
      if (!chopHitOk(d)) return;
      const qty = Math.floor(
        Number(d.stoneGranted ?? d.stoneQty ?? d.stoneThisHit ?? 0)
      );
      if (!Number.isFinite(qty) || qty <= 0) return;
      const cat = ITEMS_CATALOG.material_stone_raw;
      const hp =
        typeof d.rockHealthRemainingPct === 'number'
          ? Math.max(0, Math.min(100, Math.round(d.rockHealthRemainingPct)))
          : null;
      const subtitle =
        hp != null
          ? d.depleted
            ? '¡Yacimiento agotado!'
            : `Roca · ${hp}% restante`
          : undefined;
      useUIStore.getState().pushItemGainToast({
        itemId: 'material_stone_raw',
        name: cat?.name ?? 'Piedra bruta',
        icon: cat?.icon ?? '🪨',
        quantity: qty,
        subtitle,
        variant: 'chop',
      });
    };
    colyseusClient.on(WorldMessages.RockMineResult, onMine);
    return () => {
      colyseusClient.off(WorldMessages.RockMineResult, onMine);
    };
  }, []);

  useEffect(() => {
    const onHarvest = (raw: unknown) => {
      const d = raw as {
        ok?: boolean;
        grants?: { itemId: string; quantity: number }[];
      };
      if (!d?.ok || !Array.isArray(d.grants)) return;
      for (const g of d.grants) {
        const qty = Math.max(0, Math.floor(Number(g.quantity) || 0));
        const itemId = typeof g.itemId === 'string' ? g.itemId : '';
        if (qty <= 0 || !itemId) continue;
        const cat = ITEMS_CATALOG[itemId as keyof typeof ITEMS_CATALOG];
        pushItemGainToast({
          itemId,
          name: cat?.name ?? itemId,
          icon: cat?.icon ?? '📦',
          quantity: qty,
          variant: 'chop',
        });
      }
    };
    colyseusClient.on(WorldMessages.HarvestNodeResult, onHarvest);
    return () => {
      colyseusClient.off(WorldMessages.HarvestNodeResult, onHarvest);
    };
  }, [pushItemGainToast]);

  useEffect(() => {
    const onCollected = (data: ItemCollectedResponse) => {
      const it = data.item;
      if (!it) return;
      const cat = ITEMS_CATALOG[it.itemId as keyof typeof ITEMS_CATALOG];
      pushItemGainToast({
        itemId: it.itemId,
        name: it.name,
        icon: it.icon || cat?.icon || '📦',
        quantity: Math.max(1, it.quantity ?? 1),
      });
    };
    itemsClient.onItemsCollected(onCollected);
    return () => {
      itemsClient.off('items:collected', onCollected);
    };
  }, [pushItemGainToast]);

  useEffect(() => {
    const onFarm = (raw: unknown) => {
      const d = raw as {
        ok?: boolean;
        action?: string;
        itemId?: string;
        quantity?: number;
      };
      if (!d?.ok || d.action !== 'harvested') return;
      const itemId = typeof d.itemId === 'string' ? d.itemId : '';
      const qty = Math.max(1, Math.floor(Number(d.quantity) || 0));
      if (!itemId || qty <= 0) return;
      const cat = ITEMS_CATALOG[itemId as keyof typeof ITEMS_CATALOG];
      pushItemGainToast({
        itemId,
        name: cat?.name ?? itemId,
        icon: cat?.icon ?? '📦',
        quantity: qty,
        subtitle: 'Cosecha / Harvest',
        variant: 'chop',
      });
    };
    colyseusClient.on('farm:result', onFarm);
    return () => {
      colyseusClient.off('farm:result', onFarm);
    };
  }, [pushItemGainToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-1/2 z-[60] flex max-h-[70vh] w-[min(18rem,calc(100vw-2rem))] -translate-y-1/2 flex-col gap-2 overflow-hidden pr-1">
      {toasts.map((t) => {
        const isChop = t.variant === 'chop';
        return (
          <div
            key={t.id}
            className={[
              'animate-in slide-in-from-right fade-in flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md duration-300 motion-safe:[animation-duration:280ms]',
              isChop
                ? 'motion-safe:animate-[chop-hit_0.38s_ease-out] border-amber-500/45 bg-black/78 shadow-[0_0_28px_rgba(245,158,11,0.18)]'
                : 'border-emerald-500/35 bg-black/70 shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
            ].join(' ')}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {t.icon}
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p
                className={[
                  'font-mono text-lg font-black leading-none',
                  isChop ? 'text-amber-300' : 'text-emerald-300',
                ].join(' ')}
              >
                +{t.quantity}
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-white/85">
                {t.name}
              </p>
              {t.subtitle ? (
                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-white/55">
                  {t.subtitle}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes chop-hit {
          0% {
            transform: translateX(12px) scale(0.92);
            filter: brightness(1.35);
          }
          55% {
            transform: translateX(0) scale(1.04);
            filter: brightness(1.08);
          }
          100% {
            transform: translateX(0) scale(1);
            filter: brightness(1);
          }
        }
      `}</style>
    </div>
  );
}
