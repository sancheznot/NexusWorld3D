'use client';

import { useState, useEffect, useRef } from 'react';

interface FPSCounterProps {
  className?: string;
}

export default function FPSCounter({ className = '' }: FPSCounterProps) {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationId: number;

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

  const getFPSColor = () => {
    if (fps >= 60) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getFPSStatus = () => {
    if (fps >= 60) return 'Excelente';
    if (fps >= 30) return 'Bueno';
    return 'Bajo';
  };

  return (
    <div 
      ref={fpsRef}
      className={`fixed top-4 right-4 z-50 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg font-mono text-sm ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${fps >= 60 ? 'bg-green-400' : fps >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
        <span className={getFPSColor()}>
          FPS: {fps}
        </span>
        <span className="text-gray-400 text-xs">
          ({getFPSStatus()})
        </span>
      </div>
    </div>
  );
}
