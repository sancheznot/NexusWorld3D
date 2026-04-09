import { CRAFTING_RECIPES } from "@/constants/crafting";
import type { Inventory } from "@/types/inventory.types";

export type CraftRecipeDef = (typeof CRAFTING_RECIPES)[number];

export function listCraftingRecipes(): CraftRecipeDef[] {
  return CRAFTING_RECIPES;
}

/**
 * ES: Comprueba si el inventario tiene ingredientes (no equipados).
 * EN: Whether inventory has required ingredients (non-equipped stacks).
 */
export function canCraftRecipe(inv: Inventory, recipeId: string): boolean {
  const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return false;

  for (const ing of recipe.ingredients) {
    let need = ing.quantity;
    for (const it of inv.items) {
      if (it.isEquipped || it.itemId !== ing.itemId) continue;
      need -= it.quantity;
      if (need <= 0) break;
    }
    if (need > 0) return false;
  }
  return true;
}
