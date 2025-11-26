'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string) => void;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setPlayer } = usePlayerStore();
  const { addNotification } = useUIStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      addNotification({
        id: `error-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'Por favor ingresa un nombre de usuario',
        duration: 3000,
        timestamp: new Date(),
      });
      return;
    }

    if (username.length < 3) {
      addNotification({
        id: `error-${Date.now()}`,
        type: 'error',
        title: 'Error',
        message: 'El nombre de usuario debe tener al menos 3 caracteres',
        duration: 3000,
        timestamp: new Date(),
      });
      return;
    }

    setIsLoading(true);

    // Simulate login process
    setTimeout(() => {
      const playerData = {
        id: `player-${Date.now()}`,
        username: username.trim(),
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        level: 1,
        experience: 0,
        worldId: 'default',
        isOnline: false, // Will be set to true when joining the game
        lastSeen: new Date(),
      };

      setPlayer(playerData);
      onLogin(username.trim());
      setIsLoading(false);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
          disabled={isLoading}
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            🏨 Hotel Humboldt
          </h2>
          <p className="text-gray-300">
            Ingresa tu nombre de usuario para comenzar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre de Usuario
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu nombre..."
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              disabled={isLoading}
              autoFocus
              maxLength={20}
            />
            <p className="text-xs text-gray-400 mt-1">
              Mínimo 3 caracteres, máximo 20
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Conectando...
                </div>
              ) : (
                'Continuar'
              )}
            </button>
          </div>
        </form>

        {/* Game Info */}
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-sm font-bold text-yellow-400 mb-2">🎮 Controles del Juego</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <div><kbd className="bg-gray-600 px-1 py-0.5 rounded">WASD</kbd> Mover</div>
            <div><kbd className="bg-gray-600 px-1 py-0.5 rounded">Shift</kbd> Correr</div>
            <div><kbd className="bg-gray-600 px-1 py-0.5 rounded">I</kbd> Inventario</div>
            <div><kbd className="bg-gray-600 px-1 py-0.5 rounded">M</kbd> Mapa</div>
            <div><kbd className="bg-gray-600 px-1 py-0.5 rounded">N</kbd> Minimapa</div>
            <div><kbd className="bg-gray-600 px-1 py-0.5 rounded">Enter</kbd> Chat</div>
          </div>
        </div>
      </div>
    </div>
  );
}
