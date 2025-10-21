'use client';

import { useState, useEffect } from 'react';
import { Portal } from '@/types/portal.types';

interface PortalUIProps {
  portal: Portal | null;
  isVisible: boolean;
  onTeleport: (portal: Portal) => void;
  onClose: () => void;
}

export default function PortalUI({ portal, isVisible, onTeleport, onClose }: PortalUIProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible || !portal) return null;

  const handleTeleport = () => {
    setIsAnimating(true);
    onTeleport(portal);
    // Cerrar UI después de un breve delay
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
    }, 500);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Portal Card */}
      <div className={`relative bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4 transform transition-all duration-300 ${
        isAnimating ? 'scale-110' : 'scale-100'
      }`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* Portal Icon */}
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-2">
            {portal.icon || '🏨'}
          </div>
          <h3 className="text-xl font-bold text-white">{portal.name}</h3>
          <p className="text-gray-400 text-sm">{portal.description}</p>
        </div>

        {/* Portal Info */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Destino:</span>
            <span className="text-white">{portal.targetMap}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Estado:</span>
            <span className={`${portal.isActive ? 'text-green-400' : 'text-red-400'}`}>
              {portal.isActive ? 'Disponible' : 'No disponible'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleTeleport}
            disabled={!portal.isActive}
            className={`flex-1 px-4 py-2 rounded transition-all ${
              portal.isActive
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isAnimating ? 'Teleportando...' : 'Entrar'}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Presiona <kbd className="px-1 py-0.5 bg-gray-800 rounded">E</kbd> para interactuar
        </div>
      </div>
    </div>
  );
}
