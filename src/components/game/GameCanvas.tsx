'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Canvas } from '@react-three/fiber';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { useWorldStore } from '@/store/worldStore';
import { useGameSettings } from '@/hooks/useGameSettings';
import PlayerV2 from '@/components/world/PlayerV2';
import { colyseusClient } from '@/lib/colyseus/client';
import jobsClient from '@/lib/colyseus/JobsClient';
import CityModel from '@/components/world/CityModel';
import Lighting from '@/components/world/Lighting';
import Skybox from '@/components/world/Skybox';
import ThirdPersonCamera from '@/components/world/ThirdPersonCamera';
import SideScrollCamera from '@/components/world/SideScrollCamera';
import TestingCamera from '@/components/world/TestingCamera';
import { useTestingCamera } from '@/hooks/useTestingCamera';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useServerMovementSync } from '@/hooks/useServerMovementSync';
import { getPhysicsInstance } from '@/hooks/useCannonPhysics';
import LoginModal from '@/components/game/LoginModal';
import GameLobby, {
  readLobbyDisplayFromStorage,
  type GameLobbyMeProfile,
} from '@/components/game/GameLobby';
import CharacterCreatorV2 from '@/components/game/CharacterCreatorV2';
import GameSettings from '@/components/game/GameSettings';
import ModelInfo from '@/components/ui/ModelInfo';
import FPSCounter from '@/components/ui/FPSCounter';
import GameHUD from '@/components/ui/GameHUD';
import PauseMenu from '@/components/game/PauseMenu';
import VehicleHUD from '@/components/ui/VehicleHUD';
import AdminTeleportUI from '@/components/ui/AdminTeleportUI';
import ChatWindow from '@/components/chat/ChatWindow';
import InventoryUI from '@/components/inventory/InventoryUI';
import CraftingUI from '@/components/inventory/CraftingUI';
import { useGameWorldStore } from '@/store/gameWorldStore';
import { ItemSpawner } from '@/components/world/ItemCollector';
import ChoppableTreesLayer from '@/components/world/ChoppableTreesLayer';
import ChopRaycastBridge from '@/components/world/ChopRaycastBridge';
import ChopCityTreeSync from '@/components/world/ChopCityTreeSync';
import { THREE_CONFIG } from '@/config/three.config';
import createWebGPUGameRenderer from '@/lib/three/createWebGPUGameRenderer';
import { Vector3 } from 'three';
import PortalTrigger from '@/components/world/PortalTrigger';
import PortalUI from '@/components/ui/PortalUI';
import HotelInterior from '@/components/world/HotelInterior';
import Supermarket from '@/components/world/Supermarket';
import { usePortalSystem } from '@/hooks/usePortalSystem';
import timeClient from '@/lib/colyseus/TimeClient';
import { GAME_KEYBINDINGS, MOVEMENT_HELP_ROWS } from '@/config/gameKeybindings';
import BankUI from '@/components/ui/BankUI';
import ShopUI from '@/components/ui/ShopUI';
import NPCShopTrigger from '@/components/world/NPCShopTrigger';
import JobProgressUI from '@/components/ui/JobProgressUI';
import JobsUI from '@/components/ui/JobsUI';
import NPCJobTrigger from '@/components/world/NPCJobTrigger';
import JobWaypointsLayer from '@/components/world/JobWaypointsLayer';
import { NPCS } from '@/constants/npcs';
import CannonCar from '@/components/vehicles/CannonCar';
import CannonStepper from '@/components/physics/CannonStepper';
import Minimap from '@/components/ui/Minimap';
import TreeChopFeedback from '@/components/game/TreeChopFeedback';
import ItemGainHud from '@/components/game/ItemGainHud';
import WebGlContextRecovery from '@/components/game/WebGlContextRecovery';
import LiveCameraCapture from '@/components/cameras/LiveCameraCapture';
import DebugInfo from '@/components/ui/DebugInfo';
import TruckSpawner from '@/components/game/TruckSpawner';
import { loadAllClientResources } from '@/lib/resources/loadClientResources';
import { frameworkColyseusRoomName, frameworkDefaultWorldId } from '@/lib/frameworkBranding';
import type { PublicPortalRoom } from '@/types/gamePortal.types';

export default function GameCanvas() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const { isConnected, connectionError, connect, joinGame } = useSocket();
  const { player, setPlayer } = usePlayerStore();
  const { players } = useWorldStore();
  const {
    isInventoryOpen,
    isMapOpen,
    isChatOpen,
    isPauseMenuOpen,
    isCraftingOpen,
    toggleInventory,
    toggleMap,
    toggleChat,
    closeAllModals,
  } = useUIStore();
  const { settings, isLoaded } = useGameSettings();
  
  // Game settings state
  const [showSettings, setShowSettings] = useState(false);
  const { isActive: isTestingCameraActive, height: testingHeight, distance: testingDistance } = useTestingCamera();
  
  // Game flow state — lobby primero; login solo si la sala exige cuenta
  const [showLobby, setShowLobby] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<PublicPortalRoom | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [currentMap, setCurrentMap] = useState('exterior');
  const setActiveMapId = useGameWorldStore((s) => s.setActiveMapId);

  useEffect(() => {
    setActiveMapId(currentMap);
  }, [currentMap, setActiveMapId]);
  const [isDriving, setIsDriving] = useState(false);
  const [hidePlayerWhileDriving, setHidePlayerWhileDriving] = useState(false);
  const [canEnterVehicle, setCanEnterVehicle] = useState(false);
  const [vehSpawn, setVehSpawn] = useState<{ x: number; y: number; z: number; yaw: number } | null>(null);
  const [vehicleModel, setVehicleModel] = useState('/models/vehicles/cars/City_Car_07.glb');
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [meProfile, setMeProfile] = useState<GameLobbyMeProfile>(null);
  const [webglRemountKey, setWebglRemountKey] = useState(0);

  const refreshMeProfile = useCallback(() => {
    if (status !== 'authenticated') return;
    void fetch('/api/me/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || typeof data !== 'object') return;
        const d = data as Record<string, unknown>;
        setMeProfile({
          displayName: String(d.displayName ?? 'Jugador'),
          bio: String(d.bio ?? ''),
          image: d.image != null ? String(d.image) : null,
          email: d.email != null ? String(d.email) : null,
          hasSavedProfile: Boolean(d.hasSavedProfile),
        });
      })
      .catch(() => {});
  }, [status]);

  // ES: Recursos extensibles (resources/*/client). EN: Extensible resources.
  useEffect(() => {
    loadAllClientResources();
  }, []);

  useEffect(() => {
    const { brightness: b, contrast: c } = readLobbyDisplayFromStorage();
    setBrightness(b);
    setContrast(c);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      setMeProfile(null);
      return;
    }
    const fallback =
      session.user.name?.trim() ||
      session.user.email?.split('@')[0] ||
      'Jugador';
    setMeProfile({
      displayName: fallback,
      bio: '',
      image: session.user.image ?? null,
      email: session.user.email ?? null,
      hasSavedProfile: false,
    });
    refreshMeProfile();
  }, [
    status,
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    session?.user?.image,
    refreshMeProfile,
  ]);

  /** ES: Jugador en lobby — nombre desde perfil DB si existe. EN: Lobby player — name from DB profile when set. */
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    const name =
      meProfile?.displayName?.trim() ||
      session.user.name?.trim() ||
      session.user.email?.split('@')[0] ||
      'Jugador';
    setPlayer({
      id: session.user.id,
      username: name,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
      worldId: frameworkDefaultWorldId,
      isOnline: false,
      lastSeen: new Date(),
    });
  }, [
    status,
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    meProfile?.displayName,
    setPlayer,
  ]);
  
  // Enable keyboard for movement when game is started (menus can be open)
  const keyboardEnabled = isGameStarted;
  const updatePositionStore = usePlayerStore((s) => s.updatePosition);
  const updateRotationStore = usePlayerStore((s) => s.updateRotation);
  
  // Deshabilitar controles del jugador cuando está conduciendo
  useKeyboard(isGameStarted && !showSettings && !isDriving);
  /** ES: Física → store → Colyseus (persistencia de posición). EN: Physics pose → server. */
  useServerMovementSync(
    isGameStarted && !showSettings && !isDriving && isConnected
  );
  
  // Toggle entrar/salir del vehículo (F)
  useEffect(() => {
    if (!isGameStarted) return;
    
    const onF = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f') return;
      e.preventDefault();
      const w = window as unknown as { _veh_pos?: { x: number; y: number; z: number }; _veh_spawn?: { x: number; y: number; z: number } };
      const veh = w._veh_pos || w._veh_spawn;
      
      const playerPos = usePlayerStore.getState().position;
      if (!playerPos) return;

      const px = playerPos.x, py = playerPos.y, pz = playerPos.z;
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
          // Anular cualquier velocidad residual del jugador y teleport limpio
          try { physics.setPlayerVelocityZero(); } catch {}
          // Calcular posición de salida relativa a la rotación del vehículo
          const vehYaw = (window as unknown as { _veh_yaw?: number })._veh_yaw || 0;
          // Salir a la izquierda del vehículo (lado del conductor)
          // Vector relativo: 2.5m a la izquierda (-2.5 en X)
          const exitOffset = new Vector3(2.5, 0, 0); 
          exitOffset.applyAxisAngle(new Vector3(0, 1, 0), vehYaw);
          
          const exitX = vx + exitOffset.x;
          const exitZ = vz + exitOffset.z;
          
          physics.setPlayerPosition({ x: exitX, y: vy, z: exitZ });
          updatePositionStore({ x: exitX, y: vy, z: exitZ });
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
  }, [isGameStarted, canEnterVehicle, isDriving, updatePositionStore]);

  // 🚚 Remove truck when job is completed
  useEffect(() => {
    const onJobCompleted = () => {
      console.log('🎉 Job completed! Removing truck...');
      setVehSpawn(null);
      setIsDriving(false);
      setHidePlayerWhileDriving(false);
      (window as unknown as { _isDriving?: boolean })._isDriving = false;
    };
    
    jobsClient.on('jobs:completed', onJobCompleted);
    return () => jobsClient.off('jobs:completed', onJobCompleted);
  }, []);

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
      
      const playerPos = usePlayerStore.getState().position;
      if (!playerPos) return;

      const dx = vehPos.x - playerPos.x;
      const dy = vehPos.y - playerPos.y;
      const dz = vehPos.z - playerPos.z;
      const distSq = dx*dx + dy*dy + dz*dz;
      
      // Permitir entrar si está a menos de 5 metros
      setCanEnterVehicle(distSq < 25);
    }, 200);
    
    return () => clearInterval(t);
  }, [isDriving]);

  // Obtener spawn publicado por CityModel (con polling para evitar race condition)
  useEffect(() => {
    if (currentMap !== 'exterior') {
      setVehSpawn(null);
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 300; // 30 segundos máximo (el modelo de ciudad puede tardar en cargar)
    
    const checkSpawn = () => {
      const s = (window as unknown as { _veh_spawn?: { x: number; y: number; z: number; yaw: number } })._veh_spawn;
      if (s) {
        setVehSpawn(s);
        console.log(`🚗 Vehículo spawneado en: X=${s.x.toFixed(1)}, Y=${s.y.toFixed(1)}, Z=${s.z.toFixed(1)}`);
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
          console.warn('⚠️ No se encontró spawn de vehículo después de 30 segundos');
        }
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [currentMap]); // ⚡ Optimized: Removed position dependencies to prevent re-running every frame
  
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
    console.log("⚠️ Keyboard disabled but game started:", {
      showLobby,
      modalLoginOpen: showLogin,
      modalCharacterCreatorOpen: showCharacterCreator,
      isGameStarted,
      isConnected,
      keyboardEnabled,
      nextAuthStatus: status,
      isInventoryOpen,
      isMapOpen,
      isChatOpen,
      player: player?.username,
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

  const handleAuthSuccess = () => {
    setShowLogin(false);
  };

  const handleLobbyEnterRoom = useCallback(
    (room: PublicPortalRoom) => {
      if (room.requiresAuth && !isAuthenticated) {
        setShowLogin(true);
        return;
      }
      if (room.requiresAuth && session?.user?.id) {
        const name =
          meProfile?.displayName?.trim() ||
          session.user.name?.trim() ||
          session.user.email?.split('@')[0] ||
          'Jugador';
        setPlayer({
          id: session.user.id,
          username: name,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          health: 100,
          maxHealth: 100,
          stamina: 100,
          maxStamina: 100,
          level: 1,
          experience: 0,
          worldId: frameworkDefaultWorldId,
          isOnline: false,
          lastSeen: new Date(),
        });
      }
      if (!room.requiresAuth) {
        const gid = `guest-${crypto.randomUUID().slice(0, 10)}`;
        setPlayer({
          id: gid,
          username: 'Invitado',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          health: 100,
          maxHealth: 100,
          stamina: 100,
          maxStamina: 100,
          level: 1,
          experience: 0,
          worldId: frameworkDefaultWorldId,
          isOnline: false,
          lastSeen: new Date(),
        });
      }
      setPendingRoom(room);
      setShowLobby(false);
      setShowCharacterCreator(true);
    },
    [isAuthenticated, session?.user, meProfile?.displayName, setPlayer]
  );

  const handleCharacterComplete = async () => {
    setShowCharacterCreator(false);
    setIsGameStarted(true);
    const roomName =
      pendingRoom?.colyseusRoomName ?? frameworkColyseusRoomName;
    const pBefore = usePlayerStore.getState().player;
    const joinOpts =
      pBefore?.username && pBefore.username.trim().length > 0
        ? { username: pBefore.username.trim().slice(0, 64) }
        : {};
    try {
      await connect(roomName, joinOpts);
    } catch {
      /* connectionError en useSocket */
    }
    const p = usePlayerStore.getState().player;
    if (p) {
      setTimeout(() => {
        joinGame(p.id, p.username, p.worldId);
      }, 800);
    } else {
      console.warn('⚠️ No hay jugador tras crear personaje');
    }
  };

  const handleBackToLobby = () => {
    setShowCharacterCreator(false);
    setShowLobby(true);
    setPendingRoom(null);
  };

  return (
    <div
      className="relative h-screen w-full bg-gray-900"
      style={{
        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
      }}
    >
      {/* 3D Game Canvas - Only show when game is started */}
      {isGameStarted && (
        <Canvas
          key={webglRemountKey}
          {...(THREE_CONFIG.rendering.preferWebGPU
            ? { gl: createWebGPUGameRenderer }
            : {})}
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
          className={`w-full h-full cursor-crosshair ${showSettings || isPauseMenuOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
        <Suspense fallback={null}>
            <WebGlContextRecovery
              onRequestRemount={() =>
                setWebglRemountKey((k) => k + 1)
              }
            />
            {/* Physics stepper for Cannon.js */}
            <CannonStepper />
            {/* Lighting */}
            <Lighting />
            
            {/* Skybox */}
            <Skybox />
            
            {/* Live Camera Capture System - Cámaras reales en tiempo real */}
            <LiveCameraCapture />
            
            {/* Uniform Terrain - Solo Terrain_01 */}
            {/* <UniformTerrain 
              worldSize={THREE_CONFIG.world.size} 
              tileSize={25}
            /> */}
            
            {/* DemoLandmarkBuilding — edificio demo (GLB opcional) */}
            {/* <DemoLandmarkBuilding 
              position={[0, 0, -100]} 
              scale={[6, 6, 6]} 
              rotation={[0, 0, 0]} 
              /> */}
            
            {/* Green Dome Structure — decoración demo */}
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

            {currentMap === 'supermarket' && (
              <Supermarket position={[0, 0, 0]} />
            )}

            {/* Portales del mapa actual */}
            {currentMapData?.portals.map((portal) => (
              <PortalTrigger
                key={portal.id}
                portal={portal}
                onPlayerEnter={handlePlayerEnterPortal}
                onPlayerExit={handlePlayerExitPortal}
              />
            ))}

            {/* Items recolectables en el mundo (sincronizados) */}
            <ItemSpawner 
              mapId={currentMap}
            />

            {currentMap === 'exterior' && (
              <ChoppableTreesLayer mapId={currentMap} />
            )}

            <ChopRaycastBridge />
            <ChopCityTreeSync />

            {/* Capa de Waypoints de trabajos activos */}
            <JobWaypointsLayer currentMap={currentMap} playerRoleId={player?.roleId ?? null} isDriving={isDriving} />

            {/* NPC Shops por mapa (del config) */}
            {Object.values(NPCS).filter(n => n.mapId === currentMap && n.opensShopId).map(npc => (
              <NPCShopTrigger
                key={npc.id}
                zone={{ id: npc.id, kind: 'shop', name: npc.name, position: npc.zone.position, radius: npc.zone.radius }}
                visual={npc.visual as { path: string; type: 'glb' | 'gltf' | 'fbx' | 'obj'; scale?: number; rotation?: [number, number, number] }}
              />
            ))}

            {/* NPC Jobs por mapa (del config) */}
            {Object.values(NPCS).filter(n => n.mapId === currentMap && n.jobId).map(npc => (
              <NPCJobTrigger
                key={`job_${npc.id}`}
                zone={{ id: `job_${npc.id}`, kind: 'job', name: npc.name, position: npc.zone.position, radius: npc.zone.radius }}
                visual={npc.visual as { path: string; type: 'glb' | 'gltf' | 'fbx' | 'obj'; scale?: number; rotation?: [number, number, number] }}
                jobId={npc.jobId!}
              />
            ))}
          
          {/* Current Player - Ocultar cuando está conduciendo */}
          {!hidePlayerWhileDriving && (
            <PlayerV2 
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
            const playerPos = usePlayerStore.getState().position;
            const origin = playerPos ? { x: playerPos.x, y: playerPos.y, z: playerPos.z } : { x: 0, y: 0, z: 0 };
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
                    {THREE_CONFIG.gameMode === 'sideScroller' ? (
                      <SideScrollCamera />
                    ) : (
                      <ThirdPersonCamera />
                    )}
                    
                    {/* Testing Camera */}
                    <TestingCamera />
        {/* Vehículo (Cannon RaycastVehicle) - Solo renderizar si hay spawn disponible */}
        {vehSpawn && (
          <CannonCar
            driving={isDriving}
            spawn={vehSpawn}
            modelPath={vehicleModel}
          />
        )}

        {/* Truck Spawner */}
        <TruckSpawner 
          position={[70, 1, 65]} 
          onSpawn={() => {
            setVehicleModel('/models/vehicles/cars/City_Car_07.glb'); // Using City Car as Truck for now
            // Teleport vehicle to spawn point if needed, or just let it stay
            // Ideally we respawn it at the parking spot
            setVehSpawn({ x: 65, y: 2, z: 65, yaw: 0 });
            // Also ensure we are not driving so we can enter it
            setIsDriving(false);
            setHidePlayerWhileDriving(false);
          }} 
        />

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

      {isGameStarted && (
        <>
          <TreeChopFeedback />
          <ItemGainHud />
          <GameHUD isDriving={isDriving} currentMapId={currentMap} />
        </>
      )}
      
      {/* Vehicle HUD - Mostrar solo cuando está conduciendo */}
      {isDriving && <VehicleHUD vehicleId="playerCar" visible={isDriving} />}

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
      
      {((isLoaded && settings.showFPS) ||
        process.env.NODE_ENV === "development") && (
        <div
          className={`pointer-events-none absolute z-30 left-4 flex max-w-[220px] flex-col gap-2 ${
            isGameStarted ? "top-52 sm:top-56" : "top-4"
          }`}
        >
          {isLoaded && settings.showFPS && (
            <FPSCounter className="text-xs" />
          )}
          {process.env.NODE_ENV === "development" && (
            <>
              <div className="rounded bg-black/65 p-2 text-[11px] leading-snug text-white backdrop-blur-sm">
                <div className="mb-1 border-b border-white/10 pb-1 font-bold text-cyan-300">
                  Dev · conexión / UI
                </div>
                <div>
                  NextAuth:{" "}
                  {status === "loading"
                    ? "cargando…"
                    : status === "authenticated"
                      ? `sí · ${session?.user?.name ?? session?.user?.email ?? "cuenta"}`
                      : "no (invitado / sin sesión)"}
                </div>
                <div>
                  Modal login (auth): {showLogin ? "abierto" : "cerrado"}
                </div>
                <div>
                  Modal personaje: {showCharacterCreator ? "abierto" : "cerrado"}
                </div>
                <div>Lobby pantalla: {showLobby ? "visible" : "oculto"}</div>
                <div>Partida 3D: {isGameStarted ? "sí" : "no"}</div>
                <div>Teclado mundo: {keyboardEnabled ? "sí" : "no"}</div>
                <div>Jugador (store): {player?.username || "N/A"}</div>
                <div className="mt-1 text-[9px] text-slate-400">
                  EN: “Modal login” = ventana de auth, no si estás logueado.
                </div>
              </div>
              {connectionError && (
                <div className="rounded bg-red-600 px-3 py-1 text-sm text-white">
                  Error: {connectionError}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {process.env.NODE_ENV === "development" && isGameStarted && (
        <div
          data-game-scroll-region
          className="scrollbar-hidden absolute bottom-40 left-4 z-20 max-h-48 max-w-[200px] overflow-y-auto overscroll-y-contain rounded-lg border border-white/10 bg-black/60 p-2 text-[10px] text-white backdrop-blur-sm [-webkit-overflow-scrolling:touch]"
          onWheelCapture={(e) => e.stopPropagation()}
        >
          <p className="mb-1 font-bold text-cyan-300">Teclas (dev)</p>
          <div className="space-y-0.5">
            {MOVEMENT_HELP_ROWS.map((r) => (
              <div key={r.keys} className="flex justify-between gap-2">
                <kbd className="rounded bg-white/15 px-1 font-mono">{r.keys}</kbd>
                <span className="text-slate-300">{r.descriptionEs}</span>
              </div>
            ))}
            {GAME_KEYBINDINGS.map((b) => (
              <div key={b.id} className="flex justify-between gap-2">
                <kbd className="rounded bg-white/15 px-1 font-mono">{b.label}</kbd>
                <span className="truncate text-slate-300">{b.descriptionEs}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowModelInfo(true)}
            className="mt-2 w-full rounded bg-purple-600 px-2 py-1 text-[10px] hover:bg-purple-700"
          >
            Ver modelos
          </button>
        </div>
      )}

      {/* UI Modals */}
      {/* Inventory UI */}
      <InventoryUI />
      {isCraftingOpen && <CraftingUI />}
      {currentMap === 'bank' && <BankUI />}
      <ShopUI />
      <JobProgressUI />

      {/* Hint para conducir */}
      {!isDriving && canEnterVehicle && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50">
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
      
      {/* Debug: Mostrar ubicación del vehículo y jugador */}
      <DebugInfo vehSpawn={vehSpawn} />



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
              <p>El mapa del mundo (plantilla NexusWorld3D) estará aquí…</p>
              <p className="text-sm text-gray-400 mt-2">Presiona M para cerrar</p>
            </div>
          </div>
        </div>
      )}

      <ChatWindow />

      {/* Admin Teleport UI */}
      <AdminTeleportUI />

      {isGameStarted && <Minimap placement="top-right" />}

      {showLobby && !isGameStarted && (
        <GameLobby
          onEnterRoom={handleLobbyEnterRoom}
          onOpenAuth={() => setShowLogin(true)}
          isAuthenticated={isAuthenticated}
          accountUserId={session?.user?.id ?? null}
          meProfile={meProfile}
          onProfileUpdated={refreshMeProfile}
          brightness={brightness}
          contrast={contrast}
          onBrightnessChange={setBrightness}
          onContrastChange={setContrast}
        />
      )}

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLogin={handleAuthSuccess}
      />

      <CharacterCreatorV2
        isOpen={showCharacterCreator}
        onClose={handleBackToLobby}
        onComplete={() => {
          void handleCharacterComplete();
        }}
      />

      {/* Model Info Modal */}
      <ModelInfo
        isOpen={showModelInfo}
        onClose={() => setShowModelInfo(false)}
      />

      <PauseMenu
        isOpen={isPauseMenuOpen}
        onResume={() => {}}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Game Settings Modal */}
      <GameSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
