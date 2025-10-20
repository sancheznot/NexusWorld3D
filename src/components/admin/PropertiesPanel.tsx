'use client';

import { useState, useCallback } from 'react';
import { type WorldObject } from '@/core/worlds';

interface PropertiesPanelProps {
  selectedObject: WorldObject | null;
  onObjectUpdate: (objectId: string, updates: Partial<WorldObject>) => void;
}

export default function PropertiesPanel({ selectedObject, onObjectUpdate }: PropertiesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle position change
  const handlePositionChange = useCallback((axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject) return;
    
    onObjectUpdate(selectedObject.id, {
      position: {
        ...selectedObject.position,
        [axis]: value,
      },
    });
  }, [selectedObject, onObjectUpdate]);

  // Handle rotation change
  const handleRotationChange = useCallback((axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject) return;
    
    onObjectUpdate(selectedObject.id, {
      rotation: {
        ...selectedObject.rotation,
        [axis]: value,
      },
    });
  }, [selectedObject, onObjectUpdate]);

  // Handle scale change
  const handleScaleChange = useCallback((axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject) return;
    
    onObjectUpdate(selectedObject.id, {
      scale: {
        ...selectedObject.scale,
        [axis]: value,
      },
    });
  }, [selectedObject, onObjectUpdate]);

  // Handle other property changes
  const handlePropertyChange = useCallback((property: keyof WorldObject, value: unknown) => {
    if (!selectedObject) return;
    
    onObjectUpdate(selectedObject.id, {
      [property]: value,
    });
  }, [selectedObject, onObjectUpdate]);

  if (!selectedObject) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">🎯</div>
            <div>No object selected</div>
            <div className="text-sm">Select an object to edit its properties</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Properties</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        <div className="text-sm text-gray-400 mt-1">{selectedObject.id}</div>
      </div>

      {/* Properties */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Basic Info */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">Basic Info</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">ID</label>
                <input
                  type="text"
                  value={selectedObject.id}
                  onChange={(e) => handlePropertyChange('id', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">Type</label>
                <select
                  value={selectedObject.type}
                  onChange={(e) => handlePropertyChange('type', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="terrain">Terrain</option>
                  <option value="building">Building</option>
                  <option value="decoration">Decoration</option>
                  <option value="interactive">Interactive</option>
                  <option value="character">Character</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-300 mb-1">Model URL</label>
                <input
                  type="text"
                  value={selectedObject.model}
                  onChange={(e) => handlePropertyChange('model', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Position */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">Position</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">X</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedObject.position.x}
                  onChange={(e) => handlePositionChange('x', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Y</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedObject.position.y}
                  onChange={(e) => handlePositionChange('y', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Z</label>
                <input
                  type="number"
                  step="0.1"
                  value={selectedObject.position.z}
                  onChange={(e) => handlePositionChange('z', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">Rotation (degrees)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">X</label>
                <input
                  type="number"
                  step="1"
                  value={selectedObject.rotation.x}
                  onChange={(e) => handleRotationChange('x', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Y</label>
                <input
                  type="number"
                  step="1"
                  value={selectedObject.rotation.y}
                  onChange={(e) => handleRotationChange('y', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Z</label>
                <input
                  type="number"
                  step="1"
                  value={selectedObject.rotation.z}
                  onChange={(e) => handleRotationChange('z', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Scale */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">Scale</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">X</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={selectedObject.scale.x}
                  onChange={(e) => handleScaleChange('x', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Y</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={selectedObject.scale.y}
                  onChange={(e) => handleScaleChange('y', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Z</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={selectedObject.scale.z}
                  onChange={(e) => handleScaleChange('z', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Physics */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">Physics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300">Has Collision</label>
                <input
                  type="checkbox"
                  checked={selectedObject.hasCollision}
                  onChange={(e) => handlePropertyChange('hasCollision', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h4 className="text-md font-medium text-white mb-3">Metadata</h4>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                value={(selectedObject.metadata?.description as string) || ''}
                onChange={(e) => handlePropertyChange('metadata', {
                  ...selectedObject.metadata,
                  description: e.target.value,
                })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter description..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
