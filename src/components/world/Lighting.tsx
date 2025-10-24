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

      {/* Sun */}
      <directionalLight
        color={THREE_CONFIG.lighting.directional.color}
        intensity={sunIntensity}
        position={[
          THREE_CONFIG.lighting.directional.position.x,
          THREE_CONFIG.lighting.directional.position.y,
          THREE_CONFIG.lighting.directional.position.z,
        ]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Fill lights */}
      <directionalLight color={0xffffff} intensity={0.4 * Math.max(0.1, ambientFactor)} position={[0, -10, 0]} />
      <directionalLight color={0xffffff} intensity={0.25 * Math.max(0.1, ambientFactor)} position={[-20, 10, -20]} />

      {/* Moonlight (directional) */}
      {isNightLike && (
        <directionalLight
          color={0xbfd7ff}
          intensity={0.35}
          position={[-30, 12, -10]}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={80}
        />
      )}

      {/* Player-following moon point light for near illumination */}
      {isNightLike && (
        <pointLight color={0xaec6ff} intensity={0.7} distance={15} decay={2} position={[position.x, position.y + 2.5, position.z]} />
      )}
    </>
  );
}
