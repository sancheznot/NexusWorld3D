'use client';

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { cameraSystem } from '@/lib/cameras/CameraSystem';

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
  const { gl, scene } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const lastCaptureTime = useRef(0);
  const captureInterval = 2000; // Capturar cada 2 segundos

  // Crear RenderTarget una sola vez
  useEffect(() => {
    console.log(`🎥 Inicializando cámara de captura: ${cameraId}`);
    
    // Resolución reducida para mejor performance (640x360)
    renderTargetRef.current = new THREE.WebGLRenderTarget(640, 360, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    return () => {
      console.log(`🗑️ Limpiando cámara: ${cameraId}`);
      renderTargetRef.current?.dispose();
    };
  }, [cameraId]);

  // Capturar frame en cada render
  useFrame(() => {
    const now = Date.now();
    if (now - lastCaptureTime.current < captureInterval) return;
    if (!cameraRef.current || !renderTargetRef.current) return;

    console.log(`📹 Capturando cámara ${cameraId}...`);

    try {
      // Configurar cámara
      const camera = cameraRef.current;
      camera.position.set(...position);
      camera.lookAt(...lookAt);
      camera.updateMatrixWorld();

      // Renderizar a texture
      const currentRenderTarget = gl.getRenderTarget();
      gl.setRenderTarget(renderTargetRef.current);
      gl.render(scene, camera);
      gl.setRenderTarget(currentRenderTarget);

      // Leer pixels y convertir a imagen
      const width = renderTargetRef.current.width;
      const height = renderTargetRef.current.height;
      const pixels = new Uint8Array(width * height * 4);
      
      gl.readRenderTargetPixels(
        renderTargetRef.current,
        0,
        0,
        width,
        height,
        pixels
      );

      // Crear canvas temporal para convertir a base64
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const imageData = ctx.createImageData(width, height);
        
        // Voltear imagen verticalmente (WebGL renderiza al revés)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * 4;
            const dstIdx = ((height - 1 - y) * width + x) * 4;
            imageData.data[dstIdx] = pixels[srcIdx];
            imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
            imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
            imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);

        console.log(`✅ Imagen capturada para ${cameraId}: ${imageDataUrl.substring(0, 50)}...`);

        // Actualizar snapshot en el sistema de cámaras
        const camera = cameraSystem.getCamera(cameraId);
        if (camera) {
          const snapshot = camera.getSnapshot();
          cameraSystem.updateCameraSnapshot(cameraId, {
            id: cameraId,
            name: camera.name,
            description: camera.description,
            timestamp: now,
            imageData: imageDataUrl,
            players: snapshot?.players ?? 0, // Mantener contador actual
            fps: Math.round(1000 / gl.info.render.frame),
          });
          console.log(`🔄 Snapshot actualizado para ${cameraId}`);
        } else {
          console.error(`❌ No se encontró la cámara ${cameraId} en el sistema`);
        }
      }

      lastCaptureTime.current = now;
    } catch (error) {
      console.error(`❌ Error capturando cámara ${cameraId}:`, error);
    }
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
      {/* Cámara 1: Vista Aérea */}
      <CameraCapture
        cameraId="aerial-city"
        position={[0, 100, 0]}
        lookAt={[0, 0, 0]}
        fov={75}
      />

      {/* Cámara 2: Entrada del Hotel */}
      <CameraCapture
        cameraId="hotel-entrance"
        position={[10, 5, -95]}
        lookAt={[0, 2, -100]}
        fov={60}
      />

      {/* Cámara 3: Plaza Central */}
      <CameraCapture
        cameraId="central-plaza"
        position={[50, 15, 50]}
        lookAt={[0, 0, 0]}
        fov={70}
      />
    </group>
  );
}

