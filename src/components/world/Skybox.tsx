'use client';

import { useLoader } from '@react-three/fiber';
import { TextureLoader, Color } from 'three';
import { useTimeStore } from '@/store/timeStore';
import SunMoon from '@/components/world/SunMoon';
import { useMemo } from 'react';

export default function Skybox() {
  const phase = useTimeStore((s) => s.phase);

  // ✅ PRECARGAR AMBAS TEXTURAS - Evita re-render al cambiar
  const dayPath = '/models/sky/sky_43_2k.png';
  const nightPath = '/models/sky/sky_17_2k.png';
  const [dayTexture, nightTexture] = useLoader(TextureLoader, [dayPath, nightPath]);

  // Seleccionar textura según fase
  const isNightLike = phase === 'night' || phase === 'dusk';
  const texture = isNightLike ? nightTexture : dayTexture;

  // Calcular tint según fase
  const tint = useMemo(() => {
    switch (phase) {
      case 'night':
        return new Color('#7a88b8');
      case 'dawn':
        return new Color('#ffd1a6');
      case 'day':
        return new Color('#ffffff');
      case 'dusk':
        return new Color('#f7a07b');
      default:
        return new Color('#ffffff');
    }
  }, [phase]);

  return (
    <group>
      <mesh renderOrder={-1000}>
        <sphereGeometry args={[500, 32, 32]} />
        <meshBasicMaterial map={texture} color={tint} side={2} depthWrite={false} depthTest={false} />
      </mesh>
      <SunMoon />
    </group>
  );
}
