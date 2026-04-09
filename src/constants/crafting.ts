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
  {
    id: "wood_plank_from_log",
    nameEs: "Tablas (×4)",
    nameEn: "Planks (×4)",
    ingredients: [{ itemId: "material_wood_log", quantity: 1 }],
    output: { itemId: "material_wood_plank", quantity: 4 },
  },
  {
    id: "cabin_kit_t1",
    nameEs: "Kit cabaña madera",
    nameEn: "Wood cabin kit",
    ingredients: [
      { itemId: "material_wood_plank", quantity: 6 },
      { itemId: "material_stone_raw", quantity: 4 },
    ],
    output: { itemId: "placeable_cabin_kit", quantity: 1 },
  },
  {
    id: "salad_from_lettuce",
    nameEs: "Ensalada (lechuga)",
    nameEn: "Salad (lettuce)",
    ingredients: [{ itemId: "food_lettuce", quantity: 2 }],
    output: { itemId: "food_salad", quantity: 1 },
  },
];
