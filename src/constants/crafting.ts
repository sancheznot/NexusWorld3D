/**
 * ES: Recetas de crafting (cliente + servidor deben importar este módulo).
 * EN: Crafting recipes — shared between client and server.
 */

export type CraftIngredient = { itemId: string; quantity: number };

export type CraftRecipe = {
  id: string;
  nameEs: string;
  nameEn: string;
  ingredients: CraftIngredient[];
  output: { itemId: string; quantity: number };
};

export const CRAFTING_RECIPES: CraftRecipe[] = [
  {
    id: "bandage_t1",
    nameEs: "Vendaje",
    nameEn: "Bandage",
    ingredients: [{ itemId: "material_cloth", quantity: 2 }],
    output: { itemId: "consumable_bandage", quantity: 1 },
  },
];
