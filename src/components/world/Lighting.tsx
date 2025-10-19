'use client';

import { THREE_CONFIG } from '@/config/three.config';

export default function Lighting() {
  return (
    <>
      {/* Ambient light - más brillante */}
      <ambientLight
        color={THREE_CONFIG.lighting.ambient.color}
        intensity={THREE_CONFIG.lighting.ambient.intensity}
      />
      
      {/* Directional light (sun) - más potente */}
      <directionalLight
        color={THREE_CONFIG.lighting.directional.color}
        intensity={THREE_CONFIG.lighting.directional.intensity}
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
      
      {/* Luz adicional desde abajo para iluminar el suelo */}
      <directionalLight
        color={0xffffff}
        intensity={0.5}
        position={[0, -10, 0]}
      />
      
      {/* Luz de relleno desde el lado opuesto */}
      <directionalLight
        color={0xffffff}
        intensity={0.3}
        position={[-20, 10, -20]}
      />
    </>
  );
}
