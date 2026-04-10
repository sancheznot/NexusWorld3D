/**
 * ES: Registro central de nombres de mensajes Colyseus — usar estos valores en
 * cliente y servidor para evitar typos y documentar el contrato.
 * EN: Central Colyseus message names — use from client + server to avoid typos.
 *
 * Prefijos / Prefixes:
 * - `world:`, `housing:`, `rpg:` … = núcleo compartido / shared core
 * - IDs de plugins de sala: **`core:*`** (motor), **`game:*`** (tu juego privado) — ver `NexusRoomPlugin.id`
 * - Mensajes nuevos del juego: prefijo `game:` (p. ej. `game:quest-accept`) para no chocar con el núcleo
 */

export const WorldMessages = {
  TreeChop: "world:tree-chop",
  TreeChopResult: "world:tree-chop-result",
  TreeSync: "world:tree-sync",
  RockMine: "world:rock-mine",
  RockMineResult: "world:rock-mine-result",
  RockSync: "world:rock-sync",
  HarvestNode: "world:harvest-node",
  HarvestNodeResult: "world:harvest-node-result",
  /** ES: Herramienta registrada vía `registerWorldTool`. EN: Tool registered with `registerWorldTool`. */
  GenericTool: "world:generic-tool",
  GenericToolResult: "world:generic-tool-result",
  Change: "world:change",
  RequestData: "world:request-data",
  Update: "world:update",
  Changed: "world:changed",
} as const;

export const HousingMessages = {
  Request: "housing:request",
  Purchase: "housing:purchase",
  Purchased: "housing:purchased",
  DevGrantPlot: "housing:dev_grant_plot",
  Place: "housing:place",
  Placed: "housing:placed",
  PlacePiece: "housing:placePiece",
  PiecePlaced: "housing:piecePlaced",
  RemovePiece: "housing:removePiece",
  PieceRemoved: "housing:pieceRemoved",
  ClearDebris: "housing:clearDebris",
  DebrisCleared: "housing:debrisCleared",
  Upgrade: "housing:upgrade",
  Upgraded: "housing:upgraded",
  Sync: "housing:sync",
  Error: "housing:error",
} as const;

export const RpgMessages = {
  Sync: "rpg:sync",
  Error: "rpg:error",
  RequestSync: "rpg:request-sync",
  AllocateStat: "rpg:allocate-stat",
} as const;

export const InventoryMessages = {
  Updated: "inventory:updated",
  Error: "inventory:error",
  Request: "inventory:request",
  Update: "inventory:update",
  ItemEquipped: "inventory:item-equipped",
  ItemUnequipped: "inventory:item-unequipped",
  AddItem: "inventory:add-item",
  RemoveItem: "inventory:remove-item",
  UseItem: "inventory:use-item",
  EquipItem: "inventory:equip-item",
  UnequipItem: "inventory:unequip-item",
  UpdateGold: "inventory:update-gold",
  SwapSlots: "inventory:swap-slots",
  ItemRemoved: "inventory:item-removed",
  GoldUpdated: "inventory:gold-updated",
  ItemUsed: "inventory:item-used",
  Data: "inventory:data",
} as const;

export const EconomyMessages = {
  Wallet: "economy:wallet",
  Bank: "economy:bank",
  Ledger: "economy:ledger",
  Error: "economy:error",
  Limits: "economy:limits",
  LimitsUsed: "economy:limitsUsed",
  Request: "economy:request",
  Deposit: "economy:deposit",
  Withdraw: "economy:withdraw",
  Transfer: "economy:transfer",
  Purchase: "economy:purchase",
  JobPay: "economy:job-pay",
} as const;

export const CraftingMessages = {
  Execute: "crafting:execute",
} as const;

export const FarmMessages = {
  Result: "farm:result",
  Interact: "farm:interact",
} as const;

export const StallMessages = {
  Result: "stall:result",
  AddListing: "stall:addListing",
  RemoveListing: "stall:removeListing",
  Buy: "stall:buy",
} as const;

export const PlayerMessages = {
  Join: "player:join",
  Leave: "player:leave",
  Move: "player:move",
  Attack: "player:attack",
  Interact: "player:interact",
  Heartbeat: "player:heartbeat",
  Joined: "player:joined",
  Left: "player:left",
  Moved: "player:moved",
  Attacked: "player:attacked",
  Damaged: "player:damaged",
  Died: "player:died",
  Respawned: "player:respawned",
  LevelUp: "player:levelup",
  Role: "player:role",
} as const;

export const ChatMessages = {
  Message: "chat:message",
  JoinChannel: "chat:join-channel",
  LeaveChannel: "chat:leave-channel",
  System: "chat:system",
} as const;

export const MonsterMessages = {
  Spawned: "monster:spawned",
  Died: "monster:died",
  Moved: "monster:moved",
} as const;

export const SystemMessages = {
  Error: "system:error",
  Maintenance: "system:maintenance",
} as const;

/** ES: Demo del framework (`NEXT_PUBLIC_FRAMEWORK_DEMO`). EN: Framework demo room messages. */
export const DemoMessages = {
  /** ES: Pedir recompensa del cubo dorado (servidor valida distancia + cooldown). */
  FrameworkCubePickup: "core:demo-framework-cube-pickup",
} as const;

export type WorldMessageKey = keyof typeof WorldMessages;
export type HousingMessageKey = keyof typeof HousingMessages;
/** Wire string for economy Colyseus messages (wallet, bank, ledger, …). */
export type EconomyEventName = (typeof EconomyMessages)[keyof typeof EconomyMessages];
