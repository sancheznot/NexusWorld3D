"use client";

import Link from "next/link";
import LiveCameras from "@/components/ui/LiveCameras";
import LiveCameraPreview from "@/components/cameras/LiveCameraPreview";
import { useEffect, useState } from "react";
import {
  DEFAULT_LANDING_CONFIG,
  type LandingBrandingConfig,
} from "@/types/landing.types";

export type FrameworkPresentationCtaTarget = "admin-login" | "admin-landing-tab";

type Props = {
  /**
   * ES: admin-landing-tab = CTA secundario abre pestaña Portal en el mismo admin.
   * EN: admin-landing-tab = secondary CTA jumps to Portal tab in admin.
   */
  ctaTarget?: FrameworkPresentationCtaTarget;
};

/**
 * ES: Vista larga tipo “framework / producto” (antes era la home pública).
 * EN: Long-form framework/product view (formerly the public home page).
 */
export default function FrameworkPresentation({
  ctaTarget = "admin-login",
}: Props) {
  const [showCameras, setShowCameras] = useState(false);
  const [cfg, setCfg] = useState<LandingBrandingConfig>(DEFAULT_LANDING_CONFIG);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/landing-config");
        const data = await res.json();
        if (!cancelled && data?.config) {
          setCfg(data.config as LandingBrandingConfig);
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pageBg = {
    background: `linear-gradient(to bottom right, ${cfg.pageBackgroundFrom}, ${cfg.pageBackgroundVia}, ${cfg.pageBackgroundTo})`,
  };

  const titleStyle = {
    backgroundImage: `linear-gradient(to right, ${cfg.titleGradientFrom}, ${cfg.titleGradientTo})`,
  };

  const primaryBtn = {
    background: `linear-gradient(to right, ${cfg.primaryButtonFrom}, ${cfg.primaryButtonTo})`,
  };

  const secondaryBtn = {
    background: `linear-gradient(to right, ${cfg.secondaryButtonFrom}, ${cfg.secondaryButtonTo})`,
  };

  const secondaryHref =
    ctaTarget === "admin-landing-tab"
      ? "/admin/panel?tab=landing"
      : "/admin/login";
  const secondaryLabel =
    ctaTarget === "admin-landing-tab"
      ? "⚙️ Editar portal público / Edit public portal copy"
      : cfg.secondaryCtaLabel;

  return (
    <div className="min-h-screen text-white" style={pageBg}>
      {showCameras && <LiveCameraPreview />}

      <div className="text-center max-w-6xl mx-auto px-8 py-12">
        <div className="mb-12">
          {cfg.logoUrl ? (
            <div className="mb-6 flex justify-center">
              <img
                src={cfg.logoUrl}
                alt=""
                className="max-h-24 w-auto object-contain drop-shadow-lg"
              />
            </div>
          ) : null}
          <h1
            className="text-6xl md:text-8xl font-bold mb-4 bg-clip-text text-transparent"
            style={titleStyle}
          >
            {cfg.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-2">{cfg.subtitle}</p>
          <p className="text-lg text-gray-400">{cfg.tagline}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {cfg.featureCards.map((card, i) => (
            <div
              key={`${card.title}-${i}`}
              className="bg-black bg-opacity-30 rounded-lg p-6 backdrop-blur-sm"
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="text-xl font-bold mb-2">{card.title}</h3>
              <p className="text-gray-300">{card.description}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/game"
              className="inline-block text-white font-bold text-xl px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-2xl"
              style={primaryBtn}
            >
              {cfg.primaryCtaLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="inline-block text-white font-bold text-xl px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-2xl"
              style={secondaryBtn}
            >
              {secondaryLabel}
            </Link>
          </div>

          <div className="text-sm text-gray-400">
            <p>
              Demo: WASD para mover, Click para interactuar | Editor: Arrastra y
              coloca objetos
            </p>
            <p>Multiplayer en tiempo real | Sin instalación requerida</p>
          </div>
        </div>

        <div className="mt-16 bg-black bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                {cfg.camerasSectionTitle}
              </h3>
              <p className="text-sm text-gray-400 mt-1">{cfg.camerasSectionHint}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCameras(!showCameras)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
            >
              {showCameras ? "Ocultar" : "Ver Cámaras"}
            </button>
          </div>

          {showCameras ? (
            <>
              <div className="mb-4 p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-500 border-opacity-30">
                <p className="text-sm text-green-200">
                  🔴 <strong>STREAMING EN VIVO:</strong> Video en tiempo real a{" "}
                  <strong>60 FPS</strong> (actualización cada 16ms). Conectado al
                  servidor Colyseus. Verás el mundo 3D REAL y jugadores moviéndose
                  fluidamente.
                </p>
                <p className="text-xs text-green-300 mt-2">
                  💡 Tip: Entra al juego PRIMERO, luego ve las cámaras para verte en
                  vivo. Abre consola (F12) para ver logs.
                </p>
              </div>
              <LiveCameras className="mt-4" />
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-5xl mb-4">📹</div>
              <div className="text-lg">
                Haz clic en &quot;Ver Cámaras&quot; para ver el monitoreo del mundo
                en tiempo real
              </div>
              <div className="text-sm mt-2 text-gray-500">
                Visualiza la actividad de jugadores en diferentes zonas
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-black bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold mb-4">⚡ Estado del Framework</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                <span>Servidor Colyseus Multiplayer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                <span>Motor 3D Three.js + React Three Fiber</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                <span>Panel de Administración</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                <span>Integración S3 + CDN</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span>Editor 3D Visual (En desarrollo)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                <span>Despliegue Automático</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                <span>Documentación Completa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-500 rounded-full" />
                <span>Marketplace de Assets</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
