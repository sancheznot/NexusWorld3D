'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { WebGLRenderer } from 'three';
import { useUIStore } from '@/store/uiStore';
import { inventoryService } from '@/lib/services/inventory';
import { getWorldGatherMode } from '@/lib/gameplay/inventoryHotbar';
import { registerMeleeClickHandler } from '@/lib/gameplay/meleeActionBridge';
import { sendTreeChopAttempt } from '@/lib/gameplay/treeChopActions';
import { sendRockMineAttempt } from '@/lib/gameplay/rockMineActions';
import { colyseusClient } from '@/lib/colyseus/client';
import { usePlayerStore } from '@/store/playerStore';

function pointerToNDC(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): THREE.Vector2 {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(rect.width, 1);
  const h = Math.max(rect.height, 1);
  const x = ((clientX - rect.left) / w) * 2 - 1;
  const y = -((clientY - rect.top) / h) * 2 + 1;
  return new THREE.Vector2(x, y);
}

function isUnderPlayerMesh(obj: THREE.Object3D): boolean {
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.userData?.isPlayer) return true;
    o = o.parent;
  }
  return false;
}

function isWebGlContextLost(gl: THREE.WebGLRenderer | unknown): boolean {
  const wgl = gl as WebGLRenderer;
  if (typeof wgl.getContext !== 'function') return false;
  try {
    return wgl.getContext()?.isContextLost?.() === true;
  } catch {
    return false;
  }
}

function resolveChoppableTreeId(obj: THREE.Object3D): string | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    const id = o.userData?.choppableTreeId;
    if (typeof id === 'string' && id.length > 0) {
      if (id.startsWith('ct_')) return null;
      const isProp = o.userData?.choppableProp === true;
      if (isProp || id.startsWith('ext_')) return id;
    }
    o = o.parent;
  }
  return null;
}

function resolveMineableRockId(obj: THREE.Object3D): string | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    const id = o.userData?.mineableRockId;
    if (
      typeof id === 'string' &&
      id.length > 0 &&
      o.userData?.mineableProp === true
    ) {
      return id;
    }
    o = o.parent;
  }
  return null;
}

/**
 * ES: Click → raycast; hacha (árboles) o pico (rocas) según herramienta activa.
 * EN: Raycast; axe for trees or pickaxe for rocks by active gather tool.
 */
export default function ChopRaycastBridge() {
  const { camera, scene, gl } = useThree();
  const hotbarSlot = useUIStore((s) => s.hotbarSelectedSlot);
  const lastSwingRef = useRef(0);

  useEffect(() => {
    const run = (event: MouseEvent) => {
      if (!colyseusClient.isConnectedToWorldRoom()) return;
      const gather = getWorldGatherMode(
        inventoryService.getInventory(),
        inventoryService.getEquipment(),
        hotbarSlot
      );
      if (!gather) return;

      const now = performance.now();
      if (now - lastSwingRef.current < 650) return;

      const canvas = gl.domElement;
      if (!(canvas instanceof HTMLCanvasElement)) return;
      if (isWebGlContextLost(gl)) return;

      const ndc = pointerToNDC(event.clientX, event.clientY, canvas);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(scene.children, true);
      for (const h of hits) {
        if (isUnderPlayerMesh(h.object)) continue;
        if (gather === 'rock') {
          const rockId = resolveMineableRockId(h.object);
          if (!rockId) continue;
          lastSwingRef.current = now;
          const p = usePlayerStore.getState().position;
          sendRockMineAttempt(rockId, { x: p.x, y: p.y, z: p.z });
          break;
        }
        const treeId = resolveChoppableTreeId(h.object);
        if (!treeId) continue;
        lastSwingRef.current = now;
        const p = usePlayerStore.getState().position;
        const clientPlayerPos = { x: p.x, y: p.y, z: p.z };
        sendTreeChopAttempt(treeId, undefined, clientPlayerPos);
        break;
      }
    };

    registerMeleeClickHandler(run);
    return () => registerMeleeClickHandler(null);
  }, [camera, scene, gl, hotbarSlot]);

  return null;
}
