'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { WebGLRenderer } from 'three';
import type { WebGPURenderer } from 'three/webgpu';
import { cameraSystem } from '@/lib/cameras/CameraSystem';

type GameGL = WebGLRenderer | WebGPURenderer;

function isWebGPURenderer(gl: GameGL): gl is WebGPURenderer {
  return (gl as WebGPURenderer).isWebGPURenderer === true;
}

/** Tipos de setRenderTarget divergen entre WebGLRenderer y WebGPURenderer en @types/three. */
function setGlRenderTarget(gl: GameGL, target: THREE.RenderTarget | null) {
  if (isWebGPURenderer(gl)) {
    gl.setRenderTarget(target);
  } else {
    gl.setRenderTarget(target as THREE.WebGLRenderTarget | null);
  }
}

interface CameraCaptureProps {
  cameraId: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
}

/**
 * Componente que captura renders de una cámara específica
 * y actualiza el CameraSystem con las imágenes
 */
export function CameraCapture({ cameraId, position, lookAt, fov = 60 }: CameraCaptureProps) {
  const { gl, scene } = useThree() as { gl: GameGL; scene: THREE.Scene };
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const renderTargetRef = useRef<THREE.RenderTarget | THREE.WebGLRenderTarget | null>(
    null
  );
  const lastCaptureTime = useRef(0);
  const captureInterval = 2000;
  const captureBusyRef = useRef(false);
  const fpsRollingRef = useRef({ t: performance.now(), n: 0, fps: 60 });

  const rtOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  } as const;

  useEffect(() => {
    console.log(`🎥 Inicializando cámara de captura: ${cameraId}`);

    renderTargetRef.current = isWebGPURenderer(gl)
      ? new THREE.RenderTarget(640, 360, { ...rtOptions })
      : new THREE.WebGLRenderTarget(640, 360, { ...rtOptions });

    return () => {
      console.log(`🗑️ Limpiando cámara: ${cameraId}`);
      renderTargetRef.current?.dispose();
      renderTargetRef.current = null;
    };
  }, [gl, cameraId]);

  useFrame(() => {
    const fr = fpsRollingRef.current;
    fr.n += 1;
    const tick = performance.now();
    if (tick - fr.t >= 500) {
      fr.fps = Math.round((fr.n * 1000) / (tick - fr.t));
      fr.n = 0;
      fr.t = tick;
    }

    const now = Date.now();
    if (now - lastCaptureTime.current < captureInterval) return;
    if (!cameraRef.current || !renderTargetRef.current) return;
    if (captureBusyRef.current) return;

    const rt = renderTargetRef.current;
    const camera = cameraRef.current;
    camera.position.set(...position);
    camera.lookAt(...lookAt);
    camera.updateMatrixWorld();

    captureBusyRef.current = true;
    const prevRt = gl.getRenderTarget();

    void (async () => {
      try {
        console.log(`📹 Capturando cámara ${cameraId}...`);

        setGlRenderTarget(gl, rt);
        gl.render(scene, camera);
        setGlRenderTarget(gl, prevRt);

        const width = rt.width;
        const height = rt.height;
        const pixels = new Uint8Array(width * height * 4);

        if (isWebGPURenderer(gl)) {
          const read = await gl.readRenderTargetPixelsAsync(rt, 0, 0, width, height);
          const view =
            read instanceof Uint8Array ? read : new Uint8Array(read.buffer, read.byteOffset, read.byteLength);
          pixels.set(view.subarray(0, width * height * 4));
        } else {
          (gl as WebGLRenderer).readRenderTargetPixels(
            rt as THREE.WebGLRenderTarget,
            0,
            0,
            width,
            height,
            pixels
          );
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          const imageData = ctx.createImageData(width, height);

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const srcIdx = (y * width + x) * 4;
              const dstIdx = ((height - 1 - y) * width + x) * 4;
              imageData.data[dstIdx] = pixels[srcIdx]!;
              imageData.data[dstIdx + 1] = pixels[srcIdx + 1]!;
              imageData.data[dstIdx + 2] = pixels[srcIdx + 2]!;
              imageData.data[dstIdx + 3] = pixels[srcIdx + 3]!;
            }
          }

          ctx.putImageData(imageData, 0, 0);
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);

          console.log(`✅ Imagen capturada para ${cameraId}: ${imageDataUrl.substring(0, 50)}...`);

          const cam = cameraSystem.getCamera(cameraId);
          if (cam) {
            const snapshot = cam.getSnapshot();
            cameraSystem.updateCameraSnapshot(cameraId, {
              id: cameraId,
              name: cam.name,
              description: cam.description,
              timestamp: now,
              imageData: imageDataUrl,
              players: snapshot?.players ?? 0,
              fps: fpsRollingRef.current.fps,
            });
            console.log(`🔄 Snapshot actualizado para ${cameraId}`);
          } else {
            console.error(`❌ No se encontró la cámara ${cameraId} en el sistema`);
          }
        }

        lastCaptureTime.current = now;
      } catch (error) {
        console.error(`❌ Error capturando cámara ${cameraId}:`, error);
        try {
          setGlRenderTarget(gl, prevRt);
        } catch {
          /* ignore */
        }
      } finally {
        captureBusyRef.current = false;
      }
    })();
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      position={position}
      fov={fov}
      near={0.1}
      far={1000}
    />
  );
}

/**
 * Componente principal que gestiona todas las cámaras de captura
 */
export default function LiveCameraCapture() {
  useEffect(() => {
    console.log('🎬 LiveCameraCapture montado - Iniciando sistema de cámaras');
    return () => {
      console.log('🎬 LiveCameraCapture desmontado');
    };
  }, []);

  return (
    <group name="live-cameras">
      <CameraCapture
        cameraId="aerial-city"
        position={[0, 100, 0]}
        lookAt={[0, 0, 0]}
        fov={75}
      />

      <CameraCapture
        cameraId="hotel-entrance"
        position={[10, 5, -95]}
        lookAt={[0, 2, -100]}
        fov={60}
      />

      <CameraCapture
        cameraId="central-plaza"
        position={[50, 15, 50]}
        lookAt={[0, 0, 0]}
        fov={70}
      />
    </group>
  );
}
