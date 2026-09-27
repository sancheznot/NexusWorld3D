"use client";

import { entityHasResourceNodeComponent, getSceneBoxProps, getSceneModelProps } from "@nexusworld3d/content-schema";
import SceneModelVisual from './SceneModelVisual';
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useSceneAuthoringStore } from "@/store/sceneAuthoringStore";
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { mountSceneBoxColliders } from '@/lib/three/sceneBoxColliders';

/**
 * ES: Preview 3D de la escena v0.1 aplicada en Colyseus (`world:scene-applied-document-v0_1`).
 * EN: 3D preview of v0.1 scene applied on the server (broadcast).
 */
export default function SceneAuthoringPreviewLayer() {
  const document = useSceneAuthoringStore((s) => s.document);
  const mapId = useGameWorldStore(s => s.activeMapId);
  const physics = useCannonPhysics(true);
  useEffect(() => {
    if (!document || !physics.current) return;
    return mountSceneBoxColliders(physics.current, document, mapId);
  }, [document, mapId, physics]);

  const items = useMemo(() => {
    if (!document?.entities?.length) return [];
    return document.entities
      .filter((ent) => !getSceneModelProps(ent) && !entityHasResourceNodeComponent(ent) &&
        (!getSceneBoxProps(ent) || getSceneBoxProps(ent)!.mapId === mapId))
      .map((ent) => {
        const [x, y, z] = ent.transform.position;
        const q = new THREE.Quaternion(...ent.transform.rotation).normalize();
        const [sx, sy, sz] = ent.transform.scale;
        return { id: ent.id, x, y, z, q, sx, sy, sz, box: getSceneBoxProps(ent) };
      });
  }, [document, mapId]);

  return (
    <group name="scene-authoring-preview">
      {document?.entities.filter(entity => getSceneModelProps(entity)?.mapId === mapId).map(entity => <SceneModelVisual key={entity.id} entity={entity} />)}
      {items.map((it) => (
        <mesh
          key={it.id}
          position={[it.x, it.y, it.z]}
          quaternion={it.q}
          scale={[it.sx, it.sy, it.sz]}
          userData={{ sceneAuthoringEntityId: it.id }}
        >
          <boxGeometry args={it.box?.size ?? [1, 1, 1]} />
          <meshStandardMaterial
            color={it.box?.color ?? '#a78bfa'}
            metalness={0.15}
            roughness={0.55}
            transparent={!it.box}
            opacity={it.box ? 1 : 0.82}
            wireframe={false}
          />
        </mesh>
      ))}
    </group>
  );
}
