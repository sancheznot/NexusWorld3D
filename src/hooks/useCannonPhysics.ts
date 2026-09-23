"use client";

import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Scene, type BufferGeometry, type Material } from "three";
import { CannonPhysics } from "@/lib/three/cannonPhysics";
import cannonDebugger from "cannon-es-debugger";
import { GAME_CONFIG } from "@/constants/game";

// One simulation for the active game canvas. All consumers release their refs.
let globalPhysics: CannonPhysics | null = null;
let globalDebugRenderer: { update: () => void } | null = null;
let disposeDebugger: (() => void) | null = null;
const subscribers = new Set<{ current: CannonPhysics | null }>();

export function getPhysicsInstance(): CannonPhysics | null {
  return globalPhysics;
}

// Called once by the stepper, not once per player/model.
export function updatePhysicsDebugger(): void {
  try {
    globalDebugRenderer?.update();
  } catch {
    // Debug geometry must not interrupt the simulation.
  }
}

export function useCannonPhysics(createPhysicsBody: boolean = true) {
  const physicsRef = useRef<CannonPhysics | null>(null);
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    subscribers.add(physicsRef);
    if (!globalPhysics && createPhysicsBody) {
      globalPhysics = new CannonPhysics();
      globalPhysics.createGround();
      globalPhysics.createPlayer(GAME_CONFIG.player.spawnPosition);

      if (process.env.NODE_ENV === "development") {
        const group = new Scene();
        scene.add(group);
        const geometries = new Set<BufferGeometry>();
        const materials = new Set<Material>();
        globalDebugRenderer = cannonDebugger(group, globalPhysics.getWorld(), {
          color: 0x00ff00,
          scale: 1,
          onInit(_body, mesh) {
            geometries.add(mesh.geometry);
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
              materials.add(material);
            }
          },
        });
        disposeDebugger = () => {
          group.removeFromParent();
          group.clear();
          for (const geometry of geometries) geometry.dispose();
          for (const material of materials) material.dispose();
        };
      }
    }

    // Observers mounted before the owner also receive the new world.
    for (const subscriber of subscribers) subscriber.current = globalPhysics;

    return () => {
      subscribers.delete(physicsRef);
      physicsRef.current = null;
      if (subscribers.size === 0) {
        globalPhysics?.dispose();
        disposeDebugger?.();
        globalPhysics = null;
        globalDebugRenderer = null;
        disposeDebugger = null;
      }
    };
  }, [scene, createPhysicsBody]);

  return physicsRef;
}
