'use client';

import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';

export default function Skybox() {
  // Usar la imagen principal del skybox
  const texture = useLoader(TextureLoader, '/models/sky/sky_43_2k.png');

  return (
    <mesh>
      <sphereGeometry args={[500, 32, 32]} />
      <meshBasicMaterial map={texture} side={2} />
    </mesh>
  );
}
