'use client';

import { useState, useEffect } from 'react';
import { modelLoader } from '@/lib/three/modelLoader';

interface ModelInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModelInfo({ isOpen, onClose }: ModelInfoProps) {
  const [modelCounts, setModelCounts] = useState({
    nature: 0,
    interior: 0,
    building: 0,
    weapon: 0
  });

  useEffect(() => {
    if (isOpen) {
      // Count available models
      const nature = modelLoader.getNatureModels().length;
      const interior = modelLoader.getInteriorModels().length;
      const building = modelLoader.getBuildingModels().length;
      const weapon = modelLoader.getWeaponModels().length;
      
      setModelCounts({ nature, interior, building, weapon });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            🎨 Modelos Low-Poly Disponibles
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Nature Models */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-400 mb-3">
              🌿 Naturaleza ({modelCounts.nature} modelos)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              <div>• CartoonGrass - Hierba y flores</div>
              <div>• FantasyForest - Árboles y vegetación</div>
              <div>• LowPolyNature - Elementos naturales</div>
              <div>• 4SeasonNature - Estaciones del año</div>
              <div>• TropicalIsland - Isla tropical</div>
            </div>
          </div>

          {/* Interior Models */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">
              🏠 Interiores ({modelCounts.interior} modelos)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              <div>• LowPolyInterior - Muebles básicos</div>
              <div>• LP_CozyInterior - Interiores acogedores</div>
              <div>• LP_SciFi_Interior - Estilo futurista</div>
            </div>
          </div>

          {/* Building Models */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">
              🏢 Edificios ({modelCounts.building} modelos)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              <div>• LowPolyCity - Edificios urbanos</div>
              <div>• LowPolyVillage - Casas rurales</div>
              <div>• LowPolyMegapolis - Metrópolis</div>
              <div>• LowPolyCubeWorld - Mundo cúbico</div>
            </div>
          </div>

          {/* Weapon Models */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-400 mb-3">
              ⚔️ Armas ({modelCounts.weapon} modelos)
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              <div>• LowPolyRPGWeapons - Armas RPG</div>
              <div>• LowPolyWeapons - Armas variadas</div>
              <div>• LowPolyFPS (1-6) - Armas FPS</div>
            </div>
          </div>

          {/* Additional Packs */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-400 mb-3">
              🎮 Packs Adicionales
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
              <div>• LowPolyFarm - Granja</div>
              <div>• LowPolyDungeons - Mazmorras</div>
              <div>• LowPoly_SciFi_JC - Ciencia ficción</div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-900 bg-opacity-50 rounded-lg">
          <p className="text-green-200 text-sm">
            <strong>✅ Modelos Integrados:</strong>
            <br />• <strong>Hotel Humboldt</strong> - Modelo principal del hotel (107MB)
            <br />• <strong>Green Dome Structure</strong> - Estructura decorativa al lado del hotel
            <br />• <strong>Terreno Optimizado</strong> - Terrain_01.glb para todo el mapa (15KB, más eficiente)
            <br />• <strong>Árboles Reales</strong> - Tree_04, Tree_05, Tree_06 (132-271KB cada uno)
            <br />• <strong>Environment Models</strong> - 30+ modelos de hierba, plantas, flores y rocas
            <br />• <strong>Contador FPS</strong> - Monitoreo de rendimiento en tiempo real
            <br />• <strong>Sistema de Colisiones</strong> - Colisiones sólidas con edificios y terreno
          </p>
        </div>

            <div className="mt-4 p-4 bg-blue-900 bg-opacity-50 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>🎮 Controles del Juego:</strong>
                <br />• <kbd className="bg-gray-700 px-1 rounded">WASD</kbd> - Mover personaje (relativo a la cámara)
                <br />• <kbd className="bg-gray-700 px-1 rounded">Shift</kbd> - Correr
                <br />• <kbd className="bg-gray-700 px-1 rounded">Mouse</kbd> - Rotar cámara (arrastrar)
                <br />• <kbd className="bg-gray-700 px-1 rounded">I</kbd> - Inventario
                <br />• <kbd className="bg-gray-700 px-1 rounded">M</kbd> - Mapa
                <br />• <kbd className="bg-gray-700 px-1 rounded">Enter</kbd> - Chat
              </p>
            </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
