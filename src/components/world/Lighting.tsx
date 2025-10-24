'use client';

import { THREE_CONFIG } from '@/config/three.config';
import { useTimeStore } from '@/store/timeStore';
import { usePlayerStore } from '@/store/playerStore';

export default function Lighting() {
  const ambientFactor = useTimeStore((s) => s.ambientFactor);
  const sunFactor = useTimeStore((s) => s.sunFactor);
  const phase = useTimeStore((s) => s.phase);
  const { position } = usePlayerStore();

  const ambientIntensity = THREE_CONFIG.lighting.ambient.intensity * Math.max(0.05, ambientFactor);
  const sunIntensity = THREE_CONFIG.lighting.directional.intensity * Math.max(0.0, sunFactor);

  const isNightLike = phase === 'night' || phase === 'dusk';

  return (
    <>
      <ambientLight
        color={THREE_CONFIG.lighting.ambient.color}
        intensity={ambientIntensity}
      />

      <directionalLight
        color={THREE_CONFIG.lighting.directional.color}
        intensity={sunIntensity}
        position={[
          THREE_CONFIG.lighting.directional.position.x,
          THREE_CONFIG.lighting.directional.position.y,
          THREE_CONFIG.lighting.directional.position.z,
        ]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />

      {/* Luz de relleno inferior (suave) */}
      <directionalLight
        color={0xffffff}
        intensity={0.4 * Math.max(0.1, ambientFactor)}
        position={[0, -10, 0]}
      />

      {/* Luz de relleno lateral suave */}
      <directionalLight
        color={0xffffff}
        intensity={0.25 * Math.max(0.1, ambientFactor)}
        position={[-20, 10, -20]}
      />

      {/* Sistema de Luna: luces cercanas y laterales activas de noche/anochecer */}
      {isNightLike && (
        <>
          {/* Point light que sigue al jugador para iluminar entorno cercano */}
          <pointLight
            color={0xaec6ff}
            intensity={0.7}
            distance={15}
            decay={2}
            position={[position.x, position.y + 2.5, position.z]}
          />
          {/* Luz direccional lateral fría (simula luna baja en horizonte) */}
          <directionalLight
            color={0xbfd7ff}
            intensity={0.35}
            position={[-30, 12, -10]}
            castShadow
          />
        </>
      )}
    </>
  );
}
