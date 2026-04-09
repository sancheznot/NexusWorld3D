/** ES: Acciones de gameplay reutilizables (hotkeys, otros componentes). EN: Shared gameplay actions. */
export {
  getHotbarRow,
  getWorldGatherMode,
  HOTBAR_SLOT_COUNT,
  isToolAxeActiveForWorldActions,
} from "@/lib/gameplay/inventoryHotbar";
export { tryPickupNearestWorldItem } from "@/lib/gameplay/pickupActions";
export {
  tryDropSelectedHotbarItem,
  tryDropInventoryItemById,
} from "@/lib/gameplay/dropActions";
export { tryUseSelectedHotbarConsumable } from "@/lib/gameplay/hotbarUseActions";
export {
  canCraftRecipe,
  listCraftingRecipes,
  type CraftRecipeDef,
} from "@/lib/gameplay/craftingShared";
export {
  registerMeleeClickHandler,
  triggerMeleeClick,
} from "@/lib/gameplay/meleeActionBridge";
export {
  sendTreeChopAttempt,
  type TreeSyncPayload,
} from "@/lib/gameplay/treeChopActions";
export {
  sendRockMineAttempt,
  type RockSyncPayload,
} from "@/lib/gameplay/rockMineActions";
