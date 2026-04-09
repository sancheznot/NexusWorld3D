'use client';

import { X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useUIStore } from '@/store/uiStore';
import {
  listCraftingRecipes,
  canCraftRecipe,
} from '@/lib/gameplay/craftingShared';
import { ITEMS_CATALOG } from '@/constants/items';
import inventoryClient from '@/lib/colyseus/InventoryClient';
import { GAME_KEYBINDINGS } from '@/config/gameKeybindings';

export default function CraftingUI() {
  const { inventory } = useInventory();
  const { toggleCrafting, addNotification } = useUIStore();
  const recipes = listCraftingRecipes();
  const cKey = GAME_KEYBINDINGS.find((b) => b.id === 'crafting')?.label ?? 'C';

  const craft = (recipeId: string) => {
    inventoryClient.executeCraft(recipeId);
    addNotification({
      id: `craft-${Date.now()}`,
      type: 'info',
      title: 'Crafting',
      message: 'Enviado al servidor…',
      timestamp: new Date(),
      duration: 2200,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
        <button
          type="button"
          onClick={toggleCrafting}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={22} />
        </button>
        <h2 className="pr-10 text-xl font-black tracking-tight text-white">
          Fabricación / Crafting
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Tecla <span className="text-cyan-400">{cKey}</span> · recetas extensibles en{' '}
          <code className="rounded bg-black/40 px-1">constants/crafting</code>
        </p>

        <ul className="mt-5 space-y-3">
          {recipes.map((r) => {
            const ok = canCraftRecipe(inventory, r.id);
            return (
              <li
                key={r.id}
                className="rounded-xl border border-white/5 bg-black/35 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-white">{r.nameEs}</p>
                    <p className="text-[10px] text-slate-500">{r.nameEn}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!ok}
                    onClick={() => craft(r.id)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                      ok
                        ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                        : 'cursor-not-allowed bg-slate-800 text-slate-500'
                    }`}
                  >
                    {ok ? 'Fabricar' : 'Falta material'}
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  {r.ingredients
                    .map(
                      (ing) =>
                        `${ITEMS_CATALOG[ing.itemId]?.name ?? ing.itemId} ×${ing.quantity}`
                    )
                    .join(' · ')}
                  <span className="mx-1 text-slate-600">→</span>
                  {ITEMS_CATALOG[r.output.itemId]?.name ?? r.output.itemId} ×
                  {r.output.quantity}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
