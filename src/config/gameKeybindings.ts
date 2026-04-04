/**
 * ES: Única fuente de verdad para teclas de juego (UI, ayuda, Pause, useKeyboard).
 * EN: Single source of truth for game keybinds (UI, help, Pause, useKeyboard).
 */

/** ES: Teclas de movimiento (lowercase `event.key`). EN: Movement keys (lowercase). */
export const MOVEMENT_KEYS = {
  forward: "w",
  back: "s",
  left: "a",
  right: "d",
  run: "shift",
  jump: " ",
} as const;

export type GameActionId =
  | "inventory"
  | "map"
  | "minimap"
  | "chat"
  | "pause"
  | "interact_vehicle"
  | "hotbar1"
  | "hotbar2"
  | "hotbar3"
  | "hotbar4"
  | "hotbar5";

export type GameKeybinding = {
  id: GameActionId;
  /** ES: Tecla principal (KeyboardEvent.key en minúsculas salvo espacio). */
  key: string;
  /** ES: Etiqueta para HUD / teclado en pantalla. */
  label: string;
  /** ES: Descripción corta ES. EN: Short EN description. */
  descriptionEs: string;
  descriptionEn: string;
  category: "movement" | "ui" | "combat" | "hotbar";
};

export const GAME_KEYBINDINGS: GameKeybinding[] = [
  {
    id: "inventory",
    key: "i",
    label: "I",
    descriptionEs: "Inventario",
    descriptionEn: "Inventory",
    category: "ui",
  },
  {
    id: "map",
    key: "m",
    label: "M",
    descriptionEs: "Mapa",
    descriptionEn: "Map",
    category: "ui",
  },
  {
    id: "minimap",
    key: "n",
    label: "N",
    descriptionEs: "Minimapa",
    descriptionEn: "Minimap",
    category: "ui",
  },
  {
    id: "chat",
    key: "enter",
    label: "Enter",
    descriptionEs: "Chat",
    descriptionEn: "Chat",
    category: "ui",
  },
  {
    id: "pause",
    key: "escape",
    label: "Esc",
    descriptionEs: "Pausa / cerrar menús",
    descriptionEn: "Pause / close menus",
    category: "ui",
  },
  {
    id: "interact_vehicle",
    key: "f",
    label: "F",
    descriptionEs: "Interactuar / vehículo",
    descriptionEn: "Interact / vehicle",
    category: "ui",
  },
  {
    id: "hotbar1",
    key: "1",
    label: "1",
    descriptionEs: "Ranura rápida 1",
    descriptionEn: "Quick slot 1",
    category: "hotbar",
  },
  {
    id: "hotbar2",
    key: "2",
    label: "2",
    descriptionEs: "Ranura rápida 2",
    descriptionEn: "Quick slot 2",
    category: "hotbar",
  },
  {
    id: "hotbar3",
    key: "3",
    label: "3",
    descriptionEs: "Ranura rápida 3",
    descriptionEn: "Quick slot 3",
    category: "hotbar",
  },
  {
    id: "hotbar4",
    key: "4",
    label: "4",
    descriptionEs: "Ranura rápida 4",
    descriptionEn: "Quick slot 4",
    category: "hotbar",
  },
  {
    id: "hotbar5",
    key: "5",
    label: "5",
    descriptionEs: "Ranura rápida 5",
    descriptionEn: "Quick slot 5",
    category: "hotbar",
  },
];

/** ES: Movimiento para textos de ayuda (no se usa en switch de teclas numéricas). */
export const MOVEMENT_HELP_ROWS: { keys: string; descriptionEs: string; descriptionEn: string }[] =
  [
    { keys: "W A S D", descriptionEs: "Mover", descriptionEn: "Move" },
    { keys: "Shift", descriptionEs: "Correr", descriptionEn: "Sprint" },
    { keys: "Espacio", descriptionEs: "Saltar", descriptionEn: "Jump" },
  ];

export function keybindingById(id: GameActionId): GameKeybinding | undefined {
  return GAME_KEYBINDINGS.find((b) => b.id === id);
}

export function normalizeKeyboardKey(event: KeyboardEvent): string {
  const k = event.key;
  if (k === " ") return " ";
  return k.length === 1 ? k.toLowerCase() : k.toLowerCase();
}

export function isMovementKey(normalizedKey: string): boolean {
  const m = MOVEMENT_KEYS;
  return (
    normalizedKey === m.forward ||
    normalizedKey === m.back ||
    normalizedKey === m.left ||
    normalizedKey === m.right ||
    normalizedKey === m.run ||
    normalizedKey === m.jump
  );
}
