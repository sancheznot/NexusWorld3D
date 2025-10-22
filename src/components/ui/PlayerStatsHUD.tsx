'use client';

import { usePlayerStore } from '@/store/playerStore';
import { economy } from '@/lib/services/economy';
import { useState, useEffect } from 'react';

// Sistema de mapas/ubicaciones
const MAP_LOCATIONS = {
  'exterior': '🏙️ Ciudad Exterior',
  'hotel-interior': '🏨 Hotel Humboldt',
  'police-station': '🚔 Comisaría',
  'bank': '🏦 Banco Central',
  'hospital': '🏥 Hospital',
  'city-hall': '🏛️ Ayuntamiento',
  'fire-station': '🚒 Estación de Bomberos',
  'cafe': '☕ Café Central',
  'shop': '🛒 Tienda',
  'park': '🌳 Parque Central'
} as const;

type MapLocation = keyof typeof MAP_LOCATIONS;

interface PlayerStatsHUDProps {
  className?: string;
}

export default function PlayerStatsHUD({ className = '' }: PlayerStatsHUDProps) {
  const { health, maxHealth, stamina, maxStamina, hunger, maxHunger, position, isMoving, isRunning } = usePlayerStore();
  const [balance, setBalance] = useState(0);
  const [isConnected] = useState(true);
  const [currentMap, setCurrentMap] = useState<MapLocation>('exterior');
  // Posición y movimiento vienen del store; no simular aquí

  // Cargar balance del jugador
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const bal = await economy.getBalance('current-player');
        setBalance(bal);
      } catch (error) {
        console.error('Error loading balance:', error);
      }
    };
    loadBalance();
  }, []);

  // Simular cambio de mapa (por ahora)
  useEffect(() => {
    const maps: MapLocation[] = ['exterior', 'hotel-interior', 'police-station', 'bank', 'hospital'];
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % maps.length;
      setCurrentMap(maps[currentIndex]);
    }, 10000); // Cambia cada 10 segundos para demo

    return () => clearInterval(interval);
  }, []);

  // Posición real: ya viene del store (no simular ni intervalos aquí)

  const getHealthColor = () => {
    const percentage = (health / maxHealth) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStaminaColor = () => {
    const percentage = (stamina / maxStamina) * 100;
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getHungerColor = () => {
    const percentage = (hunger / maxHunger) * 100;
    if (percentage >= 60) return 'bg-orange-500';
    if (percentage >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <>
      {/* Conexión, dinero y stats - Arriba derecha */}
      <div className="fixed top-4 right-4 z-10 flex flex-col items-end space-y-2">
        {/* Conexión */}
        <div className="bg-black bg-opacity-75 rounded-lg px-3 py-2 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-white text-sm font-medium">{isConnected ? 'Conectado' : 'Desconectado'}</span>
        </div>
        
        {/* Dinero */}
        <div className="bg-black bg-opacity-75 rounded-lg px-3 py-2 flex items-center space-x-2">
          <span className="text-yellow-400 text-lg">₿</span>
          <span className="text-white font-bold text-lg">{balance.toLocaleString()}</span>
        </div>

        {/* Salud */}
        <div className="bg-black bg-opacity-80 rounded-lg p-3 min-w-[200px] border border-gray-600">
          <div className="flex items-center justify-between text-white text-sm mb-2">
            <span className="flex items-center space-x-2">
              <span className="text-red-500">❤️</span>
              <span>Salud</span>
            </span>
            <span className="font-mono text-xs">{health}/{maxHealth}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getHealthColor()}`}
              style={{ width: `${(health / maxHealth) * 100}%` }}
            />
          </div>
        </div>

        {/* Energía */}
        <div className="bg-black bg-opacity-80 rounded-lg p-3 min-w-[200px] border border-gray-600">
          <div className="flex items-center justify-between text-white text-sm mb-2">
            <span className="flex items-center space-x-2">
              <span className="text-blue-500">⚡</span>
              <span>Energía</span>
            </span>
            <span className="font-mono text-xs">{stamina}/{maxStamina}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getStaminaColor()}`}
              style={{ width: `${(stamina / maxStamina) * 100}%` }}
            />
          </div>
        </div>

        {/* Hambre */}
        <div className="bg-black bg-opacity-80 rounded-lg p-3 min-w-[200px] border border-gray-600">
          <div className="flex items-center justify-between text-white text-sm mb-2">
            <span className="flex items-center space-x-2">
              <span className="text-orange-500">🍖</span>
              <span>Hambre</span>
            </span>
            <span className="font-mono text-xs">{hunger}/{maxHunger}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getHungerColor()}`}
              style={{ width: `${(hunger / maxHunger) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Posicionamiento - Esquina inferior izquierda */}
      <div className="fixed bottom-4 left-4 z-10 bg-black bg-opacity-80 rounded-lg p-3 text-white border border-gray-600">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">📍</span>
            <span className="text-sm font-medium">Posición</span>
          </div>
          <div className="text-xs font-mono bg-gray-800 rounded px-2 py-1">
            X: {position.x.toFixed(1)} | Y: {position.y.toFixed(1)} | Z: {position.z.toFixed(1)}
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isMoving ? (isRunning ? 'bg-orange-400' : 'bg-blue-400') : 'bg-gray-400'}`}></div>
            <span className="text-xs">
              {isMoving ? (isRunning ? '🏃 Corriendo' : '🚶 Caminando') : '⏸️ Inmóvil'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
