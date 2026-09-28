"use client";
import React from 'react';
import { getSceneInteraction, type SceneEntityV0_1 } from '@nexusworld3d/content-schema';
export function SceneInteractionMarker({ portal, resource }: { portal?: boolean; resource?: boolean }) {
  return <mesh position={[0, 0.7, 0]}>
    {portal ? <torusGeometry args={[0.8, 0.12, 8, 24]} /> : resource ? <dodecahedronGeometry args={[0.55, 0]} /> : <octahedronGeometry args={[0.4]} />}
    <meshStandardMaterial color={portal ? '#22d3ee' : resource ? '#fbbf24' : '#a78bfa'} emissive={portal ? '#083344' : '#1e293b'} />
  </mesh>;
}
export default function SceneInteractionVisual({ entity, selected = false, onSelect }: { entity: SceneEntityV0_1; selected?: boolean; onSelect?: (id: string) => void }) {
  const zone = getSceneInteraction(entity);
  if (!zone) return null;
  return <group position={zone.position} onClick={onSelect ? event => { event.stopPropagation(); onSelect(entity.id); } : undefined}>
    <group quaternion={entity.transform.rotation} scale={entity.transform.scale}><SceneInteractionMarker portal={!!zone.portal} resource={!!zone.resourceId} /></group>
    {selected ? <mesh><sphereGeometry args={[zone.radius, 16, 12]} /><meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.5} /></mesh> : null}
  </group>;
}
