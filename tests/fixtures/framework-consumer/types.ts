import type { Room } from 'colyseus';
import { type NexusRoomPlugin, type PlayerStore, createInMemoryPlayerStore } from '@nexusworld3d/engine-server';
import { type SceneDocumentV0_1, parseSceneDocumentV0_1 } from '@nexusworld3d/content-schema';
import { withWorldProtocolJoinOptions, createSceneRuntime, type ScenePhysicsAdapter } from '@nexusworld3d/engine-client';
import type { ResourceNodeRegistration } from '@nexusworld3d/engine-server/resource-node-registry';

export const store: PlayerStore = createInMemoryPlayerStore();
export const scene: SceneDocumentV0_1 = parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'example', entities: [] });
export const plugin: NexusRoomPlugin = { id: 'example:plugin', attach(room: Room) { room.setMetadata({ worldId: scene.worldId }); } };
export const options = withWorldProtocolJoinOptions({ worldId: scene.worldId });
export const runtime = createSceneRuntime(scene, 'exterior');
export const adapter: ScenePhysicsAdapter = { addStaticBox(box) { const size: number = box.size[0]; return () => { void size; }; } };
export const node: ResourceNodeRegistration = { id: 'example:node', mapId: 'exterior', position: { x: 0, y: 0, z: 0 }, radius: 2, grants: [] };
// Declarations must retain actual contracts, not degrade to any.
// @ts-expect-error radius must be numeric
export const invalidNode: ResourceNodeRegistration = { ...node, radius: '2' };
