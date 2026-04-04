"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useCannonPhysics } from "@/hooks/useCannonPhysics";
import {
  frameworkDemoLandmarkBuildingUserDataName,
  frameworkDemoLandmarkColliderId,
} from "@/lib/frameworkBranding";
import * as THREE from "three";

interface DemoLandmarkBuildingProps {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}

function LandmarkModel({
  position = [0, 0, -100],
  rotation,
  scale = [6, 6, 6],
}: DemoLandmarkBuildingProps) {
  const meshRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/hotel_humboldt_model.glb");
  const physicsRef = useCannonPhysics();
  const colliderCreatedRef = useRef(false);
  const buildingName = frameworkDemoLandmarkBuildingUserDataName;
  const colliderId = frameworkDemoLandmarkColliderId;

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.isCollider = true;
          child.userData.collisionType = "building";
          child.userData.buildingName = buildingName;
        }
      });
      console.log("🏢 Demo landmark GLB loaded (collisions enabled)");
    }
  }, [scene, buildingName]);

  useEffect(() => {
    if (!physicsRef.current || !scene || colliderCreatedRef.current) {
      return;
    }

    const hotelSize: [number, number, number] = [110, 200, 115];
    const colliderPosition: [number, number, number] = [
      position[0] + 20,
      position[1],
      position[2] + 0,
    ];

    physicsRef.current.createBoxCollider(colliderPosition, hotelSize, colliderId);
    colliderCreatedRef.current = true;
    console.log(
      `🏢 Demo landmark box collider at (${colliderPosition[0]}, ${colliderPosition[1]}, ${colliderPosition[2]}) size=${hotelSize}`
    );
  }, [physicsRef, scene, position, scale, colliderId]);

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}

function LandmarkPlaceholder({
  position,
  rotation,
  scale,
}: DemoLandmarkBuildingProps) {
  const meshRef = useRef<THREE.Group>(null);
  const buildingName = frameworkDemoLandmarkBuildingUserDataName;
  const boxUser = {
    isCollider: true,
    collisionType: "building",
    buildingName,
  };

  return (
    <group ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <mesh castShadow receiveShadow userData={boxUser}>
        <boxGeometry args={[30, 15, 30]} />
        <meshStandardMaterial color={0x8b4513} roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh
        position={[0, 22.5, 0]}
        castShadow
        receiveShadow
        userData={boxUser}
      >
        <boxGeometry args={[36, 15, 36]} />
        <meshStandardMaterial color={0x696969} roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh
        position={[0, 37.5, 0]}
        castShadow
        receiveShadow
        userData={boxUser}
      >
        <boxGeometry args={[42, 12, 42]} />
        <meshStandardMaterial color={0x555555} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 48, 0]} castShadow receiveShadow userData={boxUser}>
        <boxGeometry args={[48, 8, 48]} />
        <meshStandardMaterial color={0x333333} roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 55, 24.5]} castShadow>
        <boxGeometry args={[20, 3, 0.5]} />
        <meshStandardMaterial color={0xffd700} emissive={0xffd700} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** ES: Edificio demo del template (GLB opcional). EN: Template demo landmark (optional GLB). */
export default function DemoLandmarkBuilding(props: DemoLandmarkBuildingProps) {
  const [useRealModel] = useState(true);

  useFrame(() => {});

  if (useRealModel) {
    return (
      <Suspense fallback={<LandmarkPlaceholder {...props} />}>
        <LandmarkModel {...props} />
      </Suspense>
    );
  }

  return <LandmarkPlaceholder {...props} />;
}
