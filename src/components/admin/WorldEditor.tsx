'use client';

import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Stats } from '@react-three/drei';
import { Group } from 'three';
import { worldManagerClient, type WorldData, type WorldObject } from '@/core/worlds-client';

interface WorldEditorProps {
  worldId?: string;
  onSave?: (world: WorldData) => void;
  onClose?: () => void;
}

export default function WorldEditor({ worldId, onSave, onClose }: WorldEditorProps) {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [selectedObject, setSelectedObject] = useState<WorldObject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Load world on mount
  const loadWorld = useCallback(async () => {
    if (!worldId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await worldManagerClient.loadWorld(worldId);
      if (result.success && result.world) {
        setWorld(result.world);
      } else {
        setError(result.error || 'Failed to load world');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [worldId]);

  // Save world
  const saveWorld = useCallback(async () => {
    if (!world) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await worldManagerClient.saveWorld(world);
      if (result.success) {
        setIsDirty(false);
        onSave?.(world);
      } else {
        setError(result.error || 'Failed to save world');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [world, onSave]);

  // Add object to world (for future use)
  // const addObject = useCallback((object: WorldObject) => {
  //   if (!world) return;
  //   
  //   const newWorld = {
  //     ...world,
  //     objects: [...world.objects, object],
  //   };
  //   
  //   setWorld(newWorld);
  //   setIsDirty(true);
  // }, [world]);

  // Remove object from world (for future use)
  // const removeObject = useCallback((objectId: string) => {
  //   if (!world) return;
  //   
  //   const newWorld = {
  //     ...world,
  //     objects: world.objects.filter(obj => obj.id !== objectId),
  //   };
  //   
  //   setWorld(newWorld);
  //   setIsDirty(true);
  // }, [world]);

  // Update object
  const updateObject = useCallback((objectId: string, updates: Partial<WorldObject>) => {
    if (!world) return;
    
    const newWorld = {
      ...world,
      objects: world.objects.map(obj => 
        obj.id === objectId ? { ...obj, ...updates } : obj
      ),
    };
    
    setWorld(newWorld);
    setIsDirty(true);
  }, [world]);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">World Editor</h2>
          <p className="text-sm text-gray-400">
            {world ? world.name : 'No world loaded'}
          </p>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-700 space-y-2">
          <button
            onClick={loadWorld}
            disabled={isLoading || !worldId}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load World'}
          </button>
          
          <button
            onClick={saveWorld}
            disabled={isLoading || !world || !isDirty}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save World'}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>

        {/* Objects List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Objects</h3>
          {world ? (
            <div className="space-y-2">
              {world.objects.map((obj: WorldObject) => (
                <div
                  key={obj.id}
                  className={`p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 ${
                    selectedObject?.id === obj.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedObject(obj)}
                >
                  <div className="text-white font-medium">{obj.id}</div>
                  <div className="text-sm text-gray-400">{obj.type}</div>
                  <div className="text-xs text-gray-500">
                    {obj.position.x.toFixed(1)}, {obj.position.y.toFixed(1)}, {obj.position.z.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No world loaded</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-900 border-t border-red-700">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative">
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
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={0.8}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            
            {/* Environment */}
            <Environment preset="sunset" />
            
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
            
            {/* World Objects */}
            {world && (
              <WorldObjects
                objects={world.objects}
                selectedObject={selectedObject}
                onObjectSelect={setSelectedObject}
                onObjectUpdate={updateObject}
              />
            )}
            
            {/* Camera Controls */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={5}
              maxDistance={100}
            />
            
            {/* Stats */}
            <Stats />
          </Suspense>
        </Canvas>
        
        {/* Viewport Info */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-sm">
          <div>Objects: {world?.objects.length || 0}</div>
          <div>Selected: {selectedObject?.id || 'None'}</div>
          {isDirty && <div className="text-yellow-400">Unsaved changes</div>}
        </div>
      </div>
    </div>
  );
}

// Component for rendering world objects
function WorldObjects({
  objects,
  selectedObject,
  onObjectSelect,
  onObjectUpdate,
}: {
  objects: WorldObject[];
  selectedObject: WorldObject | null;
  onObjectSelect: (obj: WorldObject) => void;
  onObjectUpdate: (objectId: string, updates: Partial<WorldObject>) => void;
}) {
  return (
    <>
      {objects.map((obj: WorldObject) => (
        <WorldObjectMesh
          key={obj.id}
          object={obj}
          isSelected={selectedObject?.id === obj.id}
          onSelect={() => onObjectSelect(obj)}
          onUpdate={(updates) => onObjectUpdate(obj.id, updates)}
        />
      ))}
    </>
  );
}

// Individual object mesh component
function WorldObjectMesh({
  object,
  isSelected,
  onSelect,
}: {
  object: WorldObject;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<WorldObject>) => void;
}) {
  const meshRef = useRef<Group>(null);
  const [model, setModel] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the actual GLB model
  useEffect(() => {
    const loadModel = async () => {
      if (!object.model) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Import GLTFLoader dynamically
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        
        const gltf = await loader.loadAsync(object.model);
        setModel(gltf.scene);
      } catch (err) {
        console.error('Error loading model:', err);
        setError(err instanceof Error ? err.message : 'Failed to load model');
      } finally {
        setLoading(false);
      }
    };

    loadModel();
  }, [object.model]);

  return (
    <group
      ref={meshRef}
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
      scale={[object.scale.x, object.scale.y, object.scale.z]}
      onClick={onSelect}
    >
      {loading && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffa500" transparent opacity={0.5} />
        </mesh>
      )}
      
      {error && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
        </mesh>
      )}
      
      {model && !loading && !error && (
        <primitive object={model.clone()} castShadow receiveShadow />
      )}
      
      {/* Selection indicator */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial
            color="#4ade80"
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}
