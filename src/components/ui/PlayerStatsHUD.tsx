'use client';

import { usePlayerStore } from '@/store/playerStore';
import { economy } from '@/lib/services/economy';
import economyClient from '@/lib/colyseus/EconomyClient';
import { GAME_CONFIG } from '@/constants/game';
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
  isDriving?: boolean;
}

export default function PlayerStatsHUD({ className = '', isDriving = false }: PlayerStatsHUDProps) {
  const { health, maxHealth, stamina, maxStamina, hunger, maxHunger, position, isMoving, isRunning } = usePlayerStore();
  const [balance, setBalance] = useState(0);
  const [limitsUsed, setLimitsUsed] = useState<{ deposit: number; withdraw: number; transfer: number } | null>(null);
  const [isConnected] = useState(true);
  const [currentMap, setCurrentMap] = useState<MapLocation>('exterior');
  // Posición y movimiento vienen del store; no simular aquí

  // Cargar balance del jugador (solo monedero)
  useEffect(() => {
    const onWallet = (data: unknown) => {
      const v = (data as number) ?? 0;
      // Normalizar por si llega en minor units por error (fallback seguro)
      setBalance(v >= 10000 ? v / 100 : v);
    };
    economyClient.on('economy:wallet', onWallet);
    const onUsed = (data: unknown) => setLimitsUsed(data as { deposit: number; withdraw: number; transfer: number });
    economyClient.on('economy:limitsUsed', onUsed);
    economyClient.requestState();
    return () => {
      economyClient.off('economy:wallet', onWallet);
      economyClient.off('economy:limitsUsed', onUsed);
    };
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
          <span className="text-yellow-400 text-lg">{GAME_CONFIG.currency.symbol}</span>
          {/* Evitar símbolo duplicado; asegurar que balance está en unidades mayores */}
          <span className="text-white font-bold text-lg">{economy.format(balance, { withSymbol: false })}</span>
        </div>

        {/* Límites diarios (usado / máximo) */}
        {(
          limitsUsed || {
            deposit: 0,
            withdraw: 0,
            transfer: 0,
          }
        ) && (
          <div className="bg-black bg-opacity-75 rounded-lg px-3 py-2 text-xs text-gray-200 space-y-1 border border-gray-700">
            <div className="flex items-center justify-between gap-3">
              <span className="text-green-300">⬆ Dep</span>
              <span className="font-mono">{economy.format((limitsUsed?.deposit ?? 0))} / {economy.format(GAME_CONFIG.currency.maxDailyDeposit)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-orange-300">⬇ Ret</span>
              <span className="font-mono">{economy.format((limitsUsed?.withdraw ?? 0))} / {economy.format(GAME_CONFIG.currency.maxDailyWithdraw)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-blue-300">↔ Trans</span>
              <span className="font-mono">{economy.format((limitsUsed?.transfer ?? 0))} / {economy.format(GAME_CONFIG.currency.maxDailyTransfer)}</span>
            </div>
          </div>
        )}

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
            <div className={`w-2 h-2 rounded-full ${isDriving ? 'bg-purple-400' : isMoving ? (isRunning ? 'bg-orange-400' : 'bg-blue-400') : 'bg-gray-400'}`}></div>
            <span className="text-xs">
              {isDriving ? '🚗 Manejando' : isMoving ? (isRunning ? '🏃 Corriendo' : '🚶 Caminando') : '⏸️ Inmóvil'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
