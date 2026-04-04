"use client";

import {
  Globe,
  LogIn,
  MessageSquare,
  Monitor,
  Play,
  Settings,
  Shield,
  SunMedium,
  User,
  Users,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Room } from "colyseus.js";
import { GameButton } from "@/components/ui/GameButton";
import { colyseusClient } from "@/lib/colyseus/client";
import { frameworkLobbyRoomName } from "@/lib/frameworkBranding";
import type { PublicPortalRoom } from "@/types/gamePortal.types";

const LS_BRIGHT = "nexus-lobby-brightness-pct";
const LS_CONTRAST = "nexus-lobby-contrast-pct";
const LS_GUEST_LOBBY_NAME = "nexus-lobby-guest-display";

export type GameLobbyMeProfile = {
  displayName: string;
  bio: string;
  image: string | null;
  email: string | null;
  hasSavedProfile: boolean;
} | null;

type LobbyPresenceRow = {
  sessionId: string;
  displayName: string;
  userId: string | null;
};

type LobbyChatRow = {
  id: string;
  sessionId: string;
  displayName: string;
  text: string;
  ts: number;
};

type PortalPayload = {
  appName: string;
  shortName: string;
  rooms: PublicPortalRoom[];
  totalOnline: number | null;
};

type Props = {
  onEnterRoom: (room: PublicPortalRoom) => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
  accountUserId: string | null;
  meProfile: GameLobbyMeProfile;
  onProfileUpdated: () => void;
  brightness: number;
  contrast: number;
  onBrightnessChange: (v: number) => void;
  onContrastChange: (v: number) => void;
};

export function readLobbyDisplayFromStorage(): {
  brightness: number;
  contrast: number;
} {
  if (typeof window === "undefined") return { brightness: 100, contrast: 100 };
  const b = Number(localStorage.getItem(LS_BRIGHT));
  const c = Number(localStorage.getItem(LS_CONTRAST));
  return {
    brightness: Number.isFinite(b) && b > 0 ? b : 100,
    contrast: Number.isFinite(c) && c > 0 ? c : 100,
  };
}

export function persistLobbyDisplay(brightness: number, contrast: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_BRIGHT, String(brightness));
  localStorage.setItem(LS_CONTRAST, String(contrast));
}

function randomGuestTag(): string {
  return `Invitado-${Math.random().toString(36).slice(2, 6)}`;
}

function isLobbyRoomReady(): boolean {
  const r = colyseusClient.getSocket();
  return (
    !!r?.connection.isOpen &&
    colyseusClient.getJoinedRoomName() === frameworkLobbyRoomName
  );
}

/**
 * ES: Contador a nivel módulo: al remontar GameLobby (Strict Mode, Fast Refresh) el ref del
 *     efecto anterior no debe provocar disconnect del lobby ya reconectado.
 * EN: Module-level counter so remounts (Strict Mode, HMR) don’t disconnect the new lobby socket.
 */
let gameLobbyDisconnectGeneration = 0;

/**
 * ES: Lobby multijugador — estilo “AAA”, chat global Colyseus, salas reales, perfil en DB.
 * EN: Multiplayer lobby — AAA-style UI, Colyseus global chat, real rooms, DB-backed profile.
 */
export default function GameLobby({
  onEnterRoom,
  onOpenAuth,
  isAuthenticated,
  accountUserId,
  meProfile,
  onProfileUpdated,
  brightness,
  contrast,
  onBrightnessChange,
  onContrastChange,
}: Props) {
  const [portal, setPortal] = useState<PortalPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [presence, setPresence] = useState<LobbyPresenceRow[]>([]);
  const [chatMessages, setChatMessages] = useState<LobbyChatRow[]>([]);
  const [chatStatus, setChatStatus] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [guestDisplayName, setGuestDisplayName] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: "", bio: "" });
  const [localReady, setLocalReady] = useState(false);
  const lobbyScrollRef = useRef<HTMLDivElement>(null);
  const chatMessagesScrollRef = useRef<HTMLDivElement>(null);
  const lastLobbySetName = useRef<string | null>(null);
  const lobbyHandlersSessionRef = useRef<string | null>(null);
  const lobbyJoinOptionsRef = useRef({
    displayName: "",
    userId: null as string | null,
  });
  const authNameForLobbyRef = useRef({
    isAuthenticated: false,
    displayName: "",
  });

  lobbyJoinOptionsRef.current = {
    displayName: isAuthenticated
      ? (meProfile?.displayName?.trim() || "Jugador").slice(0, 48)
      : guestDisplayName.trim().slice(0, 48),
    userId: accountUserId,
  };
  authNameForLobbyRef.current = {
    isAuthenticated,
    displayName: (meProfile?.displayName?.trim() || "").slice(0, 48),
  };

  const attachLobbyHandlers = useCallback((room: Room) => {
    if (lobbyHandlersSessionRef.current === room.sessionId) return;
    lobbyHandlersSessionRef.current = room.sessionId;

    const onPresence = (data: { clients?: LobbyPresenceRow[] }) => {
      setPresence(Array.isArray(data.clients) ? data.clients : []);
    };
    const onHistory = (data: { messages?: LobbyChatRow[] }) => {
      setChatMessages(Array.isArray(data.messages) ? data.messages : []);
    };
    const onChat = (msg: LobbyChatRow) => {
      if (msg == null || typeof msg !== "object") return;
      setChatMessages((prev) => [...prev.slice(-120), msg]);
    };

    room.onMessage("lobby:presence", onPresence);
    room.onMessage("lobby:history", onHistory);
    room.onMessage("lobby:chat", onChat);
  }, []);

  const syncAuthDisplayNameToLobby = useCallback(() => {
    const a = authNameForLobbyRef.current;
    if (!a.isAuthenticated || a.displayName.length < 2) return;
    lastLobbySetName.current = a.displayName;
    colyseusClient.sendRoomMessage("lobby:setName", {
      displayName: a.displayName,
    });
  }, []);

  const ensureLobbyRoom = useCallback(async (): Promise<boolean> => {
    if (isLobbyRoomReady()) return true;
    try {
      setChatStatus("Conectando al chat…");
      const opts = lobbyJoinOptionsRef.current;
      await colyseusClient.connect(
        frameworkLobbyRoomName,
        {
          displayName: opts.displayName,
          userId: opts.userId,
        },
        true
      );
      const room = colyseusClient.getSocket();
      if (!room?.connection.isOpen) {
        setChatStatus("Chat no disponible.");
        return false;
      }
      attachLobbyHandlers(room);
      setChatStatus(null);
      syncAuthDisplayNameToLobby();
      return true;
    } catch {
      setChatStatus("No se pudo conectar al chat (¿servidor Colyseus activo?).");
      return false;
    }
  }, [attachLobbyHandlers, syncAuthDisplayNameToLobby]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/public/portal-status");
      const data = (await res.json()) as PortalPayload;
      if (!res.ok) throw new Error("portal-status failed");
      setPortal(data);
    } catch {
      setLoadError("No se pudo cargar la lista de salas.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuthenticated) return;
    const stored = localStorage.getItem(LS_GUEST_LOBBY_NAME)?.trim();
    setGuestDisplayName(stored && stored.length >= 2 ? stored : randomGuestTag());
  }, [isAuthenticated]);

  /**
   * ES: Sin `Math.random` aquí: SSR y primer paint del cliente deben coincidir (hydration).
   * EN: No `Math.random` here — server and first client paint must match (hydration).
   */
  const resolvedDisplayName = useMemo(() => {
    if (isAuthenticated) {
      const n = meProfile?.displayName?.trim();
      if (n) return n.slice(0, 48);
      return "Jugador";
    }
    const g = guestDisplayName.trim();
    if (g.length >= 2) return g.slice(0, 48);
    return "Invitado";
  }, [isAuthenticated, meProfile?.displayName, guestDisplayName]);

  /** ES: Invitados esperan nombre en LS/tag; auth puede conectar ya. EN: Guests wait for display tag; auth connects immediately. */
  const lobbyConnectReady =
    isAuthenticated || guestDisplayName.trim().length >= 2;

  /**
   * ES: NO incluir `resolvedDisplayName` aquí: cada cambio de perfil reconectaba Colyseus y el chat fallaba o perdía mensajes.
   * EN: Omit display name from deps — profile updates were reconnecting Colyseus and breaking chat sends.
   */
  useEffect(() => {
    if (!lobbyConnectReady) return;

    const scheduledGen = ++gameLobbyDisconnectGeneration;
    let cancelled = false;

    (async () => {
      setChatStatus("Conectando al chat…");
      try {
        const opts = lobbyJoinOptionsRef.current;
        await colyseusClient.connect(
          frameworkLobbyRoomName,
          {
            displayName: opts.displayName,
            userId: opts.userId,
          },
          true
        );
        if (cancelled) return;
        const room = colyseusClient.getSocket();
        if (!room?.connection.isOpen) {
          setChatStatus("Chat no disponible.");
          return;
        }

        attachLobbyHandlers(room);
        setChatStatus(null);
        syncAuthDisplayNameToLobby();
      } catch {
        if (!cancelled) {
          setChatStatus("No se pudo conectar al chat (¿servidor Colyseus activo?).");
        }
      }
    })();

    return () => {
      cancelled = true;
      const g = scheduledGen;
      queueMicrotask(() => {
        requestAnimationFrame(() => {
          if (gameLobbyDisconnectGeneration !== g) return;
          lobbyHandlersSessionRef.current = null;
          colyseusClient.disconnect();
        });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconectar solo por cuenta / invitado listo; el nombre se actualiza con lobby:setName
  }, [lobbyConnectReady, accountUserId, isAuthenticated, attachLobbyHandlers, syncAuthDisplayNameToLobby]);

  /** ES: Sincronizar nombre en sala cuando el perfil llega/actualiza sin reconectar. EN: Sync display name when profile loads/updates. */
  useEffect(() => {
    if (!isAuthenticated || !meProfile?.displayName?.trim()) return;
    if (!colyseusClient.isSocketConnected()) return;
    const n = meProfile.displayName.trim().slice(0, 48);
    if (n.length < 2) return;
    if (lastLobbySetName.current === n) return;
    lastLobbySetName.current = n;
    colyseusClient.sendRoomMessage("lobby:setName", { displayName: n });
  }, [isAuthenticated, meProfile?.displayName]);

  /** ES: Evita quedar a mitad de pantalla: scrollIntoView del chat movía el contenedor padre. EN: Reset lobby scroll; chat scrolls only inside its box. */
  useLayoutEffect(() => {
    lobbyScrollRef.current?.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (chatMessages.length === 0) return;
    const el = chatMessagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  useEffect(() => {
    if (!showProfile || !isAuthenticated || !meProfile) return;
    setProfileForm({
      displayName: meProfile.displayName,
      bio: meProfile.bio,
    });
  }, [showProfile, isAuthenticated, meProfile]);

  const setB = (v: number) => {
    onBrightnessChange(v);
    persistLobbyDisplay(v, contrast);
  };
  const setC = (v: number) => {
    onContrastChange(v);
    persistLobbyDisplay(brightness, v);
  };

  const sendChat = () => {
    void (async () => {
      const t = chatDraft.trim();
      if (!t) return;
      if (chatStatus === "Conectando al chat…") return;
      if (!(await ensureLobbyRoom())) {
        setChatStatus("Sin conexión al chat. Espera unos segundos y reintenta.");
        return;
      }
      const ok = colyseusClient.sendRoomMessage("lobby:chat", { text: t });
      if (!ok) {
        setChatStatus("Sin conexión al chat. Espera unos segundos y reintenta.");
        return;
      }
      setChatStatus(null);
      setChatDraft("");
    })();
  };

  const applyGuestName = () => {
    void (async () => {
      const t = guestDisplayName.trim();
      if (t.length < 2) return;
      localStorage.setItem(LS_GUEST_LOBBY_NAME, t);
      if (!(await ensureLobbyRoom())) {
        setChatStatus("No se pudo actualizar el nombre (chat desconectado).");
        return;
      }
      if (
        !colyseusClient.sendRoomMessage("lobby:setName", {
          displayName: t.slice(0, 48),
        })
      ) {
        setChatStatus("No se pudo actualizar el nombre (chat desconectado).");
      }
    })();
  };

  const saveProfile = async () => {
    if (!isAuthenticated) return;
    setProfileSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profileForm.displayName.trim(),
          bio: profileForm.bio.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const err = (j as { error?: string }).error || "No se pudo guardar.";
        const friendly =
          res.status === 503
            ? "Ahora mismo no podemos guardar tu perfil en el servidor (base de datos no disponible). Avísale a quien administra el juego."
            : err;
        alert(friendly);
        return;
      }
      onProfileUpdated();
      setShowProfile(false);
      const name = profileForm.displayName.trim();
      if (name.length >= 2) {
        colyseusClient.sendRoomMessage("lobby:setName", { displayName: name });
        lastLobbySetName.current = name;
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const onlineLabel =
    portal?.totalOnline != null ? `${portal.totalOnline} en línea (aprox.)` : "Multijugador";

  return (
    <div
      ref={lobbyScrollRef}
      className="lobby-scrollbar fixed inset-0 z-[90] overflow-y-auto overflow-x-hidden bg-[#05070a] p-3 font-sans text-slate-200 md:p-6"
    >
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-blue-900/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-purple-900/20 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl sm:p-6 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
              <Globe className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                {portal?.appName ?? "Lobby"}
              </h1>
              <p className="font-mono text-xs uppercase tracking-widest text-cyan-400">
                {portal?.shortName ?? "Nexus"} · {onlineLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isAuthenticated ? (
              <>
                <GameButton
                  type="button"
                  variant="neon"
                  className="!min-h-[44px] !py-2 !text-sm"
                  onClick={() => setShowProfile(true)}
                >
                  <User size={18} />
                  Perfil
                </GameButton>
                <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Conectado
                </span>
              </>
            ) : (
              <GameButton
                type="button"
                variant="neon"
                className="!min-h-[44px] !py-2 !px-4 text-sm"
                onClick={onOpenAuth}
              >
                <LogIn size={18} />
                Iniciar sesión
              </GameButton>
            )}
          </div>
        </header>

        <div className="grid grid-cols-12 gap-5 lg:gap-6">
          {/* Left — presence + chat */}
          <section className="col-span-12 space-y-4 lg:col-span-4">
            <h2 className="flex items-center gap-2 px-1 text-sm font-black uppercase tracking-[0.2em] text-slate-500">
              <Users size={16} />
              En el lobby ({presence.length})
            </h2>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {presence.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/20 px-4 py-6 text-center text-sm text-slate-500">
                  {chatStatus ?? "Nadie más por aquí… aún."}
                </p>
              )}
              {presence.map((p) => (
                <div
                  key={p.sessionId}
                  className="group rounded-2xl border border-white/5 bg-slate-900/60 p-3 transition hover:border-cyan-500/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-slate-800">
                        <Shield size={18} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">
                          {p.displayName}
                        </p>
                        {p.userId && (
                          <p className="text-[10px] font-mono text-cyan-500/80">
                            cuenta vinculada
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!isAuthenticated && (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Tu nombre en el lobby
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={guestDisplayName}
                    onChange={(e) => setGuestDisplayName(e.target.value)}
                    maxLength={48}
                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
                    placeholder="Nombre visible"
                  />
                  <GameButton
                    type="button"
                    variant="classic"
                    className="!min-h-[42px] shrink-0 !py-2 !text-sm"
                    onClick={applyGuestName}
                  >
                    Aplicar
                  </GameButton>
                </div>
              </div>
            )}

            <div className="flex h-52 flex-col rounded-2xl border border-white/5 bg-slate-900/40 p-4 backdrop-blur-md">
              <div className="mb-2 flex items-center gap-2 text-slate-400">
                <MessageSquare size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Chat global del lobby
                </span>
              </div>
              {chatStatus && (
                <p className="mb-2 text-xs text-amber-200/90">{chatStatus}</p>
              )}
              <div
                ref={chatMessagesScrollRef}
                className="lobby-scrollbar flex-1 space-y-2 overflow-y-auto pr-1 text-[13px] font-medium"
              >
                {chatMessages.map((m) => (
                  <p key={m.id}>
                    <span className="text-cyan-400">{m.displayName}:</span>{" "}
                    <span className="text-slate-200">{m.text}</span>
                  </p>
                ))}
              </div>
              <div className="relative mt-2">
                <input
                  type="text"
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendChat();
                  }}
                  disabled={chatStatus === "Conectando al chat…"}
                  placeholder="Escribe un mensaje…"
                  className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-3 pr-3 text-sm transition-colors focus:border-cyan-500/50 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </section>

          {/* Center — hero */}
          <section className="col-span-12 flex flex-col gap-5 lg:col-span-5">
            <div className="relative flex min-h-[280px] flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-slate-800/50 to-transparent">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />
              <div className="relative z-10 text-center">
                <Zap className="mx-auto h-24 w-24 animate-pulse text-cyan-400/25" />
                <p className="mt-4 font-mono text-sm uppercase tracking-[0.35em] text-slate-500">
                  Sala de espera
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
                  Explora el mundo social, trabajos y economía. Elige un servidor
                  para entrar.
                </p>
              </div>

              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-2">
                  <div className="rounded-xl border border-white/10 bg-black/60 px-4 py-2 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Tu nombre en juego
                    </p>
                    <p
                      className="text-lg font-black italic text-white"
                      suppressHydrationWarning
                    >
                      {resolvedDisplayName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => isAuthenticated && setShowProfile(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur transition hover:bg-white/10"
                  title="Perfil"
                >
                  <Settings size={20} className="text-slate-300" />
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                <div className="flex gap-4">
                  <div className="px-3 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                      Estado
                    </p>
                    <p className="font-mono text-xl font-black text-purple-400">
                      {localReady ? "LISTO" : "EXPLORAR"}
                    </p>
                  </div>
                  <div className="hidden h-10 w-px self-center bg-white/10 sm:block" />
                  <div className="px-3 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">
                      Salas
                    </p>
                    <p className="text-xl font-black text-yellow-500">
                      {(portal?.rooms ?? []).length}
                    </p>
                  </div>
                </div>
                <GameButton
                  type="button"
                  variant="neon"
                  onClick={() => setLocalReady((v) => !v)}
                  className={
                    localReady
                      ? "!border-emerald-500 !text-emerald-300 !shadow-emerald-500/20"
                      : ""
                  }
                >
                  {localReady ? "¡Listo para jugar!" : "Marcar listo"}
                </GameButton>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Usa <strong className="text-slate-400">Entrar</strong> en la sala
                que quieras — ahí empieza la partida.
              </p>
            </div>
          </section>

          {/* Right — servers + display */}
          <section className="col-span-12 space-y-4 lg:col-span-3">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-400">
              <Monitor size={18} className="text-cyan-400" />
              Servidores
            </h2>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs text-cyan-500 hover:underline"
            >
              Actualizar lista
            </button>

            {loadError && (
              <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {loadError}
              </p>
            )}

            <ul className="space-y-3">
              {(portal?.rooms ?? []).map((room) => {
                const locked = room.requiresAuth && !isAuthenticated;
                return (
                  <li
                    key={room.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/20"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          room.status === "online"
                            ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                            : "bg-amber-400"
                        }`}
                      />
                      <span className="font-semibold text-white">
                        {room.displayName}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-slate-500">
                      {room.colyseusRoomName} · máx. {room.maxPlayers}
                    </p>
                    {locked ? (
                      <GameButton
                        type="button"
                        variant="retro"
                        className="mt-3 w-full !min-h-[44px] !text-sm"
                        onClick={onOpenAuth}
                      >
                        Cuenta requerida
                      </GameButton>
                    ) : (
                      <GameButton
                        type="button"
                        variant="start"
                        className="mt-3 w-full !min-h-[48px] !text-base"
                        onClick={() => onEnterRoom(room)}
                      >
                        <Play className="fill-current" size={20} />
                        Entrar
                      </GameButton>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <SunMedium size={16} className="text-amber-300" />
                Pantalla
              </h3>
              <label className="mt-2 block text-xs font-medium text-slate-300">
                Brillo {brightness}%
                <input
                  type="range"
                  min={60}
                  max={140}
                  value={brightness}
                  onChange={(e) => setB(Number(e.target.value))}
                  className="mt-2 w-full accent-cyan-500"
                />
              </label>
              <label className="mt-2 block text-xs font-medium text-slate-300">
                Contraste {contrast}%
                <input
                  type="range"
                  min={60}
                  max={140}
                  value={contrast}
                  onChange={(e) => setC(Number(e.target.value))}
                  className="mt-2 w-full accent-violet-500"
                />
              </label>
              <GameButton
                type="button"
                variant="classic"
                className="mt-3 w-full !text-sm"
                onClick={() => {
                  setB(100);
                  setC(100);
                }}
              >
                Restablecer
              </GameButton>
            </div>
          </section>
        </div>
      </div>

      {showProfile && isAuthenticated && meProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="lobby-scrollbar max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-cyan-500/20 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Tu perfil</h3>
              <button
                type="button"
                onClick={() => setShowProfile(false)}
                className="text-2xl leading-none text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-400">
              <span className="text-slate-300">
                Este nombre se muestra en el lobby y en la partida.
              </span>{" "}
              Puedes cambiarlo cuando quieras; lo guardamos de forma segura en el
              servidor.{" "}
              <span className="text-slate-500">
                (EN: This name appears in the lobby and in-game; you can update it
                anytime.)
              </span>
            </p>
            {meProfile.image && (
              <img
                src={meProfile.image}
                alt=""
                className="mx-auto mb-4 h-16 w-16 rounded-full border border-white/10 object-cover"
              />
            )}
            <label className="block text-xs font-medium text-slate-300">
              Nombre en juego
              <input
                value={profileForm.displayName}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, displayName: e.target.value }))
                }
                maxLength={48}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-slate-300">
              Bio (opcional)
              <textarea
                value={profileForm.bio}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, bio: e.target.value }))
                }
                maxLength={500}
                rows={3}
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-500/50 focus:outline-none"
              />
            </label>
            {meProfile.email && (
              <p className="mt-2 text-[11px] text-slate-500">
                Cuenta: {meProfile.email}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <GameButton
                type="button"
                variant="neon"
                className="flex-1 !text-sm"
                onClick={() => setShowProfile(false)}
              >
                Cancelar
              </GameButton>
              <GameButton
                type="button"
                variant="start"
                className="flex-1 !text-sm"
                disabled={profileSaving}
                onClick={() => void saveProfile()}
              >
                {profileSaving ? "Guardando…" : "Guardar"}
              </GameButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
