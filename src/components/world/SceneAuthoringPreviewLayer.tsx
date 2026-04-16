"use client";

import { entityHasResourceNodeComponent } from "@nexusworld3d/content-schema";
import { useMemo } from "react";
import * as THREE from "three";
import { useSceneAuthoringStore } from "@/store/sceneAuthoringStore";

/**
 * ES: Preview 3D de la escena v0.1 aplicada en Colyseus (`world:scene-applied-document-v0_1`).
 * EN: 3D preview of v0.1 scene applied on the server (broadcast).
 */
export default function SceneAuthoringPreviewLayer() {
  const document = useSceneAuthoringStore((s) => s.document);

  const items = useMemo(() => {
    if (!document?.entities?.length) return [];
    return document.entities
      .filter((ent) => !entityHasResourceNodeComponent(ent))
      .map((ent) => {
        const [x, y, z] = ent.transform.position;
        const q = new THREE.Quaternion(...ent.transform.rotation);
        const [sx, sy, sz] = ent.transform.scale;
        return { id: ent.id, x, y, z, q, sx, sy, sz };
      });
  }, [document]);

  if (items.length === 0) return null;

  return (
    <group name="scene-authoring-preview">
      {items.map((it) => (
        <mesh
          key={it.id}
          position={[it.x, it.y, it.z]}
          quaternion={it.q}
          scale={[it.sx, it.sy, it.sz]}
          userData={{ sceneAuthoringEntityId: it.id }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#a78bfa"
            metalness={0.15}
            roughness={0.55}
            transparent
            opacity={0.82}
            wireframe={false}
          />
        </mesh>
      ))}
    </group>
  );
}
