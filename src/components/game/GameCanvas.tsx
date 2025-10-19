'use client';

import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSocket } from '@/hooks/useSocket';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { useWorldStore } from '@/store/worldStore';
import PlayerV2 from '@/components/world/PlayerV2';
import Terrain from '@/components/world/Terrain';
import EnhancedTerrain from '@/components/world/EnhancedTerrain';
import GLBTerrain from '@/components/world/GLBTerrain';
import UniformTerrain from '@/components/world/UniformTerrain';
import NatureDecorations from '@/components/world/NatureDecorations';
import HotelHumboldt from '@/components/world/HotelHumboldt';
import GreenDomeStructure from '@/components/world/GreenDomeStructure';
import Lighting from '@/components/world/Lighting';
import ThirdPersonCamera from '@/components/world/ThirdPersonCamera';
import TestingCamera from '@/components/world/TestingCamera';
import { useTestingCamera } from '@/hooks/useTestingCamera';
import LoginModal from '@/components/game/LoginModal';
import CharacterCreatorV2 from '@/components/game/CharacterCreatorV2';
import ModelInfo from '@/components/ui/ModelInfo';
import FPSCounter from '@/components/ui/FPSCounter';
import { THREE_CONFIG } from '@/config/three.config';

export default function GameCanvas() {
  const { isConnected, connectionError, connect, joinGame } = useSocket();
  const { position, health, maxHealth, stamina, maxStamina, level, isMoving, isRunning, player } = usePlayerStore();
  const { players } = useWorldStore();
  const { isInventoryOpen, isMapOpen, isChatOpen, toggleInventory, toggleMap, toggleChat, closeAllModals } = useUIStore();
  const { isActive: isTestingCameraActive, height: testingHeight, distance: testingDistance } = useTestingCamera();
  
  // Game flow state
  const [showLogin, setShowLogin] = useState(true);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showModelInfo, setShowModelInfo] = useState(false);
  
  // Enable keyboard for movement when game is started (menus can be open)
  const keyboardEnabled = isGameStarted;
  
  console.log('🎮 Keyboard state:', {
    isGameStarted,
    isInventoryOpen,
    isMapOpen,
    isChatOpen,
    keyboardEnabled
  });
  
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
      
      console.log(`🎮 Tecla presionada: ${event.key}`);
      
      switch (event.key.toLowerCase()) {
        case 'i':
          event.preventDefault();
          toggleInventory();
          break;
        case 'm':
          event.preventDefault();
          toggleMap();
          break;
        case 'enter':
          event.preventDefault();
          toggleChat();
          break;
        case 'escape':
          event.preventDefault();
          closeAllModals();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isGameStarted, toggleInventory, toggleMap, toggleChat, closeAllModals]);

  // Handlers
  const handleLogin = async (username: string) => {
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
    
    // Join the game with player data
    if (player && isConnected) {
      joinGame(player.id, player.username, player.worldId);
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
          className="w-full h-full cursor-crosshair"
        >
        <Suspense fallback={null}>
            {/* Lighting */}
            <Lighting />
            
            {/* Uniform Terrain - Solo Terrain_01 */}
            <UniformTerrain 
              worldSize={THREE_CONFIG.world.size} 
              tileSize={25}
            />
            
            {/* Hotel Humboldt - 80% del tamaño original */}
            <HotelHumboldt 
              position={[0, 0, -100]} 
              scale={[8, 8, 8]} 
              rotation={[0, 0, 0]} 
            />
            
            {/* Green Dome Structure - Decoración al lado del hotel */}
            <GreenDomeStructure 
              position={[30, 0, -30]} 
              scale={[3, 3, 3]} 
              rotation={[0, 0, 0]} 
            />
            
            {/* Nature Decorations - Optimizado para rendimiento */}
            <NatureDecorations 
              worldSize={THREE_CONFIG.world.size} 
              density={0.1} 
            />
          
          {/* Current Player */}
          <PlayerV2 
            position={[position.x, position.y, position.z]}
            isCurrentPlayer={true}
            keyboardEnabled={keyboardEnabled}
            customization={player?.customization}
          />
          
          {/* Other Players */}
          {players.map((otherPlayer) => (
            <PlayerV2
              key={otherPlayer.id}
              position={[otherPlayer.position.x, otherPlayer.position.y, otherPlayer.position.z]}
              rotation={[otherPlayer.rotation.x, otherPlayer.rotation.y, otherPlayer.rotation.z]}
              isCurrentPlayer={false}
              keyboardEnabled={false}
              customization={otherPlayer.customization}
              username={otherPlayer.username}
            />
          ))}
          
                    {/* Camera Controller */}
                    <ThirdPersonCamera />
                    
                    {/* Testing Camera */}
                    <TestingCamera />
        </Suspense>
        </Canvas>
      )}

      {/* FPS Counter */}
      <FPSCounter />
      
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
      
      {/* Debug Info */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
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

      {/* HUD */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        {/* Health Bar */}
        <div className="bg-black bg-opacity-50 rounded-lg p-3 min-w-[200px]">
          <div className="flex items-center justify-between text-white text-sm mb-1">
            <span>Salud</span>
            <span>{health}/{maxHealth}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(health / maxHealth) * 100}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="bg-black bg-opacity-50 rounded-lg p-3 min-w-[200px]">
          <div className="flex items-center justify-between text-white text-sm mb-1">
            <span>Energía</span>
            <span>{stamina}/{maxStamina}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(stamina / maxStamina) * 100}%` }}
            />
          </div>
        </div>

        {/* Level */}
        <div className="bg-black bg-opacity-50 rounded-lg p-3 min-w-[200px]">
          <div className="text-white text-sm">
            <span>Nivel: </span>
            <span className="font-bold text-yellow-400">{level}</span>
          </div>
        </div>
      </div>

      {/* Player Position Debug */}
      <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-50 rounded-lg p-3 text-white text-sm">
        <div>Posición: ({position.x.toFixed(2)}, {position.y.toFixed(2)}, {position.z.toFixed(2)})</div>
        <div>Estado: {isMoving ? (isRunning ? 'Corriendo' : 'Caminando') : 'Inmóvil'}</div>
      </div>

      {/* Controls Info */}
      <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-50 rounded-lg p-3 text-white text-sm">
        <div className="space-y-1">
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">WASD</kbd> Mover</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">Shift</kbd> Correr</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">I</kbd> Inventario</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">M</kbd> Mapa</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">Enter</kbd> Chat</div>
          <div><kbd className="bg-gray-700 px-2 py-1 rounded">ESC</kbd> Cerrar</div>
        </div>
        <button
          onClick={() => setShowModelInfo(true)}
          className="mt-3 w-full px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
        >
          🎨 Ver Modelos
        </button>
      </div>

      {/* UI Modals */}
      {isInventoryOpen && (
        <div className="absolute inset-0 z-20 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-xl font-bold">Inventario</h2>
              <button
                onClick={toggleInventory}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="text-white">
              <p>Tu inventario estará aquí...</p>
              <p className="text-sm text-gray-400 mt-2">Presiona I para cerrar</p>
            </div>
          </div>
        </div>
      )}

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

      {isChatOpen && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-black bg-opacity-75 rounded-lg p-4 w-96">
          <div className="text-white">
            <div className="mb-2">
              <span className="text-green-400">Chat Global</span>
            </div>
            <div className="bg-gray-800 rounded p-2 mb-2 h-32 overflow-y-auto">
              <div className="text-sm text-gray-300">
                <div>Bienvenido al Hotel Humboldt!</div>
                <div>Usa WASD para moverte</div>
                <div>Presiona Enter para enviar mensaje</div>
              </div>
            </div>
            <input
              type="text"
              placeholder="Escribe tu mensaje..."
              className="w-full bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  toggleChat();
                }
              }}
              autoFocus
            />
          </div>
        </div>
      )}

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
    </div>
  );
}
