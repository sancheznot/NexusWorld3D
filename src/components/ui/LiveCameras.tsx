'use client';

import { useEffect, useState } from 'react';
import { cameraSystem, type CameraSnapshot } from '@/lib/cameras/CameraSystem';

interface LiveCamerasProps {
  className?: string;
}

export default function LiveCameras({ className = '' }: LiveCamerasProps) {
  const [snapshots, setSnapshots] = useState<CameraSnapshot[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Actualizar snapshots cada segundo
    const interval = setInterval(() => {
      const allSnapshots = cameraSystem.getAllSnapshots();
      setSnapshots(allSnapshots);
      
      // Si no hay cámara seleccionada, seleccionar la primera
      if (!selectedCamera && allSnapshots.length > 0) {
        setSelectedCamera(allSnapshots[0].id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedCamera]);

  const selectedSnapshot = snapshots.find(s => s.id === selectedCamera);

  return (
    <div className={`${className}`}>
      {/* Vista principal de la cámara seleccionada */}
      {isExpanded && selectedSnapshot && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl">
            {/* Cerrar */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold"
            >
              ×
            </button>

            {/* Imagen de la cámara */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              {selectedSnapshot.imageData ? (
                <img
                  src={selectedSnapshot.imageData}
                  alt={selectedSnapshot.name}
                  className="w-full h-auto"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">📹</div>
                    <div>Cargando cámara...</div>
                  </div>
                </div>
              )}

              {/* Overlay con información */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4">
                <h3 className="text-white text-2xl font-bold">{selectedSnapshot.name}</h3>
                <p className="text-gray-300 text-sm">{selectedSnapshot.description}</p>
              </div>

              {/* Stats en vivo */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                <div className="flex items-center justify-between text-white text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>EN VIVO</span>
                    </div>
                    <div>👥 {selectedSnapshot.players} jugadores</div>
                    <div>⚡ {selectedSnapshot.fps} FPS</div>
                  </div>
                  <div className="text-gray-400">
                    {new Date(selectedSnapshot.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de cámaras en miniatura */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className={`relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-105 ${
              selectedCamera === snapshot.id ? 'ring-4 ring-blue-500' : ''
            }`}
            onClick={() => {
              setSelectedCamera(snapshot.id);
              setIsExpanded(true);
            }}
          >
            {/* Imagen de preview */}
            {snapshot.imageData ? (
              <img
                src={snapshot.imageData}
                alt={snapshot.name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center bg-gray-700">
                <div className="text-center text-white">
                  <div className="animate-spin text-3xl mb-2">📹</div>
                  <div className="text-sm">Cargando...</div>
                </div>
              </div>
            )}

            {/* Overlay con info */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-3">
              <h4 className="text-white font-bold text-sm">{snapshot.name}</h4>
              <p className="text-gray-300 text-xs">{snapshot.description}</p>
            </div>

            {/* Badge EN VIVO */}
            <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-1 rounded flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>

            {/* Stats */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
              <div className="flex items-center justify-between text-white text-xs">
                <div>👥 {snapshot.players}</div>
                <div>⚡ {snapshot.fps} FPS</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje si no hay cámaras */}
      {snapshots.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">📹</div>
          <div className="text-xl">No hay cámaras disponibles</div>
          <div className="text-sm mt-2">Las cámaras aparecerán cuando haya jugadores en línea</div>
        </div>
      )}
    </div>
  );
}

