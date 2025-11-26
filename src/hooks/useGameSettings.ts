"use client";

import { useState, useEffect } from "react";
import { GAME_CONFIG } from "@/constants/game";

export interface GameSettings {
  targetFPS: number;
  showFPS: boolean;
  showDebugInfo: boolean;
  graphicsQuality: "low" | "medium" | "high" | "ultra";
  shadows: boolean;
  antiAliasing: boolean;
  vsync: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  resolutionScale: number;
  shadowQuality: "low" | "medium" | "high";
  viewDistance: "short" | "medium" | "long";
  particlesEnabled: boolean;
  postProcessingEnabled: boolean;
}

const defaultSettings: GameSettings = {
  targetFPS: GAME_CONFIG.physics.targetFPS,
  showFPS: true,
  showDebugInfo: process.env.NODE_ENV === "development",
  graphicsQuality: "high",
  shadows: true,
  antiAliasing: true,
  vsync: true,
  masterVolume: 100,
  musicVolume: 80,
  sfxVolume: 90,
  resolutionScale: 1,
  shadowQuality: "medium",
  viewDistance: "medium",
  particlesEnabled: true,
  postProcessingEnabled: true,
};

export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar configuraciones guardadas
  useEffect(() => {
    const savedSettings = localStorage.getItem("gameSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error("Error loading game settings:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Guardar configuraciones
  const updateSettings = (newSettings: Partial<GameSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("gameSettings", JSON.stringify(updated));

    // Aplicar configuraciones inmediatamente
    applySettings(updated);
  };

  // Aplicar configuraciones al juego
  const applySettings = (settingsToApply: GameSettings) => {
    // Aplicar FPS objetivo
    if (typeof window !== "undefined") {
      // Actualizar constantes de física si es necesario
      console.log("🎮 Aplicando configuraciones:", settingsToApply);

      // Mostrar/ocultar FPS counter
      const fpsCounter = document.querySelector("[data-fps-counter]");
      if (fpsCounter) {
        (fpsCounter as HTMLElement).style.display = settingsToApply.showFPS
          ? "block"
          : "none";
      }

      // Aplicar configuraciones de audio (si hay sistema de audio)
      if (settingsToApply.masterVolume !== undefined) {
        document.documentElement.style.setProperty(
          "--master-volume",
          `${settingsToApply.masterVolume / 100}`
        );
      }
    }
  };

  // Resetear a valores por defecto
  const resetToDefaults = () => {
    setSettings(defaultSettings);
    localStorage.setItem("gameSettings", JSON.stringify(defaultSettings));
    applySettings(defaultSettings);
  };

  return {
    settings,
    isLoaded,
    updateSettings,
    resetToDefaults,
    applySettings,
  };
}
