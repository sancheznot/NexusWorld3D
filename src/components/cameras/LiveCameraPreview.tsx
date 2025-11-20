'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { cameraSystem } from '@/lib/cameras/CameraSystem';
import { useLiveCameraPlayers } from '@/hooks/useLiveCameraPlayers';

interface CameraPreviewProps {
  cameraId: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
  playerCount?: number;
}

/**
 * Componente que renderiza una mini-escena 3D para preview de cámara
 * Este se usa en la página principal, independiente del juego
 */
function CameraPreviewCapture({ cameraId, position, lookAt, fov = 60, playerCount = 0 }: CameraPreviewProps) {
  const { gl, scene } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const lastCaptureTime = useRef(0);
  const captureInterval = 16; // ~60 FPS para video MÁS fluido (1000ms / 60fps = 16ms)
  const captureCount = useRef(0); // Contador de capturas

  // Crear RenderTarget con MAYOR RESOLUCIÓN
  useEffect(() => {
    console.log(`🎥 [PREVIEW] Inicializando cámara: ${cameraId} (60 FPS - Alta calidad)`);
    
    renderTargetRef.current = new THREE.WebGLRenderTarget(800, 450, { // Mayor resolución: 800x450
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    return () => {
      console.log(`🗑️ [PREVIEW] Limpiando cámara: ${cameraId}`);
      renderTargetRef.current?.dispose();
    };
  }, [cameraId]);

  // Capturar frame
  useFrame(() => {
    const now = Date.now();
    if (now - lastCaptureTime.current < captureInterval) return;
    if (!cameraRef.current || !renderTargetRef.current) return;

    try {
      const camera = cameraRef.current;
      camera.position.set(...position);
      camera.lookAt(...lookAt);
      camera.updateMatrixWorld();

      // Renderizar a texture
      const currentRenderTarget = gl.getRenderTarget();
      gl.setRenderTarget(renderTargetRef.current);
      gl.render(scene, camera);
      gl.setRenderTarget(currentRenderTarget);

      // Leer pixels
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

      // Convertir a imagen
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const imageData = ctx.createImageData(width, height);
        
        // Voltear verticalmente
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
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85); // Mayor calidad: 0.85

        captureCount.current++;
        
        // Log cada 60 capturas (~1 segundo)
        if (captureCount.current % 60 === 0) {
          console.log(`📹 [${cameraId}] Frame ${captureCount.current} capturado - ${playerCount} jugadores - 60 FPS`);
        }

        // Actualizar snapshot
        const camera = cameraSystem.getCamera(cameraId);
        if (camera) {
          cameraSystem.updateCameraSnapshot(cameraId, {
            id: cameraId,
            name: camera.name,
            description: camera.description,
            timestamp: now,
            imageData: imageDataUrl,
            players: playerCount, // Jugadores REALES desde Colyseus
            fps: Math.round(1000 / captureInterval), // FPS real (~30)
          });
        }
      }

      lastCaptureTime.current = now;
    } catch (error) {
      // Log errores ocasionalmente
      if (captureCount.current % 100 === 0) {
        console.error(`❌ [PREVIEW] Error capturando ${cameraId}:`, error);
      }
    }
  });

  return (
    <perspectiveCamera
      ref={cameraRef}
      position={position}
      fov={fov}
      near={0.1}
      far={1000}
    />
  );
}

/**
 * Componente que carga el modelo de la ciudad real
 */
function CityModelPreview() {
  const { scene } = useGLTF('/models/city.glb');
  
  useEffect(() => {
    console.log('🏙️ [PREVIEW] Modelo de ciudad cargado');
  }, []);

  return <primitive object={scene} position={[0, 0, 0]} scale={[1, 1, 1]} />;
}

/**
 * Componente que renderiza un jugador en las cámaras
 */
function LivePlayerModel({ player }: { player: { id: string; username: string; position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; model: string } }) {
  const gltf = useGLTF(player.model);
  const scene = 'scene' in gltf ? gltf.scene : gltf;
  
  return (
    <group position={[player.position.x, player.position.y, player.position.z]}>
      <primitive 
        object={scene} 
        rotation={[player.rotation.x, player.rotation.y, player.rotation.z]}
        scale={[1, 1, 1]}
      />
      {/* Nombre del jugador flotante */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
    </group>
  );
}

/**
 * Componente que gestiona todos los jugadores en la escena
 */
function LivePlayersRenderer() {
  const { players, playerCount, isConnected } = useLiveCameraPlayers();

  useEffect(() => {
    console.log(`👥 [PREVIEW] Jugadores actuales: ${playerCount}`);
  }, [playerCount]);

  if (!isConnected) {
    console.log('⏳ [PREVIEW] Esperando conexión a Colyseus...');
    return null;
  }

  return (
    <group name="live-players">
      {players.map((player) => (
        <LivePlayerModel key={player.id} player={player} />
      ))}
    </group>
  );
}

/**
 * Mini escena 3D para preview de cámaras
 * Se renderiza en la página principal
 */
export default function LiveCameraPreview() {
  const [isClient, setIsClient] = useState(false);
  const { playerCount } = useLiveCameraPlayers();

  useEffect(() => {
    setIsClient(true);
    console.log('🎬 [PREVIEW] LiveCameraPreview montado - Cargando mundo real');
    return () => {
      console.log('🎬 [PREVIEW] LiveCameraPreview desmontado');
    };
  }, []);

  if (!isClient) return null;

  return (
    <div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
      <Canvas>
        {/* Iluminación MEJORADA para todas las vistas */}
        <ambientLight intensity={0.8} />
        
        {/* Luz principal desde arriba (para vista aérea) */}
        <directionalLight 
          position={[0, 100, 0]} 
          intensity={1.5} 
          castShadow
        />
        
        {/* Luz lateral */}
        <directionalLight 
          position={[50, 50, 25]} 
          intensity={1.0} 
          castShadow
        />
        
        {/* Luz desde abajo para eliminar sombras oscuras */}
        <directionalLight 
          position={[0, -20, 0]} 
          intensity={0.5} 
        />
        
        {/* Luz hemisférica para ambiente más natural */}
        <hemisphereLight args={['#87CEEB', '#545454', 0.6]} />
        
        {/* Luces puntuales adicionales */}
        <pointLight position={[0, 30, 0]} intensity={1} distance={100} />
        <pointLight position={[50, 30, 50]} intensity={0.8} distance={100} />
        <pointLight position={[-50, 30, -50]} intensity={0.8} distance={100} />

        {/* Modelo REAL de la ciudad */}
        <CityModelPreview />

        {/* Jugadores REALES desde Colyseus */}
        <LivePlayersRenderer />

        {/* Cámaras de captura con contador de jugadores REAL */}
        {/* Vista Aérea - MEJORADA para verse como cámara admin */}
        <CameraPreviewCapture
          cameraId="aerial-city"
          position={[0, 80, 80]}
          lookAt={[0, 0, 0]}
          fov={60}
          playerCount={playerCount}
        />

        {/* Entrada Hotel - Vista lateral mejorada */}
        <CameraPreviewCapture
          cameraId="hotel-entrance"
          position={[50, 20, -80]}
          lookAt={[0, 5, -100]}
          fov={65}
          playerCount={playerCount}
        />

        {/* Plaza Central - Vista diagonal */}
        <CameraPreviewCapture
          cameraId="central-plaza"
          position={[-60, 25, 60]}
          lookAt={[0, 0, 0]}
          fov={70}
          playerCount={playerCount}
        />
      </Canvas>
    </div>
  );
}

