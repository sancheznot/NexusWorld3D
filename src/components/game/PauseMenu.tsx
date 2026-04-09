"use client";

import {
  Combine,
  Gamepad2,
  Home,
  Layers,
  Leaf,
  LogOut,
  Map,
  MessageSquare,
  Package,
  Play,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import {
  GAME_KEYBINDINGS,
  MOVEMENT_HELP_ROWS,
} from "@/config/gameKeybindings";
import { GameButton } from "@/components/ui/GameButton";
import { frameworkAppName } from "@/lib/frameworkBranding";
import {
  clearNearestPlotDebris,
  devGrantHousingPlot,
  placeBuildPieceAtPlayer,
  placeCabinAtPlayerPosition,
  purchaseHousingPlot,
  removeNearestBuildPiece,
  requestHousingSync,
  upgradeNearestCabin,
} from "@/lib/housing/housingClient";
import { colyseusClient } from "@/lib/colyseus/client";
import { useBuildPreviewStore } from "@/store/buildPreviewStore";

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
    toggleCrafting,
    setPauseMenuOpen,
    addNotification,
  } = useUIStore();
  const previewPieceId = useBuildPreviewStore((s) => s.previewPieceId);
  const setBuildPreviewPieceId = useBuildPreviewStore(
    (s) => s.setBuildPreviewPieceId
  );

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
            <p className="text-xs text-slate-400">
              Pause · {frameworkAppName}
            </p>
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
              toggleCrafting();
            }}
          >
            <Combine size={18} />
            Crafting (
            {GAME_KEYBINDINGS.find((b) => b.id === "crafting")?.label ?? "C"})
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-amber-500/25 text-amber-100"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) {
                addNotification({
                  id: `h-${Date.now()}`,
                  type: "warning",
                  title: "Vivienda",
                  message: "Conéctate al mundo primero.",
                  timestamp: new Date(),
                  duration: 4000,
                });
                return;
              }
              requestHousingSync("exterior");
              purchaseHousingPlot("exterior_lot_a1");
              addNotification({
                id: `h-${Date.now()}`,
                type: "info",
                title: "Vivienda",
                message: "Compra de lote enviada (200 créditos si tienes saldo).",
                timestamp: new Date(),
                duration: 4500,
              });
            }}
          >
            <Home size={18} />
            Comprar lote A1 / Buy plot
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-emerald-500/25 text-emerald-100"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              placeCabinAtPlayerPosition();
              addNotification({
                id: `h-${Date.now()}`,
                type: "info",
                title: "Vivienda",
                message:
                  "Colocar cabaña (frente a ti) — necesitas kit + lote.",
                timestamp: new Date(),
                duration: 4000,
              });
            }}
          >
            <Home size={18} />
            Colocar cabaña / Place cabin
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-sky-500/25 text-sky-100"
            title="Cabaña más cercana ≤8 m: piedra ×12 + tablas ×8 / Nearest cabin ≤8 m"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              upgradeNearestCabin("materials");
            }}
          >
            <Home size={18} />
            Mejorar cabaña (materiales)
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-amber-500/30 text-amber-50"
            title="Atajo 320 créditos · cabaña cercana / 320 credits shortcut"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              upgradeNearestCabin("cash");
            }}
          >
            <Home size={18} />
            Mejorar cabaña (créditos)
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-teal-500/25 text-teal-100"
            title="Fantasma cyan + tecla E para colocar · grid 0,5 m"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              setBuildPreviewPieceId("wall_wood");
              setPauseMenuOpen(false);
              addNotification({
                id: `bp-${Date.now()}`,
                type: "info",
                title: "Construcción",
                message:
                  "Vista previa: muro madera — E para colocar (1 tabla). Pausa → cancelar vista.",
                timestamp: new Date(),
                duration: 7000,
              });
            }}
          >
            <Layers size={18} />
            Vista previa: muro madera / Preview wood wall
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-slate-500/30 text-slate-200"
            title="Fantasma + E · 2× piedra bruta"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              setBuildPreviewPieceId("wall_stone");
              setPauseMenuOpen(false);
              addNotification({
                id: `bp-${Date.now()}`,
                type: "info",
                title: "Construcción",
                message:
                  "Vista previa: muro piedra — E para colocar (2 piedras). Pausa → cancelar vista.",
                timestamp: new Date(),
                duration: 7000,
              });
            }}
          >
            <Layers size={18} />
            Vista previa: muro piedra / Preview stone wall
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-stone-500/25 text-stone-200"
            title="Fantasma + E · 1 piedra bruta"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              setBuildPreviewPieceId("floor_stone");
              setPauseMenuOpen(false);
              addNotification({
                id: `bp-${Date.now()}`,
                type: "info",
                title: "Construcción",
                message:
                  "Vista previa: suelo — E para colocar. Pausa → cancelar vista.",
                timestamp: new Date(),
                duration: 7000,
              });
            }}
          >
            <Layers size={18} />
            Vista previa: suelo / Preview floor
          </GameButton>
          {previewPieceId ? (
            <GameButton
              type="button"
              variant="classic"
              className="!justify-start !gap-3 !py-3 border-slate-500/40 text-slate-200"
              onClick={() => {
                setBuildPreviewPieceId(null);
                addNotification({
                  id: `bpc-${Date.now()}`,
                  type: "info",
                  title: "Construcción",
                  message: "Vista previa desactivada.",
                  timestamp: new Date(),
                  duration: 3000,
                });
              }}
            >
              <X size={18} />
              Cancelar vista construcción / Cancel build preview
            </GameButton>
          ) : null}
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-2 border-teal-500/15 text-teal-200/90 text-sm"
            title="Sin fantasma — coloca al instante"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              placeBuildPieceAtPlayer("wall_wood");
            }}
          >
            <Layers size={16} />
            Directo: muro madera / Place wood wall
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-2 border-slate-500/15 text-slate-300/90 text-sm"
            title="Sin fantasma · 2 piedras"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              placeBuildPieceAtPlayer("wall_stone");
            }}
          >
            <Layers size={16} />
            Directo: muro piedra / Place stone wall
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-2 border-stone-500/15 text-stone-300/90 text-sm"
            title="Sin fantasma"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              placeBuildPieceAtPlayer("floor_stone");
            }}
          >
            <Layers size={16} />
            Directo: suelo / Place floor now
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-rose-500/30 text-rose-100"
            title="Pieza modular tuya más cercana ≤10 m — devuelve materiales si caben en inventario"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              removeNearestBuildPiece();
            }}
          >
            <Trash2 size={18} />
            Desmontar pieza cercana / Remove nearest piece
          </GameButton>
          <GameButton
            type="button"
            variant="classic"
            className="!justify-start !gap-3 !py-3 border-lime-500/25 text-lime-100/95"
            title="Escombro de plantilla en tu parcela ≤4 m — piedra o leña al inventario si hay espacio"
            onClick={() => {
              if (!colyseusClient.isConnectedToWorldRoom()) return;
              clearNearestPlotDebris();
            }}
          >
            <Leaf size={18} />
            Limpiar escombro cercano / Clear nearest debris
          </GameButton>
          {process.env.NODE_ENV === "development" ? (
            <GameButton
              type="button"
              variant="classic"
              className="!justify-start !gap-3 !py-3 border-violet-500/30 text-violet-200"
              onClick={() => {
                if (!colyseusClient.isConnectedToWorldRoom()) return;
                devGrantHousingPlot("exterior_lot_a1");
                addNotification({
                  id: `h-${Date.now()}`,
                  type: "success",
                  title: "Dev",
                  message:
                    "Lote A1 gratis (servidor con HOUSING_DEV=1).",
                  timestamp: new Date(),
                  duration: 5000,
                });
              }}
            >
              <Home size={18} />
              [Dev] Lote gratis
            </GameButton>
          ) : null}
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
