'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { getPhysicsInstance } from '@/hooks/useCannonPhysics';
import { usePlayerStore } from '@/store/playerStore';

type Spawn = { x: number; y: number; z: number; yaw: number };

interface CannonCarProps {
  driving: boolean;
  spawn: Spawn;
  modelPath?: string;
  id?: string;
}

export default function CannonCar({ driving, spawn, id = 'playerCar' }: CannonCarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<(THREE.Group | null)[]>([]);
  const steeringWheelRef = useRef<THREE.Object3D | null>(null);
  const [controls, setControls] = useState({ forward: false, backward: false, left: false, right: false, handbrake: false });

  // Cargar modelos separados
  const chassisGLTF = useGLTF('/models/vehicles/cars/City_Car_07.glb');
  const wheelGLTF = useGLTF('/models/vehicles/cars/Wheel_01.glb');

  // Preparar visuales
  const { chassisVisual, wheelsVisual } = useMemo(() => {
    // Chasis
    const chassis = chassisGLTF.scene.clone();
    // Centrar chasis si es necesario (asumiendo que City_Car_07 viene bien o necesita ajuste leve)
    const box = new THREE.Box3().setFromObject(chassis);
    const center = box.getCenter(new THREE.Vector3());
    const bottomY = box.min.y;
    chassis.position.x -= center.x;
    chassis.position.z -= center.z;
    chassis.position.y -= bottomY;
    
    // 🔧 Escalar chasis 60% más grande
    chassis.scale.setScalar(1.6);
    
    // 🔄 Rotar 180° para que la trompa apunte hacia adelante
    chassis.rotation.y = Math.PI;
    
    // 📉 Bajar el chasis para que no flote (ajustar según necesidad)
    chassis.position.y -= 0.3; // Bajar 30cm
    
    // 🚗 Marcar como parte del vehículo para excluir de colisión de cámara
    chassis.userData.vehicleId = 'playerCar';
    chassis.traverse((child) => {
      child.userData.vehicleId = 'playerCar';
    });
    
    // Rueda
    const wheel = wheelGLTF.scene.clone();
    // Ajustar escala de rueda si es necesario (Wheel_01 suele ser grande)
    // Asumimos radio ~0.35m. Si el modelo es gigante, lo escalamos.
    const wBox = new THREE.Box3().setFromObject(wheel);
    const wSize = wBox.getSize(new THREE.Vector3());
    // Si la rueda es muy grande (>1m), reducirla. Si es pequeña, dejarla.
    if (wSize.y > 1.0) {
       const scale = 0.7 / wSize.y; // Target diameter ~0.7m
       wheel.scale.setScalar(scale);
    }
    
    // 🔧 Escalar ruedas 80% más grandes
    wheel.scale.multiplyScalar(1.8);

    // Pre-clonar las 4 ruedas para evitar re-crearlas en cada render (causa del error de ref)
    const wheels = Array.from({ length: 4 }).map(() => {
      const w = wheel.clone();
      w.userData.vehicleId = 'playerCar'; // 🚗 Marcar como parte del vehículo para excluir de colisión de cámara
      return w;
    });

    return { chassisVisual: chassis, wheelsVisual: wheels };
  }, [chassisGLTF.scene, wheelGLTF.scene]);

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
      // CONTROLES NORMALES (Alineados):
      // Physics Front = -Z
      // Visual Front = -Z
      // 'W' (Forward) -> Throttle (1) -> Physics Forward (-Z)
      // 'S' (Backward) -> Brake (1) -> Reverse Gear -> Physics Backward (+Z)
      
      const throttle = controls.forward ? 1 : 0;
      const brake = controls.backward ? 1 : 0;
      
      const steer = controls.left ? -1 : controls.right ? 1 : 0;
      const handbrake = controls.handbrake ? 1 : 0; // Space
      physics.updateRaycastVehicle(id, { throttle, brake, steer, handbrake }, delta);
    } else {
      physics.stopVehicle(id);
    }

    // 1. Sincronizar Chasis (Grupo Principal)
    // El grupo principal se mueve con el chasis physics body
    const t = physics.getBodyTransform(id);
    if (t && groupRef.current) {
      groupRef.current.position.set(t.position.x, t.position.y, t.position.z);
      
      // ROTACIÓN COMPLETA (Pitch, Yaw, Roll)
      // Usamos el quaternion completo para que el chasis visual coincida EXACTAMENTE con el físico.
      // Esto es crucial para que las ruedas (que se calculan relativas al chasis visual) no se desplacen.
      if (t.quaternion) {
        groupRef.current.quaternion.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
      } else {
        // Fallback (no debería pasar si cannonPhysics está actualizado)
        groupRef.current.rotation.set(0, t.rotationY, 0);
      }
      
      (window as unknown as { _veh_pos?: { x: number; y: number; z: number } })._veh_pos = {
        x: t.position.x,
        y: t.position.y,
        z: t.position.z,
      };
      (window as unknown as { _veh_yaw?: number })._veh_yaw = t.rotationY; // Yaw normal

      // 🔄 Sync Player Position with Vehicle
      if (driving) {
        usePlayerStore.getState().updatePosition({ x: t.position.x, y: t.position.y, z: t.position.z });
        // Optional: Sync rotation if needed, but usually player rotation inside car is fixed or handled by camera
        usePlayerStore.getState().updateRotation({ x: 0, y: t.rotationY, z: 0 });
      }
    }

    // 2. Sincronizar Ruedas
    // Las ruedas son independientes del chasis en el grafo de escena para moverse libremente
    // PERO aquí las tenemos como hijas del grupo? NO, deben ser libres o relativas.
    // Si usamos `getVehicleWheelTransform`, nos da coordenadas MUNDIALES.
    // Así que las ruedas visuales NO deben estar dentro de `groupRef` si usamos coordenadas mundiales.
    // O deben estar en `groupRef` y convertimos coordenadas.
    // MEJOR: Usar coordenadas mundiales para las ruedas y ponerlas fuera del grupo del chasis,
    // O hacer que el componente renderice fragmentos independientes.
    
    // ESTRATEGIA:
    // `groupRef` contiene el Chasis.
    // Las ruedas se renderizan en el mundo (fuera del grupo) o actualizamos su posición mundial.
    // React-three-fiber: <primitive object={wheel} /> se renderiza donde le digamos.
    
    if (wheelsRef.current) {
      // 🔧 Offsets independientes para ruedas delanteras y traseras
      const frontWheelZOffset = -0.02; // Offset Z para ruedas delanteras
      const rearWheelZOffset = -0.02; // Offset Z para ruedas traseras
      
      // 🔧 Offsets X independientes para cada lado (Reset a 0 para corregir desplazamiento)
      const frontLeftXOffset = 0.0; 
      const frontRightXOffset = 0.0; 
      const rearLeftXOffset = 0.0; 
      const rearRightXOffset = 0.0; 
      
      for (let i = 0; i < 4; i++) {
        const wTransform = physics.getVehicleWheelTransform(id, i);
        const wVisual = wheelsRef.current[i];
        if (wTransform && wVisual && t) {
          // Determinar si es rueda delantera o trasera
          // Índices: 0=FL, 1=FR (delanteras), 2=RL, 3=RR (traseras)
          const isFront = i === 0 || i === 1;
          
          const zOffset = isFront ? frontWheelZOffset : rearWheelZOffset;
          
          // Seleccionar offset X según la rueda específica
          let xOffset = 0;
          if (i === 0) xOffset = frontLeftXOffset;      // FL
          else if (i === 1) xOffset = frontRightXOffset; // FR
          else if (i === 2) xOffset = rearLeftXOffset;   // RL
          else if (i === 3) xOffset = rearRightXOffset;  // RR
          
          // 🔧 CÁLCULO DE POSICIÓN SINCRONIZADA (INTERPOLADA):
          // Usamos la posición/rotación del chasis visual (que ya está interpolada)
          // y le sumamos la posición relativa de la rueda (Connection + Suspension).
          // Esto elimina el lag entre chasis y ruedas.
          
          if (groupRef.current) {
            const chassisPos = groupRef.current.position;
            const chassisRot = groupRef.current.quaternion;
            
            // Datos de suspensión (ahora expuestos por physics)
            const wInfo = wTransform as any; // Cast para acceder a props nuevas
            if (wInfo.chassisConnectionPointLocal) {
               const conn = new THREE.Vector3(wInfo.chassisConnectionPointLocal.x, wInfo.chassisConnectionPointLocal.y, wInfo.chassisConnectionPointLocal.z);
               const dir = new THREE.Vector3(wInfo.directionLocal.x, wInfo.directionLocal.y, wInfo.directionLocal.z);
               const suspLen = wInfo.suspensionLength || 0;
               
               // Posición relativa = Connection + Direction * SuspensionLength
               const relPos = conn.clone().add(dir.multiplyScalar(suspLen));
               
               // Posición Mundial = ChassisPos + ChassisRot * RelPos
               const worldPos = relPos.applyQuaternion(chassisRot).add(chassisPos);
               
               // Aplicar offsets adicionales (Axle/Heading)
               // Necesitamos el Axle/Heading basados en la rotación de la rueda.
               // La rotación de la rueda (wTransform.rotation) es "Physics Rotation".
               // Deberíamos usar una rotación interpolada también?
               // La rotación no suele tener tanto lag visual como la posición, pero idealmente sí.
               // Por ahora usaremos wTransform.rotation para la orientación de la rueda.
               
               const wheelWorldQuat = new THREE.Quaternion(wTransform.rotation.x, wTransform.rotation.y, wTransform.rotation.z, wTransform.rotation.w);
               
               const axleVector = new THREE.Vector3(1, 0, 0).applyQuaternion(wheelWorldQuat).normalize();
               const headingVector = new THREE.Vector3(0, 1, 0).cross(axleVector).normalize();
               
               const offsetVector = axleVector.clone().multiplyScalar(xOffset)
                 .add(headingVector.clone().multiplyScalar(zOffset));
                 
               const wheelYOffset = 0.25;
               
               wVisual.position
                 .copy(worldPos)
                 .add(offsetVector)
                 .setY(worldPos.y + wheelYOffset); // Mantener Y relativa al mundo o al chasis?
                 // Si usamos worldPos.y, sigue la suspensión.
                 // wheelYOffset es un ajuste visual extra.
                 
               wVisual.quaternion.copy(wheelWorldQuat);
               
               // 🔧 CORRECCIÓN DE AROS (RIMS):
               const isLeft = i === 0 || i === 2;
               if (isLeft) {
                  wVisual.rotateZ(Math.PI);
               }
            } else {
               // Fallback si no hay info extendida (no debería pasar)
               wVisual.position.set(wTransform.position.x, wTransform.position.y, wTransform.position.z);
               wVisual.quaternion.set(wTransform.rotation.x, wTransform.rotation.y, wTransform.rotation.z, wTransform.rotation.w);
            }
          }
        }
      }
    }
    
    // 3. Rotar volante visual (si existe en el chasis)
    if (steeringWheelRef.current) {
      const steering = physics.getVehicleSteering(id);
      steeringWheelRef.current.rotation.z = -steering * 2;
    }
  });

  // Asegurar flag global de conducción
  useEffect(() => {
    (window as unknown as { _isDriving?: boolean })._isDriving = driving;
    const physics = getPhysicsInstance();
    if (physics) {
      physics.setCurrentVehicle(driving ? id : null);
    }
  }, [driving, id]);

  return (
    <>
      {/* Chasis: Se mueve con el grupo principal (o independientemente si usamos world coords) */}
      {/* Usamos groupRef para el chasis. NOTA: Si el chasis vuelca, necesitamos Quaternion completo.
          Por ahora, getBodyTransform solo da Y. Asumimos que el chasis no vuelca visualmente (limitación actual).
          Para arreglar esto, necesitaríamos acceder al Body directamente o mejorar el hook.
      */}
      <group ref={groupRef} position={[spawn.x, spawn.y, spawn.z]} rotation={[0, spawn.yaw, 0]} userData={{ vehicleId: id }}>
        <primitive object={chassisVisual} />
      </group>

      {/* Ruedas: Renderizadas en coordenadas mundiales (fuera del grupo del chasis) */}
      {/* Usamos un Portal o simplemente primitivas en el root? 
          En R3F, si ponemos elementos aquí, son hijos del componente.
          Si el componente está en Scene, son hijos de Scene.
          PERO `CannonCar` se renderiza dentro de `GameCanvas`.
          Si `CannonCar` no tiene un contenedor `group` que lo mueva, sus hijos están en el mundo.
          
          El `groupRef` de arriba mueve el chasis.
          Las ruedas las pondremos FUERA de ese grupo.
      */}
      
      {wheelsVisual.map((wheelObj, i) => (
        <primitive 
          key={i}
          object={wheelObj} 
          ref={(el: THREE.Group | null) => { wheelsRef.current[i] = el; }}
        />
      ))}
    </>
  );
}

useGLTF.preload('/models/vehicles/cars/City_Car_07.glb');
useGLTF.preload('/models/vehicles/cars/Wheel_01.glb');


