'use client';

import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stats } from '@react-three/drei';
import { useControls, button, Leva } from 'leva';
import { Group } from 'three';
import { worldManagerClient, type WorldData, type WorldObject } from '@/core/worlds-client';

// Patch type to allow partial nested transforms without overwriting other axes
type Vec3Patch = Partial<{ x: number; y: number; z: number }>;
type WorldObjectPatch = Partial<Omit<WorldObject, 'position' | 'rotation' | 'scale'>> & {
  position?: Vec3Patch;
  rotation?: Vec3Patch;
  scale?: Vec3Patch;
};

interface AdvancedWorldEditorProps {
  worldId?: string;
  onSave?: (world: WorldData) => void;
  onClose?: () => void;
}

interface AssetItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  isTemporary: boolean;
}

export default function AdvancedWorldEditor({ worldId, onSave, onClose }: AdvancedWorldEditorProps) {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [selectedObject, setSelectedObject] = useState<WorldObject | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showAssetPanel, setShowAssetPanel] = useState(true);
  const [history, setHistory] = useState<WorldData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copiedObject, setCopiedObject] = useState<WorldObject | null>(null);

  // Load world on mount
  const loadWorld = useCallback(async () => {
    if (!worldId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await worldManagerClient.loadWorld(worldId);
      if (result.success && result.world) {
        setWorld(result.world);
        // Add to history
        setHistory([result.world]);
        setHistoryIndex(0);
      } else {
        setError(result.error || 'Failed to load world');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [worldId]);

  // Load assets
  const loadAssets = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/assets');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAssets(data.assets || []);
      } else {
        console.error('Failed to load assets:', data.error);
      }
    } catch (err) {
      console.error('Error loading assets:', err);
    }
  }, []);

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

  // Update object (deep-merge and based on latest state)
  const updateObject = useCallback((objectId: string, updates: WorldObjectPatch) => {
    let computedWorld: WorldData | null = null;
    setWorld(prevWorld => {
      if (!prevWorld) return prevWorld;

      const updatedObjects = prevWorld.objects.map((obj) => {
        if (obj.id !== objectId) return obj;

        // Deep-merge nested transforms to avoid overwriting other axes
        const nextObj: WorldObject = {
          ...obj,
          position: updates.position ? { ...obj.position, ...updates.position } : obj.position,
          rotation: updates.rotation ? { ...obj.rotation, ...updates.rotation } : obj.rotation,
          scale: updates.scale ? { ...obj.scale, ...updates.scale } : obj.scale,
        } as WorldObject;

        // Apply any other (non-transform) fields from updates without overwriting transforms
        const otherUpdates: Partial<WorldObject> = {};
        Object.keys(updates).forEach((key) => {
          if (key !== 'position' && key !== 'rotation' && key !== 'scale') {
            (otherUpdates as Record<string, unknown>)[key] = (updates as Record<string, unknown>)[key];
          }
        });
        Object.assign(nextObj, otherUpdates);

        return nextObj;
      });

      computedWorld = { ...prevWorld, objects: updatedObjects };
      return computedWorld;
    });

    setIsDirty(true);

    if (computedWorld) {
      // Keep selection in sync if we're editing the selected object
      if (selectedObject && selectedObject.id === objectId) {
        const updated = (computedWorld as WorldData).objects.find((o: WorldObject) => o.id === objectId) || null;
        if (updated) setSelectedObject(updated);
      }

      // Add to history
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(computedWorld as WorldData);
        return newHistory.slice(-50);
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    }
  }, [historyIndex, selectedObject]);

  // Add object to world
  const addObject = useCallback((asset: AssetItem) => {
    if (!world) return;
    
    const newObject: WorldObject = {
      id: `${asset.name}-${Date.now()}`,
      type: 'decoration',
      model: asset.url,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      hasCollision: true,
      metadata: { description: `Added from ${asset.name}` }
    };
    
    const newWorld = {
      ...world,
      objects: [...world.objects, newObject],
    };
    
    setWorld(newWorld);
    setIsDirty(true);
    
    // Add to history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newWorld);
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [world, historyIndex]);

  // Remove object from world
  const removeObject = useCallback((objectId: string) => {
    if (!world) return;
    
    const newWorld = {
      ...world,
      objects: world.objects.filter(obj => obj.id !== objectId),
    };
    
    setWorld(newWorld);
    setIsDirty(true);
    
    // Add to history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newWorld);
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [world, historyIndex]);

  // Copy object
  const copyObject = useCallback(() => {
    if (selectedObject) {
      setCopiedObject(selectedObject);
      console.log('Object copied:', selectedObject.id);
    }
  }, [selectedObject]);

  // Paste object
  const pasteObject = useCallback(() => {
    if (copiedObject && world) {
      const newObject: WorldObject = {
        ...copiedObject,
        id: `${copiedObject.id}-copy-${Date.now()}`,
        position: {
          x: copiedObject.position.x + 2,
          y: copiedObject.position.y,
          z: copiedObject.position.z + 2,
        }
      };
      
      const newWorld = {
        ...world,
        objects: [...world.objects, newObject],
      };
      
      setWorld(newWorld);
      setIsDirty(true);
      
      // Add to history
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newWorld);
        return newHistory.slice(-50);
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    }
  }, [copiedObject, world, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setWorld(history[newIndex]);
      setHistoryIndex(newIndex);
      setIsDirty(true);
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            copyObject();
            break;
          case 'v':
            e.preventDefault();
            pasteObject();
            break;
          case 'z':
            e.preventDefault();
            undo();
            break;
        }
      }
      
      // Delete key
      if (e.key === 'Delete' && selectedObject) {
        removeObject(selectedObject.id);
        setSelectedObject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copyObject, pasteObject, undo, selectedObject, removeObject]);

  // Load data on mount
  useEffect(() => {
    loadWorld();
    loadAssets();
  }, [loadWorld, loadAssets]);


  return (
    <div className="h-screen bg-gray-900 flex">
      {/* Leva panel reset when selected object changes (no fill to avoid covering UI) */}
      <Leva key={`leva-${selectedObject?.id || 'root'}`} collapsed={false} hideCopyButton />
      {/* Object Controls - Remount only when changing selected object */}
      <ObjectControls
        key={`controls-${selectedObject?.id || 'root'}`}
        selectedObject={selectedObject}
        updateObject={updateObject}
        loadWorld={loadWorld}
        saveWorld={saveWorld}
        onClose={onClose}
        showAssetPanel={showAssetPanel}
        setShowAssetPanel={setShowAssetPanel}
        copyObject={copyObject}
        pasteObject={pasteObject}
        undo={undo}
        removeObject={removeObject}
        setSelectedObject={setSelectedObject}
      />
      
      {/* Asset Panel Sidebar */}
      {showAssetPanel && (
        <div className="w-80 min-w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Assets</h3>
            <p className="text-sm text-gray-400">Drag & drop to add to world</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {assets.map((asset) => (
                <AssetPreviewCard
                  key={asset.id}
                  asset={asset}
                  onAdd={() => addObject(asset)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
          onDrop={(e) => {
            e.preventDefault();
            try {
              const assetData = e.dataTransfer.getData('application/json');
              const asset = JSON.parse(assetData);
              addObject(asset);
            } catch (err) {
              console.error('Error dropping asset:', err);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
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
              />
            )}
            
            {/* Camera Controls */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={500}
              panSpeed={1.2}
              zoomSpeed={1.2}
              rotateSpeed={1.0}
              makeDefault
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
          {error && <div className="text-red-400">{error}</div>}
          <div className="text-xs text-gray-400 mt-1">
            Ctrl+C: Copy | Ctrl+V: Paste | Ctrl+Z: Undo | Del: Delete
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate component for object controls that resets when selectedObject changes
function ObjectControls({
  selectedObject,
  updateObject,
  loadWorld,
  saveWorld,
  onClose,
  showAssetPanel,
  setShowAssetPanel,
  copyObject,
  pasteObject,
  undo,
  removeObject,
  setSelectedObject,
  // store removed
}: {
  selectedObject: WorldObject | null;
  updateObject: (objectId: string, updates: WorldObjectPatch) => void;
  loadWorld: () => void;
  saveWorld: () => void;
  onClose?: () => void;
  showAssetPanel: boolean;
  setShowAssetPanel: (show: boolean) => void;
  copyObject: () => void;
  pasteObject: () => void;
  undo: () => void;
  removeObject: (objectId: string) => void;
  setSelectedObject: (obj: WorldObject | null) => void;
  // store?: unknown;
}) {
  // This component will re-mount when selectedObject changes, resetting Leva controls
  const isInitializingRef = useRef(true);

  useEffect(() => {
    // Skip first render to avoid applying stale values to a newly selected object
    const id = setTimeout(() => {
      isInitializingRef.current = false;
    }, 0);
    return () => {
      clearTimeout(id);
      isInitializingRef.current = true;
    };
  }, []);

  useControls('Selected Object', {
    // Only show controls if an object is selected
    'No Object Selected': {
      value: selectedObject ? selectedObject.id : 'None',
      disabled: true
    },
    // Position controls
    'Position X': {
      value: selectedObject?.position.x || 0,
      min: -100,
      max: 100,
      step: 0.1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { position: { x: value, y: selectedObject.position.y, z: selectedObject.position.z } });
        }
      }
    },
    'Position Y': {
      value: selectedObject?.position.y || 0,
      min: -100,
      max: 100,
      step: 0.1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { position: { x: selectedObject.position.x, y: value, z: selectedObject.position.z } });
        }
      }
    },
    'Position Z': {
      value: selectedObject?.position.z || 0,
      min: -100,
      max: 100,
      step: 0.1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { position: { x: selectedObject.position.x, y: selectedObject.position.y, z: value } });
        }
      }
    },
    // Rotation controls
    'Rotation X': {
      value: selectedObject?.rotation.x || 0,
      min: -360,
      max: 360,
      step: 1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { rotation: { x: value, y: selectedObject.rotation.y, z: selectedObject.rotation.z } });
        }
      }
    },
    'Rotation Y': {
      value: selectedObject?.rotation.y || 0,
      min: -360,
      max: 360,
      step: 1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { rotation: { x: selectedObject.rotation.x, y: value, z: selectedObject.rotation.z } });
        }
      }
    },
    'Rotation Z': {
      value: selectedObject?.rotation.z || 0,
      min: -360,
      max: 360,
      step: 1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { rotation: { x: selectedObject.rotation.x, y: selectedObject.rotation.y, z: value } });
        }
      }
    },
    // Scale controls
    'Scale X': {
      value: selectedObject?.scale.x || 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { scale: { x: Math.max(0.1, value), y: selectedObject.scale.y, z: selectedObject.scale.z } });
        }
      }
    },
    'Scale Y': {
      value: selectedObject?.scale.y || 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { scale: { x: selectedObject.scale.x, y: Math.max(0.1, value), z: selectedObject.scale.z } });
        }
      }
    },
    'Scale Z': {
      value: selectedObject?.scale.z || 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      onChange: (value) => {
        if (isInitializingRef.current) return;
        if (selectedObject && typeof value === 'number' && !isNaN(value)) {
          updateObject(selectedObject.id, { scale: { x: selectedObject.scale.x, y: selectedObject.scale.y, z: Math.max(0.1, value) } });
        }
      }
    },
    // Actions
    'Load World': button(() => loadWorld()),
    'Save World': button(() => saveWorld()),
    'Close Editor': button(() => onClose?.()),
    'Toggle Asset Panel': button(() => {
      setShowAssetPanel(!showAssetPanel);
      console.log('Asset panel toggled:', !showAssetPanel);
    }),
    'Copy (Ctrl+C)': button(() => copyObject()),
    'Paste (Ctrl+V)': button(() => pasteObject()),
    'Undo (Ctrl+Z)': button(() => undo()),
    'Delete Selected': button(() => {
      if (selectedObject) {
        removeObject(selectedObject.id);
        setSelectedObject(null);
      }
    })
  });

  return null; // This component only renders controls
}

// Component for rendering world objects
function WorldObjects({
  objects,
  selectedObject,
  onObjectSelect,
}: {
  objects: WorldObject[];
  selectedObject: WorldObject | null;
  onObjectSelect: (obj: WorldObject) => void;
}) {
  return (
    <>
      {objects.map((obj: WorldObject) => (
        <WorldObjectMesh
          key={obj.id}
          object={obj}
          isSelected={selectedObject?.id === obj.id}
          onSelect={() => onObjectSelect(obj)}
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
        
        console.log('Loading model from URL:', object.model);
        
        // First, test if the URL is accessible
        try {
          const response = await fetch(object.model, { method: 'HEAD' });
          console.log('URL accessibility test:', response.status, response.statusText);
          if (!response.ok) {
            throw new Error(`URL not accessible: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          console.error('URL accessibility test failed:', fetchError);
          throw new Error(`Cannot access model URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        }
        
        // Import GLTFLoader dynamically
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        
        // Add error handling for the loader
        loader.setRequestHeader = (header) => {
          console.log('Setting request header:', header);
          return loader;
        };
        
        // Try to load the model with proper error handling
        const gltf = await loader.loadAsync(object.model);
        console.log('Model loaded successfully:', gltf);
        setModel(gltf.scene);
      } catch (err) {
        console.error('Error loading model:', err);
        console.error('Model URL was:', object.model);
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
      onClick={(e) => {
        e.stopPropagation();
        console.log('Object clicked:', object.id);
        onSelect();
      }}
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

// Asset Preview Card Component
function AssetPreviewCard({ 
  asset, 
  onAdd 
}: { 
  asset: AssetItem; 
  onAdd: () => void; 
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 border border-gray-600 hover:border-blue-500 transition-all duration-200 overflow-hidden"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/json', JSON.stringify(asset));
      }}
      onClick={onAdd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Preview */}
      <div className="h-32 bg-gray-800 relative">
        <Canvas
          camera={{
            position: [2, 2, 2],
            fov: 50,
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#4a5568" />
            </mesh>
          }>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <AssetPreviewModel url={asset.url} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate={isHovered}
              autoRotateSpeed={2}
              enableRotate={false}
            />
          </Suspense>
        </Canvas>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
            <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
              Click to Add
            </div>
          </div>
        </div>
      </div>
      
      {/* Asset Info */}
      <div className="p-3">
        <div className="text-white font-medium truncate">{asset.name}</div>
        <div className="text-sm text-gray-400">{asset.type.toUpperCase()}</div>
        <div className="text-xs text-gray-500">
          {(asset.size / 1024).toFixed(1)} KB
        </div>
      </div>
    </div>
  );
}

// Asset Preview Model Component
function AssetPreviewModel({ url }: { url: string }) {
  const [model, setModel] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading preview model from URL:', url);
        
        // Test URL accessibility first
        try {
          const response = await fetch(url, { method: 'HEAD' });
          console.log('Preview URL accessibility test:', response.status, response.statusText);
          if (!response.ok) {
            throw new Error(`URL not accessible: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          console.error('Preview URL accessibility test failed:', fetchError);
          throw new Error(`Cannot access preview URL: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        }
        
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();
        
        const gltf = await loader.loadAsync(url);
        console.log('Preview model loaded successfully:', gltf);
        setModel(gltf.scene);
      } catch (err) {
        console.error('Error loading preview model:', err);
        console.error('Preview model URL was:', url);
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    loadModel();
  }, [url]);

  if (loading) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0.7} />
      </mesh>
    );
  }

  if (error) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
      </mesh>
    );
  }

  if (model) {
    return <primitive object={model.clone()} />;
  }

  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#4a5568" transparent opacity={0.7} />
    </mesh>
  );
}
