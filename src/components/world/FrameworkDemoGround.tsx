'use client';

import { useCallback, useRef } from 'react';
import { Grid, Text } from '@react-three/drei';
import { DemoMessages } from '@nexusworld3d/protocol';
import { FRAMEWORK_DEMO_CUBE_CENTER } from '@/constants/frameworkDemo';
import { colyseusClient } from '@/lib/colyseus/client';

/**
 * ES: Suelo + rejilla + cubo demo (`NEXT_PUBLIC_FRAMEWORK_DEMO=1`).
 * EN: Ground + grid + demo pickup cube for framework demo mode.
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
      <FrameworkDemoPickupCube />
    </group>
  );
}

function FrameworkDemoPickupCube() {
  const busy = useRef(false);

  const onPointerDown = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!colyseusClient.isConnectedToWorldRoom()) return;
    if (busy.current) return;
    busy.current = true;
    window.setTimeout(() => {
      busy.current = false;
    }, 600);
    colyseusClient.getSocket()?.send(DemoMessages.FrameworkCubePickup, {});
  }, []);

  const cx = FRAMEWORK_DEMO_CUBE_CENTER.x;
  const cy = FRAMEWORK_DEMO_CUBE_CENTER.y;
  const cz = FRAMEWORK_DEMO_CUBE_CENTER.z;

  return (
    <group position={[cx, cy, cz]}>
      <mesh
        castShadow
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#c9a227"
          metalness={0.35}
          roughness={0.45}
          emissive="#4a3208"
          emissiveIntensity={0.2}
        />
      </mesh>
      <Text
        position={[0, 1.1, 0]}
        fontSize={0.28}
        color="#f5e6c8"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#1a1510"
      >
        Demo: click + stay within ~5m
      </Text>
    </group>
  );
}
