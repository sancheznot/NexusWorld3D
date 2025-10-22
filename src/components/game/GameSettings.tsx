'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useGameSettings } from '@/hooks/useGameSettings';
import type { GameSettings } from '@/hooks/useGameSettings';

interface GameSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameSettings({ isOpen, onClose }: GameSettingsProps) {
  const { isInventoryOpen, isMapOpen, isChatOpen, closeAllModals } = useUIStore();
  const { settings, isLoaded, updateSettings, resetToDefaults } = useGameSettings();

  // Manejar teclas
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSettingChange = (key: keyof GameSettings, value: any) => {
    updateSettings({ [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div 
        className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto settings-modal"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4B5563 #1F2937'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-2xl font-bold">⚙️ Configuración del Juego</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Rendimiento */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white text-lg font-semibold mb-4">🚀 Rendimiento</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">
                  FPS Objetivo: {settings.targetFPS}
                </label>
                <input
                  type="range"
                  min="30"
                  max="240"
                  step="30"
                  value={settings.targetFPS}
                  onChange={(e) => handleSettingChange('targetFPS', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>30</span>
                  <span>60</span>
                  <span>90</span>
                  <span>120</span>
                  <span>240</span>
                </div>
              </div>

              <div>
                <label className="block text-white text-sm mb-2">
                  Calidad Gráfica
                </label>
                <select
                  value={settings.graphicsQuality}
                  onChange={(e) => handleSettingChange('graphicsQuality', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">VSync</span>
                <button
                  onClick={() => handleSettingChange('vsync', !settings.vsync)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.vsync ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.vsync ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white text-lg font-semibold mb-4">🎨 Gráficos</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Sombras</span>
                <button
                  onClick={() => handleSettingChange('shadows', !settings.shadows)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.shadows ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.shadows ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Anti-Aliasing</span>
                <button
                  onClick={() => handleSettingChange('antiAliasing', !settings.antiAliasing)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.antiAliasing ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.antiAliasing ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Interfaz */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white text-lg font-semibold mb-4">🖥️ Interfaz</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Mostrar FPS</span>
                <button
                  onClick={() => handleSettingChange('showFPS', !settings.showFPS)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.showFPS ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.showFPS ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Info de Debug</span>
                <button
                  onClick={() => handleSettingChange('showDebugInfo', !settings.showDebugInfo)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.showDebugInfo ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.showDebugInfo ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Audio */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white text-lg font-semibold mb-4">🔊 Audio</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm mb-2">
                  Volumen General: {settings.masterVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.masterVolume}
                  onChange={(e) => handleSettingChange('masterVolume', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-white text-sm mb-2">
                  Música: {settings.musicVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.musicVolume}
                  onChange={(e) => handleSettingChange('musicVolume', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-white text-sm mb-2">
                  Efectos: {settings.sfxVolume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sfxVolume}
                  onChange={(e) => handleSettingChange('sfxVolume', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              onClick={resetToDefaults}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            >
              🔄 Restaurar Predeterminados
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ✅ Aplicar y Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
