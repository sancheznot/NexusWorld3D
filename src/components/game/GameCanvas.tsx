'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { useWorldStore } from '@/store/worldStore';
import { useGameSettings } from '@/hooks/useGameSettings';
import PlayerV2 from '@/components/world/PlayerV2';
import { colyseusClient } from '@/lib/colyseus/client';
import CityModel from '@/components/world/CityModel';
import Lighting from '@/components/world/Lighting';
import Skybox from '@/components/world/Skybox';
import ThirdPersonCamera from '@/components/world/ThirdPersonCamera';
import TestingCamera from '@/components/world/TestingCamera';
import { useTestingCamera } from '@/hooks/useTestingCamera';
import { useKeyboard } from '@/hooks/useKeyboard';
import { getPhysicsInstance } from '@/hooks/useCannonPhysics';
import LoginModal from '@/components/game/LoginModal';
import CharacterCreatorV2 from '@/components/game/CharacterCreatorV2';
import GameSettings from '@/components/game/GameSettings';
import ModelInfo from '@/components/ui/ModelInfo';
import FPSCounter from '@/components/ui/FPSCounter';
import PlayerStatsHUD from '@/components/ui/PlayerStatsHUD';
import AdminTeleportUI from '@/components/ui/AdminTeleportUI';
import ChatWindow from '@/components/chat/ChatWindow';
import InventoryUI from '@/components/inventory/InventoryUI';
import { ItemSpawner } from '@/components/world/ItemCollector';
import { THREE_CONFIG } from '@/config/three.config';
import { Vector3 } from 'three';
import PortalTrigger from '@/components/world/PortalTrigger';
import PortalUI from '@/components/ui/PortalUI';
import HotelInterior from '@/components/world/HotelInterior';
import { usePortalSystem } from '@/hooks/usePortalSystem';
import ServerClock from '@/components/ui/ServerClock';
import timeClient from '@/lib/colyseus/TimeClient';
import BankUI from '@/components/ui/BankUI';
import ShopUI from '@/components/ui/ShopUI';
import NPCShopTrigger from '@/components/world/NPCShopTrigger';
import JobsUI from '@/components/ui/JobsUI';
import NPCJobTrigger from '@/components/world/NPCJobTrigger';
import JobWaypointsLayer from '@/components/world/JobWaypointsLayer';
import { NPCS } from '@/constants/npcs';
import CannonCar from '@/components/vehicles/CannonCar';
import CannonStepper from '@/components/physics/CannonStepper';

export default function GameCanvas() {
  const { isConnected, connectionError, connect, joinGame } = useSocket();
  const { position, player } = usePlayerStore();
  const { players } = useWorldStore();
  const { isInventoryOpen, isMapOpen, isChatOpen, toggleInventory, toggleMap, toggleChat, closeAllModals } = useUIStore();
  const { settings, isLoaded } = useGameSettings();
  
  // Game settings state
  const [showSettings, setShowSettings] = useState(false);
  const { isActive: isTestingCameraActive, height: testingHeight, distance: testingDistance } = useTestingCamera(isChatOpen);
  
  // Game flow state
  const [showLogin, setShowLogin] = useState(true);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentMap, setCurrentMap] = useState('exterior');
  const [isDriving, setIsDriving] = useState(false);
  const [hidePlayerWhileDriving, setHidePlayerWhileDriving] = useState(false);
  const [canEnterVehicle, setCanEnterVehicle] = useState(false);
  const [vehSpawn, setVehSpawn] = useState<{ x: number; y: number; z: number; yaw: number } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  
  // Enable keyboard for movement when game is started (menus can be open)
  const keyboardEnabled = isGameStarted;
  const updatePositionStore = usePlayerStore((s) => s.updatePosition);
  const updateRotationStore = usePlayerStore((s) => s.updateRotation);
  const playerVec3 = useMemo(() => new Vector3(position.x, position.y, position.z), [position.x, position.y, position.z]);
  
  // Deshabilitar controles del jugador cuando está conduciendo
  useKeyboard(isGameStarted && !showSettings && !isDriving);
  
  // Toggle entrar/salir del vehículo (F)
  useEffect(() => {
    if (!isGameStarted) return;
    
    const onF = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f') return;
      e.preventDefault();
      const w = window as unknown as { _veh_pos?: { x: number; y: number; z: number }; _veh_spawn?: { x: number; y: number; z: number } };
      const veh = w._veh_pos || w._veh_spawn;
      const px = position.x, py = position.y, pz = position.z;
      const vx = veh?.x ?? px, vy = veh?.y ?? py, vz = veh?.z ?? pz;
      const dx = vx - px, dy = vy - py, dz = vz - pz;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      console.log(`🔑 F pressed. isDriving=${isDriving} dist=${dist.toFixed(2)}m canEnter=${canEnterVehicle}`);

      if (isDriving) {
        setIsDriving(false);
        setHidePlayerWhileDriving(false);
        (window as unknown as { _isDriving?: boolean })._isDriving = false;
        const physics = getPhysicsInstance();
        if (physics && veh) {
          // Detener el vehículo al salir
          try { physics.stopVehicle('playerCar'); } catch {}
          // Rehabilitar colisiones del jugador
          try { physics.setPlayerCollisionEnabled(true); } catch {}
          physics.setPlayerPosition({ x: vx + 2, y: vy, z: vz });
          updatePositionStore({ x: vx + 2, y: vy, z: vz });
        }
        return;
      }

      if (dist <= 6) {
        setIsDriving(true);
        setHidePlayerWhileDriving(true);
        (window as unknown as { _isDriving?: boolean })._isDriving = true;
        // Deshabilitar colisiones del jugador mientras conduce
        const physics = getPhysicsInstance();
        try { physics?.setPlayerCollisionEnabled(false); } catch {}
        console.log('✅ Enter vehicle triggered');
      } else {
        console.log('⛔ Muy lejos para entrar (requiere <= 6m)');
      }
    };
    
    window.addEventListener('keydown', onF);
    return () => window.removeEventListener('keydown', onF);
  }, [isGameStarted, canEnterVehicle, isDriving, updatePositionStore, position.x, position.y, position.z]);

  // Calcular proximidad al vehículo (cada 200ms)
  useEffect(() => {
    if (isDriving) {
      setCanEnterVehicle(false);
      return;
    }
    
    const t = setInterval(() => {
      const w = window as unknown as { 
        _veh_pos?: { x: number; y: number; z: number }; 
        _veh_spawn?: { x: number; y: number; z: number } 
      };
      const vehPos = w._veh_pos || w._veh_spawn;
      if (!vehPos) { 
        setCanEnterVehicle(false); 
        return; 
      }
      
      const dx = vehPos.x - position.x;
      const dy = vehPos.y - position.y;
      const dz = vehPos.z - position.z;
      const distSq = dx*dx + dy*dy + dz*dz;
      
      // Permitir entrar si está a menos de 5 metros
      setCanEnterVehicle(distSq < 25);
    }, 200);
    
    return () => clearInterval(t);
  }, [position.x, position.y, position.z, isDriving]);

  // Obtener spawn publicado por CityModel (con polling para evitar race condition)
  useEffect(() => {
    if (currentMap !== 'exterior') {
      setVehSpawn(null);
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 20; // 2 segundos máximo
    
    const checkSpawn = () => {
      const s = (window as unknown as { _veh_spawn?: { x: number; y: number; z: number; yaw: number } })._veh_spawn;
      if (s) {
        setVehSpawn(s);
        console.log(`🚗 Vehículo spawneado en: X=${s.x.toFixed(1)}, Y=${s.y.toFixed(1)}, Z=${s.z.toFixed(1)}`);
        console.log(`📍 Tu jugador está en: X=${position.x.toFixed(1)}, Y=${position.y.toFixed(1)}, Z=${position.z.toFixed(1)}`);
        const distance = Math.sqrt(
          Math.pow(s.x - position.x, 2) + 
          Math.pow(s.z - position.z, 2)
        );
        console.log(`📏 Distancia al vehículo: ${distance.toFixed(1)} metros`);
        return true;
      }
      return false;
    };
    
    // Intentar inmediatamente
    if (checkSpawn()) return;
    
    // Si no está disponible, hacer polling cada 100ms
    const interval = setInterval(() => {
      attempts++;
      if (checkSpawn() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.warn('⚠️ No se encontró spawn de vehículo después de 2 segundos');
        }
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [currentMap, position.x, position.y, position.z]);
  
  // Constantes para evitar re-renderizados
  const hotelInteriorProps = useMemo(() => ({
    modelPath: "/models/maps/main_map/main_building/interior-hotel.glb",
    name: "hotel-interior"
  }), []);

  useEffect(() => {
    const onConnected = () => timeClient.requestTime();
    colyseusClient.on('room:connected', onConnected);
    timeClient.requestTime();
    return () => {
      colyseusClient.off('room:connected', onConnected as unknown as (...args: unknown[]) => void);
    };
  }, []);

  const handleMapChange = useCallback((mapId: string, pos: Vector3, rot: Vector3) => {
    console.log(`🔄 Cambiando mapa: ${currentMap} -> ${mapId}`);
    console.log(`📍 Nueva posición:`, pos);
    console.log(`🔄 Nueva rotación:`, rot);
    setCurrentMap(mapId);
    updatePositionStore({ x: pos.x, y: pos.y, z: pos.z });
    updateRotationStore({ x: rot.x, y: rot.y, z: rot.z });
    
    // FORZAR TELEPORTACIÓN INMEDIATA - No depender de detección
    console.log(`🚀 FORZANDO TELEPORTACIÓN INMEDIATA a: (${pos.x}, ${pos.y}, ${pos.z})`);
    
    // Usar un timeout para asegurar que el physics esté listo
    setTimeout(() => {
      const physics = getPhysicsInstance();
      if (physics) {
        console.log(`🚀 EJECUTANDO TELEPORT FORZADO`);
        physics.teleportPlayer(
          { x: pos.x, y: pos.y, z: pos.z },
          { x: rot.x, y: rot.y, z: rot.z }
        );
      } else {
        console.warn(`⚠️ Physics no disponible para teleport forzado`);
      }
    }, 100);
  }, [currentMap, updatePositionStore, updateRotationStore]);

  const {
    activePortal,
    showPortalUI,
    currentMapData,
    handlePlayerEnterPortal,
    handlePlayerExitPortal,
    handleTeleport,
    closePortalUI,
  } = usePortalSystem({ currentMap, onMapChange: handleMapChange });
  
  // Debug: Log current map data (solo cuando cambia)
  useEffect(() => {
    console.log(`🗺️ Current Map: ${currentMap}`);
    console.log(`📊 Current Map Data:`, currentMapData);
    // Debug: Portals disponibles
    console.log(`🎯 Renderizando mapa: ${currentMap === 'exterior' ? 'CityModel' : currentMap === 'hotel-interior' ? 'HotelInterior' : 'Ninguno'}`);
  }, [currentMap, currentMapData]);
  
  // Debug: Log current state (only when there are issues)
  if (isGameStarted && !keyboardEnabled) {
    console.log('⚠️ Keyboard disabled but game started:', {
      showLogin,
      showCharacterCreator,
      isGameStarted,
      isConnected,
      keyboardEnabled,
      isInventoryOpen,
      isMapOpen,
      isChatOpen,
      player: player?.username
    });
  }

  // Manejar teclado para menús
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isGameStarted) return;
      
      // Si el modal de configuraciones está abierto, solo permitir Escape
      if (showSettings) {
        if (event.key.toLowerCase() === 'escape') {
          event.preventDefault();
          setShowSettings(false);
        }
        return; // No procesar otras teclas cuando el modal está abierto
      }
      
      // Si el chat está abierto, solo permitir teclas específicas del chat
      if (isChatOpen) {
        if (['escape'].includes(event.key.toLowerCase())) {
          event.preventDefault();
          closeAllModals();
        }
        return; // No procesar otras teclas cuando el chat está abierto
      }
      
      // Los manejadores de teclado están en useKeyboard hook
      // No duplicar la funcionalidad aquí
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isGameStarted, isChatOpen, toggleInventory, toggleMap, toggleChat, closeAllModals, showSettings]);

  // Handlers
  const handleLogin = async () => {
    setShowLogin(false);
    setShowCharacterCreator(true);
    
    // Connect to server after login
    if (!isConnected) {
      setIsConnecting(true);
      await connect();
      setIsConnecting(false);
    }
  };

  const handleCharacterComplete = () => {
    setShowCharacterCreator(false);
    setIsGameStarted(true);
    
    // Join the game with player data after a short delay to ensure event listeners are registered
    if (player && isConnected) {
      // Debug: Llamando joinGame
      setTimeout(() => {
        joinGame(player.id, player.username, player.worldId);
      }, 1000);
    } else {
      console.log('⚠️ No se puede unir al juego:', { hasPlayer: !!player, isConnected });
    }
  };

  const handleBackToLogin = () => {
    setShowCharacterCreator(false);
    setShowLogin(true);
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* 3D Game Canvas - Only show when game is started */}
      {isGameStarted && (
        <Canvas
          camera={{
            fov: THREE_CONFIG.camera.fov,
            near: THREE_CONFIG.camera.near,
            far: THREE_CONFIG.camera.far,
            position: [
              THREE_CONFIG.camera.position.x,
              THREE_CONFIG.camera.position.y,
              THREE_CONFIG.camera.position.z,
            ],
          }}
          shadows
          className={`w-full h-full cursor-crosshair ${showSettings ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
        <Suspense fallback={null}>
            {/* Physics stepper for Cannon.js */}
            <CannonStepper />
            {/* Lighting */}
            <Lighting />
            
            {/* Skybox */}
            <Skybox />
            
            {/* Uniform Terrain - Solo Terrain_01 */}
            {/* <UniformTerrain 
              worldSize={THREE_CONFIG.world.size} 
              tileSize={25}
            /> */}
            
            {/* Hotel Humboldt - 80% del tamaño original */}
            {/* <HotelHumboldt 
              position={[0, 0, -100]} 
              scale={[6, 6, 6]} 
              rotation={[0, 0, 0]} 
              /> */}
            
            {/* Green Dome Structure - Decoración al lado del hotel */}
            {/* <GreenDomeStructure 
              position={[30, 0, -30]} 
              scale={[3, 3, 3]} 
              rotation={[0, 0, 0]} 
            /> */}
            
            {/* Nature Decorations - Optimizado para rendimiento */}
            {/* <NatureDecorations 
              worldSize={THREE_CONFIG.world.size} 
              density={0.1} 
            /> */}
            
            {/* Car Wash Model - Tu modelo sólido de Blender */}
            {/* <CarWashModel 
              modelPath="/models/car-wash.glb"
              name="car-wash"
              position={[20, 0, 20]} 
              scale={[10, 10, 10]} 
              rotation={[0, 0, 0]} 
            /> */}
            
            {/* Renderizar modelo según el mapa actual */}
            
            {currentMap === 'exterior' && (
              <CityModel 
                modelPath="/models/city.glb"
                name="city"
                position={[0, 0, 0]} 
                scale={[1, 1, 1]} 
                rotation={[0, 0, 0]} 
              />
            )}
            
            {currentMap === 'hotel-interior' && (
              <HotelInterior {...hotelInteriorProps} />
            )}

            {/* Portales del mapa actual */}
            {currentMapData?.portals.map((portal) => (
              <PortalTrigger
                key={portal.id}
                portal={portal}
                playerPosition={playerVec3}
                onPlayerEnter={handlePlayerEnterPortal}
                onPlayerExit={handlePlayerExitPortal}
              />
            ))}

            {/* Items recolectables en el mundo (sincronizados) */}
            <ItemSpawner 
              mapId={currentMap}
              playerPosition={[position.x, position.y, position.z]}
            />

            {/* Capa de Waypoints de trabajos activos */}
            <JobWaypointsLayer currentMap={currentMap} playerPosition={playerVec3} />

            {/* NPC Shops por mapa (del config) */}
            {Object.values(NPCS).filter(n => n.mapId === currentMap && n.opensShopId).map(npc => (
              <NPCShopTrigger
                key={npc.id}
                zone={{ id: npc.id, kind: 'shop', name: npc.name, position: npc.zone.position, radius: npc.zone.radius }}
                visual={npc.visual as { path: string; type: 'glb' | 'gltf' | 'fbx' | 'obj'; scale?: number; rotation?: [number, number, number] }}
                playerPosition={playerVec3}
              />
            ))}

            {/* NPC Jobs por mapa (del config) */}
            {Object.values(NPCS).filter(n => n.mapId === currentMap && n.opensJobs).map(npc => (
              <NPCJobTrigger
                key={`job_${npc.id}`}
                zone={{ id: `job_${npc.id}`, kind: 'job', name: `${npc.name} (Trabajos)`, position: npc.zone.position, radius: npc.zone.radius }}
                visual={npc.visual as { path: string; type: 'glb' | 'gltf' | 'fbx' | 'obj'; scale?: number; rotation?: [number, number, number] }}
                playerPosition={playerVec3}
              />
            ))}
          
          {/* Current Player - Ocultar cuando está conduciendo */}
          {!hidePlayerWhileDriving && (
            <PlayerV2 
              position={[position.x, position.y, position.z]}
              isCurrentPlayer={true}
              keyboardEnabled={keyboardEnabled}
              customization={player?.customization}
            />
          )}
          
            {/* Other Players - filtrados por mapa actual */}
            {(() => {
              const sessionId = colyseusClient.getSessionId();
              const sameMap = players.filter(p => p.mapId === currentMap);
              const otherPlayers = sameMap.filter(p => (sessionId ? p.id !== sessionId : p.id !== player?.id));
              void otherPlayers; // placeholder until actual rendering of remote players
              // (Render real de otros jugadores ocurrirá donde corresponda)
              return null;
            })()}
          {(() => {
            const sessionId = colyseusClient.getSessionId();
            const sameMap = players.filter(p => p.mapId === currentMap);
            const others = sameMap.filter(p => (sessionId ? p.id !== sessionId : p.id !== player?.id));
            const origin = { x: position.x, y: position.y, z: position.z };
            const dist = (p: { position: { x: number; z: number } }) => {
              const dx = p.position.x - origin.x;
              const dz = p.position.z - origin.z;
              return dx*dx + dz*dz;
            };
            const limited = others.sort((a, b) => dist(a) - dist(b)).slice(0, 12);
            return limited
              .map((otherPlayer) => (
                <PlayerV2
                  key={otherPlayer.id}
                  position={[otherPlayer.position.x, otherPlayer.position.y, otherPlayer.position.z]}
                  rotation={[otherPlayer.rotation.x, otherPlayer.rotation.y, otherPlayer.rotation.z]}
                  isCurrentPlayer={false}
                  keyboardEnabled={false}
                  customization={otherPlayer.customization}
                  username={otherPlayer.username}
                  remoteAnimation={otherPlayer.animation}
                />
              ));
          })()}
          
                    {/* Camera Controller */}
                    <ThirdPersonCamera />
                    
                    {/* Testing Camera */}
                    <TestingCamera />
        {/* Vehículo (Cannon RaycastVehicle) - Solo renderizar si hay spawn disponible */}
        {vehSpawn && (
          <CannonCar
            driving={isDriving}
            spawn={vehSpawn}
            modelPath="/models/vehicles/cars/Car_07.glb"
          />
        )}

        {/* DEBUG 3D: Pilar verde en el spawn del vehículo para verificar render */}
        {vehSpawn && (
          <group position={[vehSpawn.x, vehSpawn.y, vehSpawn.z]}> 
            {/* Pilar */}
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[0.4, 2, 0.4]} />
              <meshStandardMaterial color="#00ff66" emissive="#003311" emissiveIntensity={1.0} />
            </mesh>
            {/* Esfera brillante */}
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.35, 16, 16]} />
              <meshStandardMaterial color="#ffff00" emissive="#666600" emissiveIntensity={1.5} />
            </mesh>
            {/* Ejes */}
            <axesHelper args={[2]} />
            {/* Luz puntual */}
            <pointLight color="#ffffff" intensity={2.0} distance={6} position={[0, 2, 0]} />
          </group>
        )}
        </Suspense>
        </Canvas>
      )}

      {/* Portal UI */}
      <PortalUI
        portal={activePortal}
        isVisible={showPortalUI}
        onTeleport={handleTeleport}
        onClose={closePortalUI}
      />

      {/* FPS Counter - Esquina izquierda superior */}
      {isLoaded && settings.showFPS && (
        <div className="absolute top-4 left-4 z-10">
          <FPSCounter className="text-xs" />
        </div>
      )}

      {/* Server Clock - Esquina izquierda superior debajo de FPS */}
      <ServerClock className="absolute top-4 left-[48%] z-10" />
      
      {/* Player Stats HUD - Reorganizado */}
      <PlayerStatsHUD className="absolute top-4 right-4 z-10" />
      
      {/* Server Clock HUD */}
      {/* <ServerClock /> */}

      {/* Testing Camera Info Panel */}
      {isTestingCameraActive && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '12px',
          zIndex: 1000
        }}>
          <div>🔍 CÁMARA DE TESTING</div>
          <div>Altura: {testingHeight}m (+/- para ajustar)</div>
          <div>Distancia: {testingDistance}m ([/] para ajustar)</div>
          <div>Presiona T para salir</div>
        </div>
      )}
      
      {/* Debug Info - Solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-16 left-4 z-10 space-y-2">
          <div className="bg-black bg-opacity-50 text-white text-xs p-2 rounded">
            <div>Login: {showLogin ? 'Sí' : 'No'}</div>
            <div>Creator: {showCharacterCreator ? 'Sí' : 'No'}</div>
            <div>Game: {isGameStarted ? 'Sí' : 'No'}</div>
            <div>Keyboard: {keyboardEnabled ? 'Sí' : 'No'}</div>
            <div>Player: {player?.username || 'N/A'}</div>
          </div>
          {connectionError && (
            <div className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded">
              Error: {connectionError}
            </div>
          )}
        </div>
      )}



        <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-50 rounded-lg p-3 text-white text-sm">
          <div className="space-y-1">
            <div><kbd className="bg-gray-700 px-2 py-1 rounded">WASD</kbd> Mover</div>
            <div><kbd className="bg-gray-700 px-2 py-1 rounded">Shift</kbd> Correr</div>
            <div><kbd className="bg-gray-700 px-2 py-1 rounded">I</kbd> Inventario</div>
            <div><kbd className="bg-gray-700 px-2 py-1 rounded">M</kbd> Mapa</div>
            <div><kbd className="bg-gray-700 px-2 py-1 rounded">Enter</kbd> Chat</div>
            <div><kbd className="bg-gray-700 px-2 py-1 rounded">ESC</kbd> Cerrar</div>
          </div>
      {/* Controls Info - Solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
          <button
            onClick={() => setShowModelInfo(true)}
            className="mt-3 w-full px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
          >
            🎨 Ver Modelos
          </button>
      )}
        </div>

      {/* UI Modals */}
      {/* Inventory UI */}
      <InventoryUI />
      {currentMap === 'bank' && <BankUI />}
      <ShopUI />

      {/* Hint para conducir */}
      {!isDriving && canEnterVehicle && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <div className="px-3 py-1 rounded bg-black/70 text-white text-sm">
            Presiona <span className="font-bold">F</span> para conducir
          </div>
          <div className="mt-2 flex justify-center">
            <button
              onClick={() => {
                setIsDriving(true);
                setHidePlayerWhileDriving(true);
                (window as unknown as { _isDriving?: boolean })._isDriving = true;
                console.log('✅ Enter vehicle via button');
              }}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              Entrar al vehículo
            </button>
          </div>
        </div>
      )}
      
      {/* Debug: Mostrar ubicación del vehículo */}
      {process.env.NODE_ENV === 'development' && vehSpawn && (
        <div className="absolute bottom-32 left-4 z-20 bg-blue-900/80 text-white text-xs p-2 rounded">
          <div className="font-bold mb-1">🚗 Vehículo:</div>
          <div>X: {vehSpawn.x.toFixed(1)}</div>
          <div>Y: {vehSpawn.y.toFixed(1)}</div>
          <div>Z: {vehSpawn.z.toFixed(1)}</div>
          <div className="mt-1 font-bold">📍 Tu posición:</div>
          <div>X: {position.x.toFixed(1)}</div>
          <div>Y: {position.y.toFixed(1)}</div>
          <div>Z: {position.z.toFixed(1)}</div>
          <div className="mt-1 font-bold">
            📏 Distancia: {Math.sqrt(
              Math.pow(vehSpawn.x - position.x, 2) + 
              Math.pow(vehSpawn.z - position.z, 2)
            ).toFixed(1)}m
          </div>
        </div>
      )}
      <JobsUI />

      {isMapOpen && (
        <div className="absolute inset-0 z-20 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-bold">Mapa</h2>
              <button
                onClick={toggleMap}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="text-white">
              <p>El mapa del Hotel Humboldt estará aquí...</p>
              <p className="text-sm text-gray-400 mt-2">Presiona M para cerrar</p>
            </div>
          </div>
        </div>
      )}

      <ChatWindow />

      {/* Admin Teleport UI */}
      <AdminTeleportUI />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={handleLogin}
      />

      {/* Character Creator Modal */}
      <CharacterCreatorV2
        isOpen={showCharacterCreator}
        onClose={handleBackToLogin}
        onComplete={handleCharacterComplete}
        isConnecting={isConnecting}
      />

      {/* Model Info Modal */}
      <ModelInfo
        isOpen={showModelInfo}
        onClose={() => setShowModelInfo(false)}
      />

      {/* Game Settings Modal */}
      <GameSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
