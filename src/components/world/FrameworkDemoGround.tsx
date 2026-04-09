'use client';

import { Grid } from '@react-three/drei';

/**
 * ES: Suelo + rejilla para `NEXT_PUBLIC_FRAMEWORK_DEMO=1` (sin city.glb).
 * EN: Ground + grid for framework demo mode without the city asset.
 */
export default function FrameworkDemoGround() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#3d4f3a" roughness={0.92} />
      </mesh>
      <Grid
        args={[120, 120]}
        cellSize={2}
        cellThickness={0.6}
        cellColor="#5a6b58"
        sectionSize={10}
        sectionThickness={1.1}
        sectionColor="#7a8c78"
        fadeDistance={180}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0.02, 0]}
      />
    </group>
  );
}
