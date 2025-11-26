'use client';

import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useTimeStore } from '@/store/timeStore';

// DEBUG toggle
const DEBUG_FIXED = false;
const DEBUG_SUN_POS = new THREE.Vector3(-52.2, 10, 30.8);
const DEBUG_MOON_POS = new THREE.Vector3(-46.2, 12, 30.8);

export default function SunMoon() {
  const hour = useTimeStore((s) => s.hour);
  const minute = useTimeStore((s) => s.minute);
  const second = useTimeStore((s) => s.second);

  const sunGLB = useGLTF('/models/sky/sun-realistic.glb');
  const moonGLB = useGLTF('/models/sky/moon-realistic.glb');

  const sunScene = useMemo(() => {
    const clone = sunGLB.scene.clone(true);
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshBasicMaterial({ color: 0xffe066, toneMapped: false });
      }
    });
    return clone;
  }, [sunGLB.scene]);

  const moonScene = useMemo(() => {
    const clone = moonGLB.scene.clone(true);
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshBasicMaterial({ color: 0xdde6ff, toneMapped: false });
      }
    });
    return clone;
  }, [moonGLB.scene]);

  const { sunPos, moonPos, showSun, showMoon } = useMemo(() => {
    if (DEBUG_FIXED) {
      return { sunPos: DEBUG_SUN_POS, moonPos: DEBUG_MOON_POS, showSun: true, showMoon: true };
    }
    const total = (hour * 3600) + (minute * 60) + second;
    const t = (total % 86400) / 86400;
    const az = t * Math.PI * 2;
    const sinAlt = Math.sin(az - Math.PI / 2);

    // Inside sky sphere (radius 500), keep within 400
    const radius = 400;
    const minHeight = 180;

    const sunY = sinAlt * radius;
    const moonY = -sinAlt * radius;

    const sx = Math.cos(az) * radius;
    const sz = Math.sin(az) * radius;
    const mx = Math.cos(az + Math.PI) * radius;
    const mz = Math.sin(az + Math.PI) * radius;

    const showSun = sunY > 0;
    const showMoon = moonY > 0;

    const sunPos = new THREE.Vector3(sx, showSun ? Math.max(minHeight, sunY) : minHeight, sz);
    const moonPos = new THREE.Vector3(mx, showMoon ? Math.max(minHeight, moonY) : minHeight, mz);

    return { sunPos, moonPos, showSun, showMoon };
  }, [hour, minute, second]);

  return (
    <group>
      {showSun && (
        <primitive object={sunScene} position={sunPos} scale={[20, 20, 20]} />
      )}
      {showMoon && (
        <primitive object={moonScene} position={moonPos} scale={[16, 16, 16]} />
      )}
    </group>
  );
}

useGLTF.preload('/models/sky/sun-realistic.glb');
useGLTF.preload('/models/sky/moon-realistic.glb');
