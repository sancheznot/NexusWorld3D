import { z } from 'zod';

export const MAX_SCENE_ASSET_BYTES = 16 * 1024 * 1024;
const index = z.number().int().nonnegative();
const vector = (length: number) => z.array(z.number().finite().min(-1e6).max(1e6)).length(length);
const gltfSchema = z.object({
  asset: z.object({ version: z.literal('2.0') }),
  scene: index.default(0),
  scenes: z.array(z.object({ nodes: z.array(index).max(512).default([]) })).min(1).max(8),
  nodes: z.array(z.object({ mesh: index.optional(), children: z.array(index).max(512).default([]),
    translation: vector(3).optional(), rotation: vector(4).optional(), scale: vector(3).optional(), matrix: vector(16).optional(),
    skin: z.never().optional(),
  })).min(1).max(512),
  meshes: z.array(z.object({ primitives: z.array(z.object({
    attributes: z.record(index), indices: index.optional(), material: index.optional(),
    mode: z.literal(4).optional(), targets: z.never().optional(),
  })).min(1).max(32) })).min(1).max(128),
  buffers: z.array(z.object({ byteLength: index, uri: z.never().optional() })).length(1),
  bufferViews: z.array(z.object({ buffer: z.literal(0), byteOffset: index.default(0), byteLength: index,
    byteStride: z.number().int().min(4).max(252).optional(),
  })).max(2048),
  accessors: z.array(z.object({ bufferView: index, byteOffset: index.default(0), componentType: z.union([
    z.literal(5120), z.literal(5121), z.literal(5122), z.literal(5123), z.literal(5125), z.literal(5126)]),
    count: index.max(1_000_000), type: z.enum(['SCALAR', 'VEC2', 'VEC3', 'VEC4', 'MAT4']), sparse: z.never().optional(),
  })).max(2048),
  images: z.array(z.object({ bufferView: index, mimeType: z.enum(['image/png', 'image/jpeg']) })).max(16).default([]),
  textures: z.array(z.object({ source: index, sampler: index.optional() })).max(64).default([]),
  samplers: z.array(z.unknown()).max(64).default([]),
  materials: z.array(z.unknown()).max(128).default([]),
  animations: z.array(z.unknown()).max(0).optional(),
  skins: z.array(z.unknown()).max(0).optional(),
});

function check(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`invalid_glb: ${reason}`);
}

function imageDimensions(bytes: Buffer, mime: string): [number, number] {
  if (mime === 'image/png') {
    check(bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR', 'invalid PNG');
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  check(bytes.length >= 4 && bytes.readUInt16BE(0) === 0xffd8, 'invalid JPEG');
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    check(bytes[offset] === 0xff, 'invalid JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    check(offset + 2 <= bytes.length, 'truncated JPEG');
    const length = bytes.readUInt16BE(offset);
    check(length >= 2 && offset + length <= bytes.length, 'invalid JPEG segment');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      check(length >= 8, 'invalid JPEG dimensions');
      return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    }
    offset += length;
  }
  throw new Error('invalid_glb: JPEG dimensions not found');
}

/** Bounded, static GLB subset. Never follows URIs or runs a renderer on the server. */
export function validateUploadedGlb(bytes: Buffer): void {
  check(bytes.length >= 28 && bytes.length <= MAX_SCENE_ASSET_BYTES, 'file size');
  check(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'header');
  const jsonLength = bytes.readUInt32LE(12);
  check(jsonLength > 0 && jsonLength <= 1024 * 1024 && jsonLength % 4 === 0 && 20 + jsonLength + 8 <= bytes.length && bytes.readUInt32LE(16) === 0x4e4f534a, 'JSON chunk');
  const binStart = 20 + jsonLength;
  const binLength = bytes.readUInt32LE(binStart);
  check(binLength % 4 === 0 && binStart + 8 + binLength === bytes.length && bytes.readUInt32LE(binStart + 4) === 0x004e4942, 'BIN chunk');
  const raw: unknown = JSON.parse(bytes.toString('utf8', 20, binStart).trim());
  const pending: Array<{ value: unknown; depth: number }> = [{ value: raw, depth: 0 }];
  let visited = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    check(depth <= 64 && ++visited <= 50000, 'JSON complexity');
    check(typeof value !== 'number' || Number.isFinite(value), 'non-finite JSON number');
    if (!value || typeof value !== 'object') continue;
    for (const [key, child] of Object.entries(value)) {
      check(key !== 'uri', 'external/embedded URIs forbidden; use a self-contained GLB');
      check(!['extensions', 'extensionsUsed', 'extensionsRequired'].includes(key) || !child || Object.keys(child).length === 0, 'extensions not supported');
      pending.push({ value: child, depth: depth + 1 });
    }
  }
  const parsed = gltfSchema.safeParse(raw);
  check(parsed.success, 'unsupported or malformed static glTF structure');
  const gltf = parsed.data;
  check(gltf.scene < gltf.scenes.length, 'scene index');
  const bufferLength = gltf.buffers[0].byteLength;
  check(bufferLength <= binLength && binLength - bufferLength <= 3, 'buffer length');
  const data = bytes.subarray(binStart + 8);
  for (const view of gltf.bufferViews) check(view.byteOffset + view.byteLength <= bufferLength && (!view.byteStride || view.byteStride % 4 === 0), 'buffer view bounds');
  const componentBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
  const elements = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  check(gltf.accessors.reduce((sum, accessor) => sum + accessor.count * elements[accessor.type], 0) <= 4_000_000, 'accessor work budget');
  for (const accessor of gltf.accessors) {
    const view = gltf.bufferViews[accessor.bufferView];
    check(view, 'accessor view');
    const width = componentBytes[accessor.componentType];
    const size = width * elements[accessor.type];
    const stride = view.byteStride ?? size;
    check(stride >= size && (view.byteOffset + accessor.byteOffset) % width === 0 &&
      accessor.byteOffset + (accessor.count ? (accessor.count - 1) * stride + size : 0) <= view.byteLength, 'accessor bounds');
    if (accessor.componentType === 5126) for (let i = 0; i < accessor.count; i++) for (let j = 0; j < elements[accessor.type]; j++) {
      const value = data.readFloatLE(view.byteOffset + accessor.byteOffset + i * stride + j * width);
      check(Number.isFinite(value) && Math.abs(value) <= 1e6, 'non-finite or excessive geometry');
    }
  }
  let vertexWork = 0;
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    const position = gltf.accessors[primitive.attributes.POSITION];
    check(position?.type === 'VEC3' && position.componentType === 5126, 'POSITION accessor');
    vertexWork += position.count;
    check(vertexWork <= 1_000_000, 'mesh work budget');
    for (const index of Object.values(primitive.attributes)) check(index < gltf.accessors.length && gltf.accessors[index].count === position.count, 'attribute index/count');
    if (primitive.indices !== undefined) {
      const indices = gltf.accessors[primitive.indices];
      check(indices?.type === 'SCALAR' && [5121, 5123, 5125].includes(indices.componentType), 'index accessor');
      vertexWork += indices.count;
      check(vertexWork <= 4_000_000, 'index work budget');
      const view = gltf.bufferViews[indices.bufferView], width = componentBytes[indices.componentType];
      for (let i = 0; i < indices.count; i++) check(data.readUIntLE(view.byteOffset + indices.byteOffset + i * (view.byteStride ?? width), width) < position.count, 'vertex index bounds');
    }
    check(primitive.material === undefined || primitive.material < gltf.materials.length, 'material index');
  }
  const parents = new Map<number, number>();
  let drawVertices = 0;
  gltf.nodes.forEach((node, parent) => {
    check(node.mesh === undefined || node.mesh < gltf.meshes.length, 'mesh index');
    if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh].primitives) {
      drawVertices += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count;
      check(drawVertices <= 4_000_000, 'instanced draw budget');
    }
    check(!node.rotation || Math.abs(Math.hypot(...node.rotation) - 1) < 0.001, 'node quaternion');
    check(!node.matrix || (!node.translation && !node.rotation && !node.scale), 'mixed node transforms');
    for (const child of node.children) { check(child < gltf.nodes.length && !parents.has(child), 'node child/parent'); parents.set(child, parent); }
  });
  gltf.nodes.forEach((_, i) => {
    let cursor: number | undefined = i, depth = 0;
    while (cursor !== undefined) { check(depth++ < 64, 'cyclic or too-deep nodes'); cursor = parents.get(cursor); }
  });
  for (const scene of gltf.scenes) for (const root of scene.nodes) check(root < gltf.nodes.length && !parents.has(root), 'scene root');
  let pixels = 0;
  for (const image of gltf.images) {
    const view = gltf.bufferViews[image.bufferView]; check(view, 'image view');
    const [w, h] = imageDimensions(data.subarray(view.byteOffset, view.byteOffset + view.byteLength), image.mimeType);
    pixels += w * h;
    check(w > 0 && h > 0 && w <= 4096 && h <= 4096 && pixels <= 16_777_216, 'texture pixel budget');
  }
  for (const texture of gltf.textures) check(texture.source < gltf.images.length && (texture.sampler === undefined || texture.sampler < gltf.samplers.length), 'texture index');
}
