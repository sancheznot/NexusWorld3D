'use client';

import TriggerZone from '@/components/world/TriggerZone';
import {
  getWorldResourceNodesForMap,
  type WorldResourceNodeDef,
} from '@/constants/worldResourceNodes';
import { harvestWorldResourceNode } from '@/lib/world/worldResourceClient';
import type { TriggerZoneData } from '@/types/trigger.types';

function nodeToZone(node: WorldResourceNodeDef): TriggerZoneData {
  return {
    id: node.id,
    kind: 'resource_node',
    name: `${node.labelEs} / ${node.labelEn}`,
    position: node.position,
    radius: node.radius,
  };
}

function NodeVisuals({ node }: { node: WorldResourceNodeDef }) {
  if (node.visual === 'quarry') {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
          <boxGeometry args={[1.6, 0.5, 1.4]} />
          <meshStandardMaterial color="#57534e" roughness={0.95} metalness={0.05} />
        </mesh>
        <mesh castShadow position={[0.35, 0.65, 0.2]} rotation={[0.4, 0.6, 0.2]}>
          <dodecahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color="#78716c" roughness={0.9} metalness={0.08} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.2, 0]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[1.8, 0.35, 1.1]} />
        <meshStandardMaterial color="#5c4033" roughness={0.92} metalness={0} />
      </mesh>
      <mesh castShadow position={[-0.45, 0.55, 0.15]} rotation={[0.2, 0.5, 0.35]}>
        <cylinderGeometry args={[0.12, 0.16, 1.1, 6]} />
        <meshStandardMaterial color="#713f12" roughness={0.88} metalness={0} />
      </mesh>
    </group>
  );
}

/**
 * ES: Nodos de recurso Fase 6 — zona [E] + malla simple.
 * EN: Phase 6 resource nodes — [E] zone + simple mesh.
 */
export default function WorldResourceNodesLayer({ mapId }: { mapId: string }) {
  const nodes = getWorldResourceNodesForMap(mapId);
  if (nodes.length === 0) return null;

  return (
    <group name="world-resource-nodes">
      {nodes.map((node) => (
        <TriggerZone
          key={node.id}
          data={nodeToZone(node)}
          onInteract={() => {
            harvestWorldResourceNode(node.id);
          }}
          debug={false}
        >
          <NodeVisuals node={node} />
        </TriggerZone>
      ))}
    </group>
  );
}
