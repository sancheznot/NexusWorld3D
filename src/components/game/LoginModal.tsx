"use client";

import { Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GameButton } from "@/components/ui/GameButton";
import { frameworkDefaultWorldId } from "@/lib/frameworkBranding";
import {
  DEFAULT_LANDING_CONFIG,
  type LandingBrandingConfig,
} from "@/types/landing.types";
import type { PublicAuthFlags } from "@/lib/auth/publicAuthFlags";
import { usePlayerStore } from "@/store/playerStore";
import { useUIStore } from "@/store/uiStore";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** ES: Tras sesión válida y jugador rellenado. EN: After session OK and player set. */
  onLogin: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
}: LoginModalProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { setPlayer } = usePlayerStore();
  const { addNotification } = useUIStore();
  const appliedSessionRef = useRef(false);

  const [cfg, setCfg] = useState<LandingBrandingConfig>(DEFAULT_LANDING_CONFIG);
  const [authFlags, setAuthFlags] = useState<PublicAuthFlags | null>(null);
  const [email, setEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const [cRes, aRes] = await Promise.all([
          fetch("/api/public/landing-config"),
          fetch("/api/public/auth-options"),
        ]);
        const cJson = await cRes.json();
        const aJson = await aRes.json();
        if (cancelled) return;
        if (cJson?.config) setCfg(cJson.config as LandingBrandingConfig);
        if (aJson && typeof aJson.discord === "boolean")
          setAuthFlags(aJson as PublicAuthFlags);
      } catch {
        /* defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const applySessionToPlayer = useCallback(() => {
    if (!session?.user?.id) return;
    const name =
      session.user.name?.trim() ||
      session.user.email?.split("@")[0] ||
      "Jugador";
    setPlayer({
      id: session.user.id,
      username: name,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
      worldId: frameworkDefaultWorldId,
      isOnline: false,
      lastSeen: new Date(),
    });
  }, [session?.user, setPlayer]);

  useEffect(() => {
    if (!isOpen || status !== "authenticated" || !session?.user?.id) return;
    if (appliedSessionRef.current) return;
    appliedSessionRef.current = true;
    applySessionToPlayer();
    onLogin();
  }, [isOpen, status, session?.user?.id, applySessionToPlayer, onLogin]);

  useEffect(() => {
    if (!isOpen) appliedSessionRef.current = false;
  }, [isOpen]);

  const handleDiscord = () => {
    void signIn("discord", { callbackUrl: `${window.location.origin}/game` });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      addNotification({
        id: `err-${Date.now()}`,
        type: "error",
        title: "Email",
        message: "Introduce un email válido / Enter a valid email",
        duration: 4000,
        timestamp: new Date(),
      });
      return;
    }
    const provider = authFlags?.emailProvider;
    if (!provider) return;
    setEmailSending(true);
    try {
      await signIn(provider, {
        email: trimmed,
        callbackUrl: `${window.location.origin}/game`,
        redirect: true,
      });
    } catch {
      addNotification({
        id: `err-${Date.now()}`,
        type: "error",
        title: "Email",
        message: "No se pudo enviar el enlace. Revisa SMTP o Resend.",
        duration: 5000,
        timestamp: new Date(),
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleLeave = () => {
    void signOut({ redirect: false });
    onClose();
    router.push("/");
  };

  if (!isOpen) return null;

  const hasAnyAuth =
    authFlags && (authFlags.discord || authFlags.email);
  const loadingFlags = authFlags === null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 sm:p-4 landscape:p-2 touch-manipulation">
      <div
        className="relative flex max-h-[min(92dvh,920px)] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-cyan-500/25 bg-slate-900/95 shadow-[0_0_40px_rgba(34,211,238,0.12)] backdrop-blur-md
        landscape:max-h-[95dvh] landscape:max-w-3xl landscape:flex-row landscape:items-stretch"
      >
        <button
          type="button"
          onClick={handleLeave}
          className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Salir al inicio / Back to home"
        >
          ×
        </button>

        <div className="min-w-0 flex-1 p-5 pt-11 sm:p-7 landscape:py-5 landscape:pl-6 landscape:pr-4">
          <header className="mb-5 text-center landscape:text-left">
            <h2 className="bg-gradient-to-b from-white to-slate-400 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
              {cfg.gameLoginTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              {cfg.gameLoginSubtitle}
            </p>
          </header>

          {status === "loading" || loadingFlags ? (
            <div className="flex justify-center py-10">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            </div>
          ) : !hasAnyAuth ? (
            <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
              <p>
                No hay proveedores de acceso configurados. Añade en{" "}
                <code className="rounded bg-black/40 px-1">.env.local</code>{" "}
                al menos{" "}
                <code className="rounded bg-black/40 px-1">
                  AUTH_DISCORD_ID
                </code>{" "}
                y{" "}
                <code className="rounded bg-black/40 px-1">
                  AUTH_DISCORD_SECRET
                </code>
                , o base de datos + migración{" "}
                <code className="rounded bg-black/40 px-1">002_auth_nextauth</code>{" "}
                +{" "}
                <code className="rounded bg-black/40 px-1">AUTH_RESEND_KEY</code>{" "}
                / SMTP.
              </p>
              <GameButton
                type="button"
                variant="neon"
                className="w-full"
                onClick={handleLeave}
              >
                Volver al portal
              </GameButton>
            </div>
          ) : (
            <div className="space-y-5">
              {authFlags.discord && (
                <GameButton
                  type="button"
                  variant="modern"
                  className="w-full uppercase tracking-wide text-sm sm:text-base"
                  onClick={handleDiscord}
                >
                  <MessageCircle className="shrink-0" size={22} aria-hidden />
                  Continuar con Discord
                </GameButton>
              )}

              {authFlags.email && authFlags.emailProvider && (
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <label
                    htmlFor="game-login-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Email (enlace mágico)
                  </label>
                  <input
                    id="game-login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    disabled={emailSending}
                    className="w-full min-h-[48px] rounded-xl border border-cyan-500/40 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                  <GameButton
                    type="submit"
                    variant="custom"
                    style={{
                      background:
                        "linear-gradient(to right, #f59e0b, #ea580c)",
                    }}
                    className="w-full uppercase tracking-wide"
                    disabled={emailSending || !email.trim()}
                  >
                    <Mail className="shrink-0" size={20} aria-hidden />
                    {emailSending ? "Enviando…" : "Enviar enlace"}
                  </GameButton>
                </form>
              )}

              {session && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/" })}
                    className="text-xs text-slate-500 underline hover:text-slate-300"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 p-4 sm:p-5 landscape:w-[min(42%,300px)] landscape:border-l landscape:border-t-0">
          <h3 className="mb-3 text-sm font-bold text-cyan-300">
            {cfg.gameLoginControlsTitle}
          </h3>
          <ul className="grid grid-cols-1 gap-1.5 text-xs text-slate-300 sm:text-sm">
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-200">
                WASD
              </kbd>{" "}
              Mover
            </li>
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-200">
                Shift
              </kbd>{" "}
              Correr
            </li>
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-200">
                I
              </kbd>{" "}
              Inventario
            </li>
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-200">
                M
              </kbd>{" "}
              Mapa
            </li>
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-200">
                N
              </kbd>{" "}
              Minimapa
            </li>
            <li>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-200">
                Enter
              </kbd>{" "}
              Chat
            </li>
          </ul>
          <p className="mt-4 text-[11px] leading-snug text-slate-500">
            <Link href="/" className="text-cyan-500/90 hover:underline">
              ← Portal
            </Link>
            {" · "}
            Sesión con cookies HttpOnly (Auth.js).
          </p>
        </div>
      </div>
    </div>
  );
}
