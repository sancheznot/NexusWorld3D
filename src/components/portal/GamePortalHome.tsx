"use client";

import { Play, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DEFAULT_LANDING_CONFIG,
  type LandingBrandingConfig,
} from "@/types/landing.types";
import type { PublicPortalRoom } from "@/types/gamePortal.types";
import { GameButton } from "@/components/ui/GameButton";

type PortalPayload = {
  appName: string;
  shortName: string;
  rooms: PublicPortalRoom[];
  totalOnline: number | null;
  /** ES: true si el snapshot del monitor Colyseus se aplicó. EN: true when Colyseus monitor snapshot was applied. */
  live?: boolean;
  liveMetricsNote?: string;
};

const PORTAL_POLL_MS = 10_000;

async function fetchPortalPayload(): Promise<PortalPayload | null> {
  const res = await fetch("/api/public/portal-status", { cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as PortalPayload;
  return j?.rooms ? j : null;
}

const safeMain =
  "px-4 sm:px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 space-y-6 sm:space-y-10 min-h-0 flex-1 overflow-y-auto overscroll-y-contain";

const safeHeader =
  "px-4 sm:px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 landscape:pb-3 landscape:max-md:pt-3";

/**
 * ES: Home pública orientada a jugadores — mobile-first, pensada también en landscape.
 * EN: Player-facing home — mobile-first, friendly for horizontal (landscape) play.
 */
export default function GamePortalHome() {
  const [cfg, setCfg] = useState<LandingBrandingConfig>(DEFAULT_LANDING_CONFIG);
  const [portal, setPortal] = useState<PortalPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, pPayload] = await Promise.all([
          fetch("/api/public/landing-config"),
          fetchPortalPayload(),
        ]);
        const cJson = await cRes.json();
        if (cancelled) return;
        if (cJson?.config) setCfg(cJson.config as LandingBrandingConfig);
        if (pPayload) setPortal(pPayload);
      } catch {
        /* defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** ES: Refresco ligero de métricas en vivo (misma API que la carga inicial). EN: Light refresh of live metrics. */
  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const p = await fetchPortalPayload();
          if (p) setPortal(p);
        } catch {
          /* keep previous */
        }
      })();
    }, PORTAL_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const pageBg = {
    background: `linear-gradient(135deg, ${cfg.pageBackgroundFrom} 0%, ${cfg.pageBackgroundVia} 45%, #0f172a 100%)`,
  };

  const titleStyle = {
    backgroundImage: `linear-gradient(to right, ${cfg.titleGradientFrom}, ${cfg.titleGradientTo})`,
  };

  const primaryBtn = {
    background: `linear-gradient(to right, ${cfg.primaryButtonFrom}, ${cfg.primaryButtonTo})`,
  };

  const displayTitle = portal?.appName ?? cfg.title;

  return (
    <div
      className="min-h-[100dvh] text-white flex flex-col font-sans"
      style={pageBg}
    >
      <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/40 via-transparent to-transparent" />

        <header
          className={`relative z-10 max-w-6xl w-full mx-auto ${safeHeader} flex flex-col gap-4 landscape:max-md:flex-row landscape:max-md:items-center landscape:max-md:justify-between landscape:max-md:gap-4`}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {cfg.logoUrl ? (
              <img
                src={cfg.logoUrl}
                alt=""
                className="h-12 w-auto sm:h-16 object-contain drop-shadow-lg shrink-0"
              />
            ) : (
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xl sm:text-2xl shrink-0">
                🎮
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                {portal?.shortName ?? "Live"}
              </p>
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent landscape:max-md:text-2xl leading-tight"
                style={titleStyle}
              >
                {displayTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 sm:mt-1 max-w-md line-clamp-2 sm:line-clamp-none">
                {cfg.tagline}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 shrink-0 landscape:max-md:justify-end">
            <GameButton
              href="/game"
              variant="custom"
              style={primaryBtn}
              className="w-full min-[400px]:w-auto uppercase tracking-wide text-sm sm:text-base"
            >
              <Play className="fill-current shrink-0" size={20} aria-hidden />
              {cfg.primaryCtaLabel}
            </GameButton>
          </div>
        </header>
      </div>

      <main className={`relative z-10 max-w-6xl w-full mx-auto ${safeMain}`}>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 landscape:max-md:grid-cols-2 landscape:max-md:gap-3 [@media(orientation:landscape)and(max-height:480px)]:grid-cols-2">
          <div className="md:col-span-2 rounded-2xl bg-black/35 border border-white/10 p-4 sm:p-6 backdrop-blur-md min-h-0">
            <h2 className="text-base sm:text-lg font-bold text-cyan-200 mb-3 flex items-center gap-2">
              <span aria-hidden>🌐</span> Salas disponibles
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">
              Elige una sala y entra al mundo multijugador.
            </p>
            <ul className="space-y-2 sm:space-y-3">
              {(portal?.rooms ?? []).map((room) => (
                <li
                  key={room.id}
                  className="flex flex-col min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between gap-3 rounded-xl bg-slate-900/60 border border-white/10 p-3 sm:p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          room.status === "online"
                            ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                            : "bg-amber-400"
                        }`}
                      />
                      <span className="font-semibold text-white truncate">
                        {room.displayName}
                      </span>
                      {room.requiresAuth === false && (
                        <span className="rounded-full bg-cyan-500/25 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-100">
                          Sin cuenta
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-mono mt-1 break-all">
                      {room.colyseusRoomName} · max {room.maxPlayers} jugadores
                    </p>
                  </div>
                  <div className="flex flex-row items-center justify-between min-[480px]:justify-end gap-3 min-[480px]:gap-4 shrink-0">
                    <div className="text-left min-[480px]:text-right text-sm">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wide">
                        En línea
                      </p>
                      <p className="text-lg sm:text-xl font-mono text-cyan-300 tabular-nums">
                        {room.playersOnline != null ? room.playersOnline : "—"}
                      </p>
                    </div>
                    <GameButton
                      href="/game"
                      variant="neon"
                      className="!py-2.5 !px-4 !min-h-[44px] text-xs sm:text-sm !not-italic normal-case"
                    >
                      Jugar
                    </GameButton>
                  </div>
                </li>
              ))}
            </ul>
            {(!portal?.rooms || portal.rooms.length === 0) && (
              <p className="text-slate-500 text-sm">No hay salas configuradas.</p>
            )}
          </div>

          <div className="rounded-2xl bg-gradient-to-b from-violet-950/50 to-slate-950/80 border border-violet-500/20 p-4 sm:p-6 flex flex-col justify-center landscape:max-md:col-span-1">
            <h2 className="text-base sm:text-lg font-bold text-violet-200 mb-2 flex items-center gap-2">
              <Users className="shrink-0" size={20} aria-hidden />
              Jugadores en línea
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-white mb-1 tabular-nums">
              {portal?.totalOnline != null ? portal.totalOnline : "—"}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-400">
              {portal?.live
                ? "En vivo · se actualiza cada ~10 s (CCU en este servidor)."
                : "Sin datos en vivo: configura el monitor (NEXUS_GAME_MONITOR_SECRET) y que Next alcance Colyseus."}
            </p>
            <p className="text-[10px] text-slate-500 mt-2 leading-snug">
              {portal?.live
                ? "Live · refreshes ~every 10s (CCU on this game process)."
                : "No live data: set NEXUS_GAME_MONITOR_SECRET and ensure Next can reach the monitor URL."}
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-black/30 border border-white/10 p-4 sm:p-6 backdrop-blur-sm">
          <h2 className="text-base sm:text-lg font-bold mb-1 text-slate-200">
            Antes de jugar
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4">
            Consejos · Player tips
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 landscape:max-md:grid-cols-3 [@media(orientation:landscape)and(max-height:480px)]:grid-cols-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xl sm:text-2xl mb-2" aria-hidden>
                ⌨️
              </div>
              <h3 className="font-semibold text-cyan-100 mb-1 text-sm sm:text-base">
                Controles
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                WASD para moverte; ratón para mirar. Clic para interactuar.
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2">
                Move with WASD, look with the mouse, click to interact.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xl sm:text-2xl mb-2" aria-hidden>
                💬
              </div>
              <h3 className="font-semibold text-cyan-100 mb-1 text-sm sm:text-base">
                Multijugador
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Compartes mundo con otros jugadores en la misma sala.
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2">
                You share the world with others in the same room.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4">
              <div className="text-xl sm:text-2xl mb-2" aria-hidden>
                🌙
              </div>
              <h3 className="font-semibold text-cyan-100 mb-1 text-sm sm:text-base">
                Navegador
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                No hace falta instalar nada: todo corre en el navegador.
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2">
                No install needed — runs in your browser.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
