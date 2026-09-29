"use client";

import { getSceneBoxProps, getSceneModelProps } from "@nexusworld3d/content-schema";
import { createSceneRuntime } from '@nexusworld3d/engine-client';
import SceneEntityVisual from './SceneEntityVisual';
import React, { useEffect, useMemo } from "react";
import { useSceneAuthoringStore } from "@/store/sceneAuthoringStore";
import { useGameWorldStore } from '@/store/gameWorldStore';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { mountCannonSceneRuntime } from '@/lib/three/sceneBoxColliders';

/**
 * ES: Preview 3D de la escena v0.1 aplicada en Colyseus (`world:scene-applied-document-v0_1`).
 * EN: 3D preview of v0.1 scene applied on the server (broadcast).
 */
export default function SceneAuthoringPreviewLayer() {
  const document = useSceneAuthoringStore((s) => s.document);
  const mapId = useGameWorldStore(s => s.activeMapId);
  const physics = useCannonPhysics(true);
  const runtime = useMemo(() => document ? createSceneRuntime(document, mapId) : null, [document, mapId]);
  const entities = runtime?.entities ?? [];
  useEffect(() => {
    if (!runtime || !physics.current) return;
    return mountCannonSceneRuntime(physics.current, runtime);
  }, [runtime, physics]);

  return (
    <group name="scene-authoring-preview">
      {entities.filter(entity => (getSceneBoxProps(entity)?.mapId ?? getSceneModelProps(entity)?.mapId) === mapId)
        .map(entity => <SceneEntityVisual key={entity.id} entity={entity} />)}
    </group>
  );
}
