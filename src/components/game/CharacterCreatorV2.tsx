'use client';

import { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import AnimatedCharacter from '@/components/world/AnimatedCharacter';

interface CharacterCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isConnecting?: boolean;
}

interface CharacterCustomization {
  bodyColor: string;
  headColor: string;
  eyeColor: string;
  bodyType: 'normal' | 'muscular' | 'slim';
  headType: 'normal' | 'big' | 'small';
  height: number;
  modelType: 'men' | 'woman' | 'custom';
  customBaseModel: 'men' | 'woman'; // Modelo base para personalizado
}

const defaultCustomization: CharacterCustomization = {
  bodyColor: '#4a90e2',
  headColor: '#fdbcb4',
  eyeColor: '#2c3e50',
  bodyType: 'normal',
  headType: 'normal',
  height: 1.0,
  modelType: 'men',
  customBaseModel: 'men',
};

// Loading fallback
function LoadingFallback() {
  return (
    <Html center>
      <div className="text-white text-lg bg-black bg-opacity-70 px-4 py-2 rounded-lg">
        Cargando personaje...
      </div>
    </Html>
  );
}

// Character Preview Component
function CharacterPreview({ customization }: { customization: CharacterCustomization }) {

  // Determinar qué modelo usar (siempre idle para preview)
  const getModelPath = () => {
    switch (customization.modelType) {
      case 'men': return '/models/characters/men/men-all.glb';
      case 'woman': return '/models/characters/women/women-all.glb';
      case 'custom': 
        return customization.customBaseModel === 'woman' 
          ? '/models/characters/women/women-all.glb'
          : '/models/characters/men/men-all.glb';
      default: return '/models/characters/men/men-all.glb';
    }
  };

  // Usar modelo GLB real con animación idle para preview
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AnimatedCharacter
        modelPath={getModelPath()}
        position={[0, -0.5, 0]}
        rotation={[0, 0, 0]}
        scale={[1, 1, 1]}
        isCurrentPlayer={false}
        animation="idle"
      />
    </Suspense>
  );
}

export default function CharacterCreatorV2({ 
  isOpen, 
  onClose, 
  onComplete, 
  isConnecting = false 
}: CharacterCreatorProps) {
  const [customization, setCustomization] = useState<CharacterCustomization>(defaultCustomization);
  const { updatePlayer } = usePlayerStore();
  const { setShowCharacterCreator } = useUIStore();

  // NO precargar - dejar que Suspense maneje la carga bajo demanda

  const handleComplete = () => {
    // Guardar solo el tipo de modelo en el store
    updatePlayer({
      customization: {
        bodyColor: '#4a90e2',
        headColor: '#fdbcb4',
        eyeColor: '#2c3e50',
        bodyType: 'normal',
        headType: 'normal',
        height: 1.0,
        modelType: customization.modelType,
        customBaseModel: customization.modelType === 'woman' ? 'woman' : 'men',
      },
      isOnline: true
    });
    
    setShowCharacterCreator(false);
    onComplete();
  };

  const updateCustomization = (updates: Partial<CharacterCustomization>) => {
    setCustomization(prev => ({ ...prev, ...updates }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">🎭 Creador de Personaje</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* 3D Preview */}
          <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
            <Canvas
              camera={{ position: [0, 0.5, 4], fov: 60 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <CharacterPreview customization={customization} />
              <OrbitControls 
                enablePan={false} 
                enableZoom={false} 
                enableRotate={true}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI / 2}
                target={[0, 0, 0]}
              />
              <Environment preset="sunset" />
            </Canvas>
          </div>

          {/* Customization Panel */}
          <div className="w-80 space-y-6 overflow-y-auto">
            {/* Model Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Selecciona tu Personaje</h3>
              <p className="text-sm text-gray-400">Los modelos se muestran con sus colores originales</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updateCustomization({ modelType: 'men' })}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    customization.modelType === 'men'
                      ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">👨</div>
                    <div className="text-lg text-white font-medium">Hombre</div>
                    <div className="text-sm text-gray-400">Modelo masculino</div>
                  </div>
                </button>
                <button
                  onClick={() => updateCustomization({ modelType: 'woman' })}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    customization.modelType === 'woman'
                      ? 'border-pink-500 bg-pink-500 bg-opacity-20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">👩</div>
                    <div className="text-lg text-white font-medium">Mujer</div>
                    <div className="text-sm text-gray-400">Modelo femenino</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleComplete}
            disabled={isConnecting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'Conectando...' : 'Crear Personaje'}
          </button>
        </div>
      </div>
    </div>
  );
}
