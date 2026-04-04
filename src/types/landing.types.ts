/**
 * ES: Configuración pública del landing (editable desde admin, servida vía API).
 * EN: Public landing config (admin-editable, served via API).
 */

export interface LandingFeatureCard {
  icon: string;
  title: string;
  description: string;
}

export interface LandingBrandingConfig {
  title: string;
  titleGradientFrom: string;
  titleGradientTo: string;
  pageBackgroundFrom: string;
  pageBackgroundVia: string;
  pageBackgroundTo: string;
  subtitle: string;
  tagline: string;
  /** ES: URL absoluta o ruta bajo /public. EN: Absolute URL or path under /public. */
  logoUrl: string;
  primaryButtonFrom: string;
  primaryButtonTo: string;
  secondaryButtonFrom: string;
  secondaryButtonTo: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  featureCards: LandingFeatureCard[];
  camerasSectionTitle: string;
  camerasSectionHint: string;
  /** ES: Título del modal de acceso en /game (editable en admin). EN: /game entry modal title. */
  gameLoginTitle: string;
  /** ES: Subtítulo bajo el título (ej. inicia sesión…). EN: Subtitle under game login title. */
  gameLoginSubtitle: string;
  /** ES: Encabezado del bloque de controles. EN: Game controls section heading. */
  gameLoginControlsTitle: string;
}

export const DEFAULT_LANDING_CONFIG: LandingBrandingConfig = {
  title: "NexusWorld3D",
  titleGradientFrom: "#22d3ee",
  titleGradientTo: "#3b82f6",
  pageBackgroundFrom: "#1e3a8a",
  pageBackgroundVia: "#581c87",
  pageBackgroundTo: "#312e81",
  subtitle: "Framework para Mundos 3D Multiplayer",
  tagline:
    "Crea, explora y comparte mundos virtuales sin programación avanzada",
  logoUrl: "",
  primaryButtonFrom: "#06b6d4",
  primaryButtonTo: "#2563eb",
  secondaryButtonFrom: "#a855f7",
  secondaryButtonTo: "#db2777",
  primaryCtaLabel: "🎮 DEMO INTERACTIVO",
  secondaryCtaLabel: "🔐 ACCESO ADMIN",
  featureCards: [
    {
      icon: "🎨",
      title: "Editor Visual 3D",
      description:
        "Crea mundos 3D sin conocimientos de Blender. Arrastra, coloca y personaliza objetos fácilmente.",
    },
    {
      icon: "🌐",
      title: "Multiplayer en Tiempo Real",
      description:
        "Sistema de servidor integrado con Colyseus para experiencias multiplayer fluidas y escalables.",
    },
    {
      icon: "⚡",
      title: "Fácil de Desplegar",
      description:
        "Un solo comando para desplegar en Railway, Vercel o cualquier plataforma. Sin configuración compleja.",
    },
  ],
  camerasSectionTitle: "📹 Cámaras en Tiempo Real",
  camerasSectionHint:
    "Monitoreo de actividad en el mundo - Los números muestran jugadores conectados",
  gameLoginTitle: "NexusWorld3D",
  gameLoginSubtitle:
    "Inicia sesión con Discord o con el enlace mágico por email para entrar al mundo.",
  gameLoginControlsTitle: "🎮 Controles del juego",
};

export function mergeLandingConfig(
  partial: Partial<LandingBrandingConfig> | null | undefined
): LandingBrandingConfig {
  const base: LandingBrandingConfig = { ...DEFAULT_LANDING_CONFIG };
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    featureCards:
      partial.featureCards && partial.featureCards.length > 0
        ? partial.featureCards
        : base.featureCards,
  };
}
