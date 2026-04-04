"use client";

import {
  Gamepad2,
  LogOut,
  Map,
  MessageSquare,
  Package,
  Play,
  Settings,
  X,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import {
  GAME_KEYBINDINGS,
  MOVEMENT_HELP_ROWS,
} from "@/config/gameKeybindings";
import { GameButton } from "@/components/ui/GameButton";

type Props = {
  isOpen: boolean;
  onResume: () => void;
  onOpenSettings: () => void;
};

/**
 * ES: Menú de pausa (Esc) — accesos rápidos y lista de controles desde `gameKeybindings`.
 * EN: Pause menu (Esc) — quick actions and control list from `gameKeybindings`.
 */
export default function PauseMenu({
  isOpen,
  onResume,
  onOpenSettings,
}: Props) {
  const {
    toggleInventory,
    toggleMap,
    toggleChat,
    setPauseMenuOpen,
  } = useUIStore();

  if (!isOpen) return null;

  const resume = () => {
    setPauseMenuOpen(false);
    onResume();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      onWheelCapture={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-cyan-500/10"
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={resume}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={22} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 to-violet-600/30">
            <Gamepad2 className="text-cyan-300" size={26} />
          </div>
          <div>
            <h2
              id="pause-title"
              className="text-xl font-black tracking-tight text-white"
            >
              Pausa
            </h2>
            <p className="text-xs text-slate-400">Pause · NexusWorld3D</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <GameButton
            type="button"
            variant="neon"
            className="!justify-start !gap-3 !py-3"
            onClick={resume}
          >
            <Play size={18} />
            Continuar / Resume
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3"
            onClick={() => {
              setPauseMenuOpen(false);
              toggleInventory();
            }}
          >
            <Package size={18} />
            Inventario ({GAME_KEYBINDINGS.find((b) => b.id === "inventory")?.label})
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3"
            onClick={() => {
              setPauseMenuOpen(false);
              toggleMap();
            }}
          >
            <Map size={18} />
            Mapa ({GAME_KEYBINDINGS.find((b) => b.id === "map")?.label})
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3"
            onClick={() => {
              setPauseMenuOpen(false);
              toggleChat();
            }}
          >
            <MessageSquare size={18} />
            Chat ({GAME_KEYBINDINGS.find((b) => b.id === "chat")?.label})
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3"
            onClick={() => {
              setPauseMenuOpen(false);
              onOpenSettings();
            }}
          >
            <Settings size={18} />
            Ajustes / Settings
          </GameButton>
          <GameButton
            href="/"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-rose-500/30 text-rose-200 hover:border-rose-400/50"
            onClick={() => setPauseMenuOpen(false)}
          >
            <LogOut size={18} />
            Salir al inicio / Home
          </GameButton>
        </div>

        <div className="mt-8 rounded-2xl border border-white/5 bg-black/40 p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-cyan-400/90">
            Controles / Controls
          </p>
          <ul
            data-game-scroll-region
            className="scrollbar-hidden max-h-48 min-h-0 space-y-2 overflow-y-auto overscroll-y-contain text-xs text-slate-300 [-webkit-overflow-scrolling:touch]"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {MOVEMENT_HELP_ROWS.map((row) => (
              <li
                key={row.keys}
                className="flex justify-between gap-4 border-b border-white/5 py-1.5"
              >
                <kbd className="shrink-0 rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white">
                  {row.keys}
                </kbd>
                <span className="text-right text-[11px] text-slate-400">
                  {row.descriptionEs}
                  <span className="ml-1 text-slate-600">· {row.descriptionEn}</span>
                </span>
              </li>
            ))}
            {GAME_KEYBINDINGS.filter((b) => b.category !== "movement").map(
              (b) => (
                <li
                  key={b.id}
                  className="flex justify-between gap-4 border-b border-white/5 py-1.5"
                >
                  <kbd className="shrink-0 rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white">
                    {b.label}
                  </kbd>
                  <span className="text-right text-[11px] text-slate-400">
                    {b.descriptionEs}
                    <span className="ml-1 text-slate-600">· {b.descriptionEn}</span>
                  </span>
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
