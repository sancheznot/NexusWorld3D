import { readFileSync } from 'node:fs';

export function uploadGlbFixture(mutate?: (json: Record<string, unknown>) => void) {
  const json = JSON.parse(readFileSync(new URL('../../public/scene-assets/demo-doorway.gltf', import.meta.url), 'utf8')) as Record<string, unknown>;
  const buffers = json.buffers as Array<{ uri?: string; byteLength: number }>;
  const bin = Buffer.from(buffers[0].uri!.split(',')[1], 'base64');
  delete buffers[0].uri;
  mutate?.(json);
  const raw = Buffer.from(JSON.stringify(json));
  const text = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 0x20); raw.copy(text);
  const binary = Buffer.alloc(Math.ceil(bin.length / 4) * 4); bin.copy(binary);
  const bytes = Buffer.alloc(12 + 8 + text.length + 8 + binary.length);
  bytes.writeUInt32LE(0x46546c67, 0); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(text.length, 12); bytes.writeUInt32LE(0x4e4f534a, 16); text.copy(bytes, 20);
  bytes.writeUInt32LE(binary.length, 20 + text.length); bytes.writeUInt32LE(0x004e4942, 24 + text.length); binary.copy(bytes, 28 + text.length);
  return bytes;
}
