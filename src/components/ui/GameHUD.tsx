"use client";

import type { LucideIcon } from "lucide-react";
import { Coins, Crosshair, Heart, MapPin, Shield, Utensils, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { useUIStore } from "@/store/uiStore";
import { economy } from "@/lib/services/economy";
import economyClient from "@/lib/colyseus/EconomyClient";
import { GAME_CONFIG } from "@/constants/game";
import { colyseusClient } from "@/lib/colyseus/client";
import { inventoryService } from "@/lib/services/inventory";
import type { InventoryItem } from "@/types/inventory.types";
import ServerClock from "@/components/ui/ServerClock";

const MAP_LOCATIONS: Record<string, string> = {
  exterior: "Sector urbano",
  "hotel-interior": "Interior hotel",
  "police-station": "Comisaría",
  bank: "Banco Central",
  hospital: "Hospital",
  "city-hall": "Ayuntamiento",
  "fire-station": "Bomberos",
  cafe: "Café",
  shop: "Tienda",
  park: "Parque",
};

type BarColor = "red" | "blue" | "orange";

function StatusBar({
  icon: Icon,
  color,
  value,
  label,
  max = 100,
}: {
  icon: LucideIcon;
  color: BarColor;
  value: number;
  label: string;
  max?: number;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const grad =
    color === "red"
      ? "from-red-600 to-red-400"
      : color === "blue"
        ? "from-blue-600 to-cyan-400"
        : "from-orange-600 to-amber-400";
  const iconTint =
    color === "red"
      ? "text-red-400"
      : color === "blue"
        ? "text-cyan-400"
        : "text-amber-400";

  return (
    <div className="group flex w-44 flex-col gap-1 sm:w-48">
      <div className="flex items-end justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Icon
            size={14}
            className={`${iconTint} transition-transform group-hover:scale-110`}
          />
          <span className="text-[10px] font-black uppercase tracking-tighter text-white/70">
            {label}
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold text-white/90">
          {Math.round(value)}/{max}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/40 p-[2px] backdrop-blur-md">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${grad} shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function HudQuickSlots() {
  const hotbarSelectedSlot = useUIStore((s) => s.hotbarSelectedSlot);
  const [slice, setSlice] = useState<InventoryItem[]>(() =>
    inventoryService.getInventory().items.slice(0, 5)
  );

  useEffect(() => {
    return inventoryService.subscribe(() => {
      setSlice(inventoryService.getInventory().items.slice(0, 5));
    });
  }, []);

  return (
    <div className="pointer-events-auto flex items-end gap-2 sm:gap-3">
      {[0, 1, 2, 3, 4].map((i) => {
        const item = slice[i];
        const active = hotbarSelectedSlot === i;
        return (
          <div
            key={i}
            className={`relative flex h-12 w-12 cursor-default items-center justify-center rounded-2xl border-2 transition-all sm:h-14 sm:w-14 ${
              active
                ? "border-cyan-500 bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                : "border-white/10 bg-black/40 hover:border-white/25"
            }`}
            title={item?.name ?? `Ranura ${i + 1}`}
          >
            <span className="absolute left-1.5 top-1 text-[9px] font-bold text-white/40">
              {i + 1}
            </span>
            {item ? (
              <span className="mt-2 max-w-[2.5rem] truncate text-center text-[10px] font-semibold text-cyan-100">
                {item.icon ? (
                  <span aria-hidden>{item.icon}</span>
                ) : (
                  item.name.slice(0, 2)
                )}
              </span>
            ) : (
              <Shield
                size={22}
                className={`${active ? "text-cyan-400" : "text-white/20"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export type GameHUDProps = {
  className?: string;
  isDriving?: boolean;
  /** ES: Id de mapa actual (CityModel / interiores). EN: Current map id. */
  currentMapId?: string;
};

/**
 * ES: HUD principal — barras, reloj, minimapa (slot), hotbar, moneda. EN: Main in-game HUD shell.
 */
export default function GameHUD({
  className = "",
  isDriving = false,
  currentMapId = "exterior",
}: GameHUDProps) {
  const {
    health,
    maxHealth,
    stamina,
    maxStamina,
    hunger,
    maxHunger,
    position,
    isMoving,
    isRunning,
    player,
  } = usePlayerStore();

  const [balance, setBalance] = useState(0);
  const [netOk, setNetOk] = useState(false);
  const [equippedWeapon, setEquippedWeapon] = useState<
    InventoryItem | undefined
  >(() => inventoryService.getEquipment().weapon);

  useEffect(() => {
    const t = window.setInterval(
      () => setNetOk(colyseusClient.isSocketConnected()),
      2000
    );
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onWallet = (data: unknown) => {
      const v = (data as number) ?? 0;
      setBalance(v >= 10000 ? v / 100 : v);
    };
    economyClient.on("economy:wallet", onWallet);
    economyClient.requestState();
    return () => economyClient.off("economy:wallet", onWallet);
  }, []);

  useEffect(() => {
    const syncWeapon = () => {
      const w = inventoryService.getEquipment().weapon;
      setEquippedWeapon(w && w.type === "weapon" ? w : undefined);
    };
    syncWeapon();
    return inventoryService.subscribe(syncWeapon);
  }, []);

  const mapLabel =
    MAP_LOCATIONS[currentMapId] ?? currentMapId ?? "Desconocido";
  const initial = (player?.username ?? "?").slice(0, 1).toUpperCase();

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-10 select-none ${className}`}
    >
      {/* Top-left: avatar + bars */}
      <div className="pointer-events-auto absolute left-4 top-4 animate-in fade-in slide-in-from-left duration-500 sm:left-6 sm:top-6">
        <div className="flex items-center gap-3 rounded-3xl border border-white/5 bg-black/25 p-3 shadow-2xl backdrop-blur-md sm:gap-4 sm:p-4">
          <div className="relative shrink-0">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-tr from-slate-800 to-slate-600 shadow-inner sm:h-14 sm:w-14">
              <span className="text-lg font-black text-white">{initial}</span>
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a0a0a] sm:h-4 sm:w-4 ${
                netOk ? "bg-emerald-500" : "bg-amber-500"
              }`}
              title={netOk ? "Conectado" : "Sin sala / reconectando"}
            />
          </div>
          <div className="space-y-2">
            <p className="truncate text-xs font-bold text-white/90 sm:text-sm">
              {player?.username ?? "Jugador"}
            </p>
            <StatusBar
              icon={Heart}
              color="red"
              value={health}
              label="Vitalidad"
              max={maxHealth}
            />
            <StatusBar
              icon={Zap}
              color="blue"
              value={stamina}
              label="Estamina"
              max={maxStamina}
            />
            <StatusBar
              icon={Utensils}
              color="orange"
              value={hunger}
              label="Nutrición"
              max={maxHunger}
            />
          </div>
        </div>
      </div>

      {/* Top-right: server time (minimap = componente `Minimap` con placement top-right) */}
      <div className="pointer-events-auto absolute right-4 top-4 flex flex-col items-end gap-3 sm:right-6 sm:top-6">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
            <ServerClock className="!border-0 !bg-transparent text-sm font-mono font-bold text-white" />
          </div>
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-400/90 backdrop-blur-sm">
            {mapLabel}
          </span>
        </div>
      </div>

      {/* Bottom-left: position + movement + hotbar */}
      <div className="pointer-events-auto absolute bottom-4 left-4 flex max-w-[calc(100vw-2rem)] flex-col gap-3 sm:bottom-6 sm:left-6">
        <div className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2 text-white/80">
            <MapPin size={14} className="shrink-0 text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Posición
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] text-slate-200 sm:text-xs">
            X {position.x.toFixed(0)} · Y {position.y.toFixed(0)} · Z{" "}
            {position.z.toFixed(0)}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            {isDriving
              ? "🚗 Conduciendo / Driving"
              : isMoving
                ? isRunning
                  ? "🏃 Sprint"
                  : "🚶 Caminando / Walking"
                : "⏸️ Idle"}
          </p>
        </div>
        <HudQuickSlots />
      </div>

      {/* Bottom-right: credits + weapon strip (placeholder ammo) */}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        <div className="flex items-center gap-3 rounded-l-full border-y border-l border-yellow-500/40 bg-gradient-to-l from-yellow-500/15 to-transparent py-2 pl-10 pr-4 backdrop-blur-sm">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase leading-none text-yellow-500/80">
              Créditos
            </span>
            <span className="font-mono text-2xl font-black leading-tight tracking-tighter text-white">
              {economy.format(balance, { withSymbol: false })}{" "}
              <span className="text-lg text-yellow-400">
                {GAME_CONFIG.currency.symbol}
              </span>
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.35)]">
            <Coins size={20} className="text-black" />
          </div>
        </div>

        {equippedWeapon && (
          <div className="flex items-center gap-4 rounded-[2rem] border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-xl">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Munición
              </p>
              <p className="text-3xl font-black italic tracking-tighter text-white sm:text-4xl">
                —<span className="text-xl not-italic text-slate-500">/—</span>
              </p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex max-w-[7rem] flex-col items-center gap-1">
              <Crosshair size={28} className="text-white/85" />
              <span className="line-clamp-2 text-center font-mono text-[9px] font-bold text-cyan-400">
                {equippedWeapon.name}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
