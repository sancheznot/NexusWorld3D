'use client';

import { useState, useEffect } from 'react';
import { useAdminTeleport } from '@/hooks/useAdminTeleport';

export default function AdminTeleportUI() {
  const { isAdminMode, locations, teleportTo, showTeleportHelp } = useAdminTeleport();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isAdminMode) {
      setIsVisible(true);
    }
  }, [isAdminMode]);

  if (!isAdminMode || !isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg font-mono text-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-green-400 font-bold">🚀 ADMIN MODE</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-red-400 hover:text-red-300"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="text-yellow-400">Teletransportación Rápida:</div>
        <div>Ctrl + 1-6: Ubicaciones</div>
        <div>Ctrl + 0: Centro</div>
        <div>Ctrl + ↑↓←→: Direcciones</div>
        <div>Ctrl + H: Ayuda</div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="text-yellow-400 mb-1">Ubicaciones:</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {locations.slice(0, 6).map((location, index) => (
            <button
              key={location.name}
              onClick={() => teleportTo(location)}
              className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-left"
            >
              {index + 1}. {location.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-600">
        <button
          onClick={showTeleportHelp}
          className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs w-full"
        >
          Mostrar Ayuda Completa
        </button>
      </div>
    </div>
  );
}
