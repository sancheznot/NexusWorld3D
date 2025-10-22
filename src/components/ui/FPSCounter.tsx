'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameSettings } from '@/hooks/useGameSettings';

interface FPSCounterProps {
  className?: string;
}

export default function FPSCounter({ className = '' }: FPSCounterProps) {
  const { settings, isLoaded } = useGameSettings();
  const [fps, setFps] = useState(0);
  const [refreshRate, setRefreshRate] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationId: number;

    // Detectar refresh rate del monitor
    const detectRefreshRate = () => {
      const start = performance.now();
      let frames = 0;
      
      const checkFrame = () => {
        frames++;
        if (frames < 60) {
          requestAnimationFrame(checkFrame);
        } else {
          const end = performance.now();
          let rate = Math.round(1000 / ((end - start) / frames));
          // Heurística: algunos navegadores reportan ~6 cuando es 60
          if (rate < 20 && fps >= 30) rate = rate * 10;
          // Redondear a tasas comunes
          const common = [30, 45, 50, 60, 75, 90, 120, 144, 165, 240];
          const nearest = common.reduce((a, b) => Math.abs(b - rate) < Math.abs(a - rate) ? b : a, common[0]);
          setRefreshRate(nearest);
        }
      };
      
      requestAnimationFrame(checkFrame);
    };

    detectRefreshRate();

    const updateFPS = (currentTime: number) => {
      frameCount.current++;
      
      if (currentTime - lastTime.current >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / (currentTime - lastTime.current)));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      
      animationId = requestAnimationFrame(updateFPS);
    };

    animationId = requestAnimationFrame(updateFPS);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // No mostrar si está deshabilitado en configuraciones
  if (!isLoaded || !settings.showFPS) {
    return null;
  }

  const getFPSColor = () => {
    if (fps >= 120) return 'text-green-400';
    if (fps >= 90) return 'text-green-300';
    if (fps >= 60) return 'text-yellow-400';
    if (fps >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getFPSStatus = () => {
    if (fps >= 120) return 'Excelente';
    if (fps >= 90) return 'Muy Bueno';
    if (fps >= 60) return 'Bueno';
    if (fps >= 30) return 'Aceptable';
    return 'Bajo';
  };

  return (
    <div 
      ref={fpsRef}
      className={`bg-black bg-opacity-75 text-white px-2 py-1 rounded font-mono text-xs ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${fps >= 60 ? 'bg-green-400' : fps >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
          <span className={getFPSColor()}>
            FPS: {fps}
          </span>
          <span className="text-gray-400 text-xs">
            ({getFPSStatus()})
          </span>
        </div>
        {refreshRate > 0 && (
          <div className="text-xs text-gray-400">
            Monitor: {refreshRate}Hz
            {fps === refreshRate && fps < 120 && (
              <span className="text-yellow-400 ml-1">(VSync?)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
