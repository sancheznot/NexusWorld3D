"use client";

import React, { useEffect, useState } from 'react';
import { LoadingManager, Quaternion, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Html } from '@react-three/drei';
import { getSceneModelProps, type SceneEntityV0_1 } from '@nexusworld3d/content-schema';
import { resolveSceneModelAsset } from '@/lib/assets/sceneModelAssets';
import { trackSceneModelLoad } from '@/lib/three/disposeSceneModel';

function LoadedModel({ assetId }: { assetId: string }) {
  const asset = resolveSceneModelAsset(assetId);
  const [model, setModel] = useState<Group | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!asset) return;
    const manager = new LoadingManager();
    manager.setURLModifier(url => {
      if (/^data:(application\/octet-stream|application\/gltf-buffer|image\/(png|jpeg|webp));base64,/.test(url)) return url;
      const resolved = new URL(url, window.location.href);
      // GLB embedded images are converted to same-origin object URLs by GLTFLoader.
      if (resolved.protocol === 'blob:' && resolved.origin === window.location.origin) return url;
      if (resolved.origin !== window.location.origin || !resolved.pathname.startsWith('/scene-assets/')) throw new Error('Model dependency outside approved assets');
      return resolved.href;
    });
    const loader = new GLTFLoader(manager);
    return trackSceneModelLoad(loader.loadAsync(asset.url), gltf => setModel(gltf.scene), () => setFailed(true));
  }, [asset]);
  if (model) return <primitive object={model} dispose={null} />;
  return <group>
    <mesh><boxGeometry /><meshBasicMaterial color={failed || !asset ? '#ef4444' : '#fbbf24'} wireframe /></mesh>
    <Html center><span className="whitespace-nowrap rounded bg-slate-950/90 px-2 py-1 text-xs text-white">{failed || !asset ? `Modelo no disponible: ${assetId}` : 'Cargando modelo…'}</span></Html>
  </group>;
}

/** Shared by editor, local Play and public runtime. Root models only. */
export default function SceneModelVisual({ entity, showColliders = false, onSelect }: {
  entity: SceneEntityV0_1; showColliders?: boolean; onSelect?: (id: string) => void;
}) {
  const props = getSceneModelProps(entity);
  if (!props) return null;
  return <group position={entity.transform.position} quaternion={new Quaternion(...entity.transform.rotation).normalize()}
    scale={entity.transform.scale} onClick={onSelect ? event => { event.stopPropagation(); onSelect(entity.id); } : undefined}>
    <LoadedModel key={props.assetId} assetId={props.assetId} />
    {showColliders ? props.colliders.map((collider, index) => <mesh key={index} position={collider.offset}>
      <boxGeometry args={collider.size} /><meshBasicMaterial color="#22d3ee" wireframe depthTest={false} />
    </mesh>) : null}
  </group>;
}
