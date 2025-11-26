'use client';

import { useEffect, useState } from 'react';
import { getPhysicsInstance } from '@/hooks/useCannonPhysics';

/**
 * Props del VehicleHUD
 */
interface VehicleHUDProps {
  vehicleId: string;
  visible?: boolean;
  className?: string;
}

/**
 * Componente: Indicador de Marcha
 */
function GearIndicator({ gear }: { gear: number }) {
  const getGearDisplay = (g: number): string => {
    if (g === -1) return 'R';
    if (g === 0) return 'N';
    return g.toString();
  };

  const getGearColor = (g: number): string => {
    if (g === -1) return 'text-red-400'; // Reversa
    if (g === 0) return 'text-gray-400'; // Neutro
    if (g === 1) return 'text-green-400'; // Primera
    if (g <= 3) return 'text-blue-400'; // 2da-3ra
    return 'text-purple-400'; // 4ta-5ta
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        Marcha
      </div>
      <div className={`text-6xl font-bold ${getGearColor(gear)} transition-colors duration-200`}>
        {getGearDisplay(gear)}
      </div>
    </div>
  );
}

/**
 * Componente: Velocímetro
 */
function Speedometer({ speed }: { speed: number }) {
  // Convertir de m/s a km/h
  const speedKmh = Math.abs(speed * 3.6);
  const displaySpeed = Math.round(speedKmh);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        Velocidad
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-white">
          {displaySpeed}
        </span>
        <span className="text-xl font-medium text-gray-400">
          km/h
        </span>
      </div>
      {/* Barra de velocidad visual */}
      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 transition-all duration-200"
          style={{ width: `${Math.min((speedKmh / 80) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Componente: Tacómetro (RPM)
 */
function Tachometer({ rpm }: { rpm: number }) {
  const displayRpm = Math.round(rpm);
  
  // Calcular color según RPM
  const getRpmColor = (r: number): string => {
    if (r < 2000) return 'text-green-400';
    if (r < 4000) return 'text-blue-400';
    if (r < 6000) return 'text-yellow-400';
    return 'text-red-400'; // Zona roja
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        RPM
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${getRpmColor(rpm)} transition-colors duration-200`}>
          {displayRpm}
        </span>
        <span className="text-sm font-medium text-gray-400">
          rpm
        </span>
      </div>
      {/* Barra de RPM visual */}
      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-200 ${
            rpm > 6000 ? 'bg-red-500' : 
            rpm > 4000 ? 'bg-yellow-400' : 
            'bg-green-400'
          }`}
          style={{ width: `${Math.min((rpm / 7000) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Componente Principal: VehicleHUD
 * 
 * Muestra información del vehículo en tiempo real:
 * - Marcha actual (R, N, 1-5)
 * - Velocidad (km/h)
 * - RPM del motor
 */
export default function VehicleHUD({ vehicleId, visible = true, className = '' }: VehicleHUDProps) {
  const [gear, setGear] = useState<number>(1);
  const [speed, setSpeed] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(1000);

  useEffect(() => {
    if (!visible) return;

    // Actualizar datos del vehículo cada frame
    const interval = setInterval(() => {
      const physics = getPhysicsInstance();
      if (!physics) return;

      try {
        // Obtener marcha actual
        const currentGear = physics.getVehicleGear(vehicleId);
        setGear(currentGear);

        // Obtener velocidad actual
        const currentSpeed = physics.getVehicleSpeed(vehicleId);
        setSpeed(currentSpeed);

        // Calcular RPM basado en velocidad y marcha
        // Fórmula: RPM = idle + (velocidad / velocidad_max_marcha) * (redline - idle)
        const gearsMaxSpeeds: Record<string, number> = {
          '-1': 4,
          '1': 5,
          '2': 9,
          '3': 13,
          '4': 17,
          '5': 22,
        };

        const gearKey = currentGear.toString();
        const maxSpeedForGear = gearsMaxSpeeds[gearKey] || 22;
        const speedRatio = Math.abs(currentSpeed) / maxSpeedForGear;
        const calculatedRpm = 1000 + speedRatio * 6000;
        
        setRpm(Math.min(calculatedRpm, 7000)); // Limitar a 7000 RPM
      } catch {
        // Silenciar errores si el vehículo no existe aún
      }
    }, 50); // Actualizar cada 50ms (20 FPS)

    return () => clearInterval(interval);
  }, [vehicleId, visible]);

  if (!visible) return null;

  return (
    <div className={`fixed bottom-8 right-8 ${className}`}>
      {/* Contenedor principal con fondo semi-transparente */}
      <div className="bg-black/70 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl p-6">
        <div className="flex items-center gap-8">
          {/* Indicador de Marcha (más grande, a la izquierda) */}
          <GearIndicator gear={gear} />

          {/* Separador vertical */}
          <div className="w-px h-20 bg-gray-600" />

          {/* Velocímetro y Tacómetro (a la derecha) */}
          <div className="flex flex-col gap-4">
            <Speedometer speed={speed} />
            <Tachometer rpm={rpm} />
          </div>
        </div>

        {/* Indicador de estado (opcional) */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>🚗 Vehículo Activo</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              En línea
            </span>
          </div>
        </div>
      </div>

      {/* Instrucciones (opcional, se puede ocultar después) */}
      <div className="mt-2 text-center">
        <div className="text-xs text-gray-500">
          Presiona <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-300">F</kbd> para salir
        </div>
      </div>
    </div>
  );
}

