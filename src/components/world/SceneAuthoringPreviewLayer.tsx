"use client";

import { getSceneBoxProps, getSceneModelProps, resolveSceneWorldEntities } from "@nexusworld3d/content-schema";
import SceneEntityVisual from './SceneEntityVisual';
import React, { useEffect, useMemo } from "react";
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
  const entities = useMemo(() => document ? resolveSceneWorldEntities(document.entities) : [], [document]);
  useEffect(() => {
    if (!document || !physics.current) return;
    return mountSceneBoxColliders(physics.current, document, mapId);
  }, [document, mapId, physics]);

  return (
    <group name="scene-authoring-preview">
      {entities.filter(entity => (getSceneBoxProps(entity)?.mapId ?? getSceneModelProps(entity)?.mapId) === mapId)
        .map(entity => <SceneEntityVisual key={entity.id} entity={entity} />)}
    </group>
  );
}
