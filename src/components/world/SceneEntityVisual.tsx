"use client";
import React from 'react';
import { Quaternion } from 'three';
import { getSceneBoxProps, getSceneModelProps, getSceneInteraction, isSceneGroup, type SceneEntityV0_1 } from '@nexusworld3d/content-schema';
import SceneModelVisual from './SceneModelVisual';
import SceneInteractionVisual from './SceneInteractionVisual';

/** Shared visual interpreter. Receives world-space transforms, never local ones. */
export default function SceneEntityVisual({ entity, selected = false, onSelect, editor = false }: {
  entity: SceneEntityV0_1; selected?: boolean; onSelect?: (id: string) => void; editor?: boolean;
}) {
  if (getSceneModelProps(entity)) return <SceneModelVisual entity={entity} showColliders={selected} onSelect={onSelect} />;
  if (getSceneInteraction(entity)) return <SceneInteractionVisual entity={entity} selected={selected} onSelect={onSelect} />;
  const box = getSceneBoxProps(entity);
  if (!box && !editor) return null;
  return <mesh position={entity.transform.position} quaternion={new Quaternion(...entity.transform.rotation).normalize()} scale={entity.transform.scale}
    userData={{ sceneAuthoringEntityId: entity.id }} onClick={onSelect ? event => { event.stopPropagation(); onSelect(entity.id); } : undefined}>
    <boxGeometry args={box?.size ?? [1, 1, 1]} />
    <meshStandardMaterial color={selected ? '#22d3ee' : box?.color ?? '#475569'} wireframe={isSceneGroup(entity)} roughness={0.75} metalness={0.15} />
  </mesh>;
}
