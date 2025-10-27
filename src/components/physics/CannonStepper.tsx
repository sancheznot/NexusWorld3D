'use client';

import { useFrame } from '@react-three/fiber';
import { getPhysicsInstance } from '@/hooks/useCannonPhysics';
import { PHYSICS_CONFIG } from '@/constants/physics';

export default function CannonStepper() {
  useFrame((_, delta) => {
    const physics = getPhysicsInstance();
    if (!physics) return;
    const clamped = Math.min(delta, PHYSICS_CONFIG.MAX_DELTA_TIME);
    physics.update(clamped);
  });
  return null;
}


