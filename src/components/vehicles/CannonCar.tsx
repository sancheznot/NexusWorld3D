'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { getPhysicsInstance } from '@/hooks/useCannonPhysics';

type Spawn = { x: number; y: number; z: number; yaw: number };

interface CannonCarProps {
  driving: boolean;
  spawn: Spawn;
  modelPath?: string;
  id?: string;
}

export default function CannonCar({ driving, spawn, modelPath = '/models/vehicles/cars/Car_07.glb', id = 'playerCar' }: CannonCarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [controls, setControls] = useState({ forward: false, backward: false, left: false, right: false, handbrake: false });

  // Cargar modelo una sola vez y clonar para editar sin mutar cache
  const { scene } = useGLTF(modelPath, 'https://www.gstatic.com/draco/v1/decoders/');
  const visual = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
      }
    });
    // Auto-escalar a ~4.2m largo
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const currentLen = Math.max(size.x, size.z);
    if (currentLen > 0) {
      const scale = 4.2 / currentLen;
      cloned.scale.setScalar(scale);
    }
    return cloned;
  }, [scene]);

  // Crear vehículo de Cannon al montar o si cambia spawn.yaw/pos
  useEffect(() => {
    const physics = getPhysicsInstance();
    if (!physics) return;

    // Si ya existe, reemplazarlo
    physics.removeVehicle(id);
    physics.createRaycastVehicle({ x: spawn.x, y: spawn.y, z: spawn.z }, id, spawn.yaw);

    // Publicar estado inicial
    (window as unknown as { _veh_pos?: { x: number; y: number; z: number } })._veh_pos = {
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
    };

    return () => {
      const p2 = getPhysicsInstance();
      p2?.removeVehicle(id);
    };
  }, [spawn.x, spawn.y, spawn.z, spawn.yaw, id]);

  // Entradas de teclado (WASD/Arrows)
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      setControls((p) => ({
        forward: p.forward || k === 'w' || k === 'arrowup',
        backward: p.backward || k === 's' || k === 'arrowdown',
        left: p.left || k === 'a' || k === 'arrowleft',
        right: p.right || k === 'd' || k === 'arrowright',
        handbrake: p.handbrake || k === ' ', // Space
      }));
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      setControls((p) => ({
        forward: (k === 'w' || k === 'arrowup') ? false : p.forward,
        backward: (k === 's' || k === 'arrowdown') ? false : p.backward,
        left: (k === 'a' || k === 'arrowleft') ? false : p.left,
        right: (k === 'd' || k === 'arrowright') ? false : p.right,
        handbrake: k === ' ' ? false : p.handbrake, // Space
      }));
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      setControls({ forward: false, backward: false, left: false, right: false, handbrake: false });
    };
  }, []);

  // Actualizar vehículo y sincronizar visual
  useFrame((state, delta) => {
    const physics = getPhysicsInstance();
    if (!physics) return;

    // Control solo cuando driving = true, si no, dejar quieto
    if (driving) {
      const throttle = controls.forward ? 1 : 0;
      const brake = controls.backward ? 1 : 0;
      const steer = controls.left ? -1 : controls.right ? 1 : 0;
      const handbrake = controls.handbrake ? 1 : 0; // Space
      physics.updateRaycastVehicle(id, { throttle, brake, steer, handbrake }, delta);
    } else {
      physics.stopVehicle(id);
    }

    // Leer transform del chasis para posicionar modelo y publicar posición
    const t = physics.getBodyTransform(id);
    if (t) {
      if (groupRef.current) {
        groupRef.current.position.set(t.position.x, t.position.y, t.position.z);
        groupRef.current.rotation.set(0, t.rotationY, 0);
      }
      (window as unknown as { _veh_pos?: { x: number; y: number; z: number } })._veh_pos = {
        x: t.position.x,
        y: t.position.y,
        z: t.position.z,
      };
      (window as unknown as { _veh_yaw?: number })._veh_yaw = t.rotationY;
    }
  });

  // Asegurar flag global de conducción (la UI también lo pone, pero esto refuerza)
  useEffect(() => {
    (window as unknown as { _isDriving?: boolean })._isDriving = driving;
  }, [driving]);

  return (
    <group ref={groupRef} position={[spawn.x, spawn.y, spawn.z]} rotation={[0, spawn.yaw, 0]}
      userData={{ vehicleId: id }}>
      <primitive object={visual} />
      {/* Debug chasis */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.6, 1.0, 3.8]} />
        <meshStandardMaterial color="#ff0000" transparent opacity={0.12} />
      </mesh>
      {/* Debug ruedas (visuales) */}
      {(() => {
        const halfWidth = 0.85; const wheelBase = 1.6; const r = 0.38; const y = 0.1;
        const wheels = [
          [ halfWidth, y,  wheelBase],
          [-halfWidth, y,  wheelBase],
          [ halfWidth, y, -wheelBase],
          [-halfWidth, y, -wheelBase],
        ];
        return wheels.map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]}>
            <sphereGeometry args={[r, 12, 12]} />
            <meshStandardMaterial color="#111111" metalness={0.1} roughness={0.9} />
          </mesh>
        ));
      })()}
    </group>
  );
}

useGLTF.preload('/models/vehicles/cars/Car_07.glb');


