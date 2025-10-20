'use client';

import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Stats } from '@react-three/drei';
import { useControls, button } from 'leva';
import { Group } from 'three';
import { worldManagerClient, type WorldData, type WorldObject } from '@/core/worlds-client';

interface SimpleWorldEditorProps {
  worldId?: string;
  onSave?: (world: WorldData) => void;
  onClose?: () => void;
}

export default function SimpleWorldEditor({ worldId, onSave, onClose }: SimpleWorldEditorProps) {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [selectedObject, setSelectedObject] = useState<WorldObject | null>(null);
  const [, setIsLoading] = useState(false);
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

  // Leva controls for selected object
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
        if (selectedObject) {
          updateObject(selectedObject.id, {
            position: { ...selectedObject.position, x: value }
          });
        }
      }
    },
    'Position Y': {
      value: selectedObject?.position.y || 0,
      min: -100,
      max: 100,
      step: 0.1,
      onChange: (value) => {
        if (selectedObject) {
          updateObject(selectedObject.id, {
            position: { ...selectedObject.position, y: value }
          });
        }
      }
    },
    'Position Z': {
      value: selectedObject?.position.z || 0,
      min: -100,
      max: 100,
      step: 0.1,
      onChange: (value) => {
        if (selectedObject) {
          updateObject(selectedObject.id, {
            position: { ...selectedObject.position, z: value }
          });
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
        if (selectedObject) {
          updateObject(selectedObject.id, {
            rotation: { ...selectedObject.rotation, x: value }
          });
        }
      }
    },
    'Rotation Y': {
      value: selectedObject?.rotation.y || 0,
      min: -360,
      max: 360,
      step: 1,
      onChange: (value) => {
        if (selectedObject) {
          updateObject(selectedObject.id, {
            rotation: { ...selectedObject.rotation, y: value }
          });
        }
      }
    },
    'Rotation Z': {
      value: selectedObject?.rotation.z || 0,
      min: -360,
      max: 360,
      step: 1,
      onChange: (value) => {
        if (selectedObject) {
          updateObject(selectedObject.id, {
            rotation: { ...selectedObject.rotation, z: value }
          });
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
        if (selectedObject) {
          updateObject(selectedObject.id, {
            scale: { ...selectedObject.scale, x: value }
          });
        }
      }
    },
    'Scale Y': {
      value: selectedObject?.scale.y || 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      onChange: (value) => {
        if (selectedObject) {
          updateObject(selectedObject.id, {
            scale: { ...selectedObject.scale, y: value }
          });
        }
      }
    },
    'Scale Z': {
      value: selectedObject?.scale.z || 1,
      min: 0.1,
      max: 10,
      step: 0.1,
      onChange: (value) => {
        if (selectedObject) {
          updateObject(selectedObject.id, {
            scale: { ...selectedObject.scale, z: value }
          });
        }
      }
    },
    // Actions
    'Load World': button(() => loadWorld()),
    'Save World': button(() => saveWorld()),
    'Close Editor': button(() => onClose?.())
  }, [selectedObject, updateObject, loadWorld, saveWorld, onClose]);

  return (
    <div className="h-screen bg-gray-900">
      {/* 3D Viewport */}
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
          
          {/* Transform Controls disabled for now - use Leva controls instead */}
          
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
      </div>
    </div>
  );
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
