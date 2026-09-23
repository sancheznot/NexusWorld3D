'use client';

import { useFrame } from '@react-three/fiber';
import { getPhysicsInstance, updatePhysicsDebugger } from '@/hooks/useCannonPhysics';

export default function CannonStepper() {
  useFrame((_, delta) => {
    const physics = getPhysicsInstance();
    if (!physics) return;
    physics.update(delta);
    updatePhysicsDebugger();
  });
  return null;
}
