'use client';

import { useLoader } from '@react-three/fiber';
import { TextureLoader, Color } from 'three';
import { useTimeStore } from '@/store/timeStore';
import SunMoon from '@/components/world/SunMoon';

export default function Skybox() {
  const phase = useTimeStore((s) => s.phase);

  const isNightLike = phase === 'night' || phase === 'dusk';
  const dayPath = '/models/sky/sky_43_2k.png';
  const nightPath = '/models/sky/sky_17_2k.png';
  const texturePath = isNightLike ? nightPath : dayPath;
  const texture = useLoader(TextureLoader, texturePath);

  let tint = new Color(0xffffff);
  switch (phase) {
    case 'night':
      tint = new Color('#7a88b8');
      break;
    case 'dawn':
      tint = new Color('#ffd1a6');
      break;
    case 'day':
      tint = new Color('#ffffff');
      break;
    case 'dusk':
      tint = new Color('#f7a07b');
      break;
  }

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
