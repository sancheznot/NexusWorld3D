'use client';

import { usePlayerStore } from '@/store/playerStore';
import { useEffect, useState } from 'react';

interface DebugInfoProps {
  vehSpawn: { x: number; y: number; z: number } | null;
}

export default function DebugInfo({ vehSpawn }: DebugInfoProps) {
  // Nos suscribimos a la posición de forma selectiva o usamos un ref/interval para no renderizar 60fps el texto
  // O simplemente aceptamos que este componente pequeño se renderice mucho, pero aislado del Canvas
  const position = usePlayerStore((s) => s.position);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || process.env.NODE_ENV !== "development" || !vehSpawn)
    return null;

  return (
    <div className="pointer-events-none absolute bottom-32 left-4 z-20 rounded bg-blue-900/80 p-2 text-xs text-white">
      <>
        <div className="mb-1 font-bold">🚗 Vehículo (dev)</div>
        <div>
          X: {vehSpawn.x.toFixed(1)} · Y: {vehSpawn.y.toFixed(1)} · Z:{" "}
          {vehSpawn.z.toFixed(1)}
        </div>
        <div className="mt-1 font-bold">
          📏 Dist. al coche:{" "}
          {Math.sqrt(
            Math.pow(vehSpawn.x - position.x, 2) +
              Math.pow(vehSpawn.z - position.z, 2)
          ).toFixed(1)}
          m
        </div>
      </>
    </div>
  );
}
