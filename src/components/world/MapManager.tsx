'use client';

import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stats } from '@react-three/drei';
import { Vector3 } from 'three';
import PortalTrigger from './PortalTrigger';
import PortalUI from '../ui/PortalUI';
import CarWashModel from './CarWashModel';
import { usePortalSystem } from '@/hooks/usePortalSystem';
import { Portal } from '@/types/portal.types';

interface MapManagerProps {
  currentMap: string;
  playerPosition: Vector3;
  onMapChange: (mapId: string, position: Vector3, rotation: Vector3) => void;
  onPlayerPositionChange: (position: Vector3) => void;
}

export default function MapManager({ 
  currentMap, 
  playerPosition, 
  onMapChange, 
  onPlayerPositionChange 
}: MapManagerProps) {
  const {
    activePortal,
    showPortalUI,
    currentMapData,
    handlePlayerEnterPortal,
    handlePlayerExitPortal,
    handleTeleport,
    closePortalUI
  } = usePortalSystem({ currentMap, onMapChange });

  // Renderizar objetos del mapa actual
  const renderMapObjects = () => {
    if (!currentMapData) return null;

    return (
      <>
        {/* Objetos del mapa */}
        {currentMapData.objects.map((obj, index) => (
          <mesh key={index} position={[obj.position.x, obj.position.y, obj.position.z]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#8B4513" />
          </mesh>
        ))}

        {/* Portales del mapa */}
        {currentMapData.portals.map((portal) => (
          <PortalTrigger
            key={portal.id}
            portal={portal}
            playerPosition={playerPosition}
            onPlayerEnter={handlePlayerEnterPortal}
            onPlayerExit={handlePlayerExitPortal}
          />
        ))}
      </>
    );
  };

  // Renderizar contenido específico del mapa
  const renderMapContent = () => {
    switch (currentMap) {
      case 'exterior':
        return (
          <>
            {/* Hotel exterior */}
            <mesh position={[0, 0, -100]} scale={[6, 6, 6]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#C0C0C0" />
            </mesh>
            
            {/* Car Wash Model - Tu modelo sólido de Blender */}
            <CarWashModel 
              modelPath="/models/car-wash.glb"
              name="car-wash"
              position={[20, 0, 20]} 
              scale={[2, 2, 2]} 
              rotation={[0, Math.PI / 4, 0]} 
            />
            
            {/* Terreno */}
            <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[200, 200]} />
              <meshBasicMaterial color="#228B22" />
            </mesh>
          </>
        );

      case 'hotel-interior':
        return (
          <>
            {/* Lobby del hotel */}
            <mesh position={[0, 0, 0]} scale={[10, 8, 15]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#F5F5DC" />
            </mesh>
            
            {/* Recepción */}
            <mesh position={[0, 0, 5]} scale={[3, 1, 1]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#8B4513" />
            </mesh>
            
            {/* Escaleras */}
            <mesh position={[5, 0, 0]} scale={[2, 1, 8]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#696969" />
            </mesh>
          </>
        );

      default:
        return (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#FF0000" />
          </mesh>
        );
    }
  };

  if (!currentMapData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Cargando mapa...</div>
      </div>
    );
  }

  return (
    <>
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        shadows
      >
        <Suspense fallback={null}>
          {/* Iluminación */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          
          {/* Grid */}
          <Grid
            position={[0, 0, 0]}
            args={[100, 100]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#6f6f6f"
            sectionSize={10}
            sectionThickness={1}
            sectionColor="#9d4edd"
            fadeDistance={50}
            fadeStrength={1}
          />
          
          {/* Contenido del mapa */}
          {renderMapContent()}
          
          {/* Objetos y portales */}
          {renderMapObjects()}
          
          {/* Controles de cámara */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={1}
            maxDistance={500}
            panSpeed={1.2}
            zoomSpeed={1.2}
            rotateSpeed={1.0}
            makeDefault
          />
          
          {/* Stats */}
          <Stats />
        </Suspense>
      </Canvas>

      {/* UI del Portal */}
      <PortalUI
        portal={activePortal}
        isVisible={showPortalUI}
        onTeleport={handleTeleport}
        onClose={closePortalUI}
      />

      {/* Info del mapa actual */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded text-sm">
        <div className="font-bold">{currentMapData.name}</div>
        <div className="text-gray-300">{currentMapData.description}</div>
        <div className="text-xs text-gray-400 mt-1">
          Portales: {currentMapData.portals.length}
        </div>
      </div>
    </>
  );
}
