"use client";
import React, { useMemo } from 'react';
import { getSceneInteraction, resolveSceneWorldEntities, nearestSceneInteraction } from '@nexusworld3d/content-schema';
import { usePlayerStore } from '@/store/playerStore';
import { useSceneAuthoringStore } from '@/store/sceneAuthoringStore';
import { useUIStore } from '@/store/uiStore';
import { colyseusClient } from '@/lib/colyseus/client';
import TriggerZone from './TriggerZone';
import { SceneInteractionMarker } from './SceneInteractionVisual';
export default function SceneInteractionLayer({ mapId }: { mapId: string }) {
  const doc = useSceneAuthoringStore(state => state.document);
  const entities = useMemo(() => doc ? resolveSceneWorldEntities(doc.entities) : [], [doc]);
  return <group>{entities.map(entity => {
    const zone = getSceneInteraction(entity);
    if (!zone || zone.resourceId || zone.mapId !== mapId) return null;
    const [x, y, z] = zone.position;
    return <TriggerZone key={entity.id} data={{ id: entity.id, kind: 'resource_node', name: zone.label, position: { x, y, z }, radius: zone.radius }}
      onInteract={() => {
        const position = usePlayerStore.getState().position;
        if (!position || nearestSceneInteraction(entities, mapId, position)?.id !== entity.id) return;
        if (zone.portal) colyseusClient.getSocket()?.send('map:change', { sceneEntityId: entity.id });
        else useUIStore.getState().addNotification({ id: `scene-zone-${entity.id}`, type: 'info', title: 'Zona de escena', message: zone.label, timestamp: new Date(), duration: 3000 });
      }}>
      <group quaternion={entity.transform.rotation} scale={entity.transform.scale}><SceneInteractionMarker portal={!!zone.portal} /></group>
    </TriggerZone>;
  })}</group>;
}
