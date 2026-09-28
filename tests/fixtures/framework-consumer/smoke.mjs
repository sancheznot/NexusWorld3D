import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { PROTOCOL_VERSION, WorldMessages } from '@nexusworld3d/protocol';
import { withWorldProtocolJoinOptions, sendGenericWorldTool } from '@nexusworld3d/engine-client';
import { parseSceneDocumentV0_1, resolveSceneWorldEntities } from '@nexusworld3d/content-schema';
import { createInMemoryPlayerStore, attachNexusRoomPlugins } from '@nexusworld3d/engine-server';
import { registerResourceNode, getRegisteredResourceNodeById } from '@nexusworld3d/engine-server/resource-node-registry';
import { registerItemEffect } from '@nexusworld3d/engine-server/item-effect-registry';
import { registerWorldTool } from '@nexusworld3d/engine-server/world-tool-registry';

const require = createRequire(import.meta.url);
for (const name of ['protocol', 'content-schema', 'engine-client', 'engine-server']) {
  const resolved = realpathSync(require.resolve(`@nexusworld3d/${name}`));
  assert.ok(resolved.startsWith(`${process.cwd()}/node_modules/`), `Package escaped consumer: ${resolved}`);
  assert.ok(resolved.endsWith('.js'));
  assert.ok(Object.keys(require(`@nexusworld3d/${name}`)).length > 0, 'CommonJS import works too');
}
assert.equal(withWorldProtocolJoinOptions({ worldId: 'example' }).protocolVersion, PROTOCOL_VERSION);
sendGenericWorldTool((event, data) => {
  assert.equal(event, WorldMessages.GenericTool);
  assert.deepEqual(data, { toolId: 'example:tool' });
}, 'example:tool');
const scene = parseSceneDocumentV0_1({ schemaVersion: 1, worldId: 'example', entities: [] });
assert.deepEqual(resolveSceneWorldEntities(scene.entities), []);
assert.throws(() => parseSceneDocumentV0_1({ schemaVersion: -1 }));
const store = createInMemoryPlayerStore();
await store.saveSnapshot('example:player', { position: [0, 2, 6] });
assert.deepEqual(await store.loadSnapshot('example:player'), { position: [0, 2, 6] });
let attached = false;
attachNexusRoomPlugins({}, [{ id: 'example:plugin', attach() { attached = true; } }]);
assert.ok(attached);
registerResourceNode({ id: 'example:node', mapId: 'exterior', position: { x: 0, y: 0, z: 0 }, radius: 2, grants: [] });
assert.equal(getRegisteredResourceNodeById('example:node')?.radius, 2);
assert.equal(typeof registerItemEffect, 'function');
assert.equal(typeof registerWorldTool, 'function');
console.log('External consumer: ESM + CommonJS, protocol, schema, persistence and extension exports OK');
