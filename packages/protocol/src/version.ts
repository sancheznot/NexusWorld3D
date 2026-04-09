/**
 * ES: Incrementar cuando cambien payloads incompatibles de mensajes `core:*`.
 * EN: Bump when core message payloads break backward compatibility.
 */
export const PROTOCOL_VERSION = 1 as const;

export type ProtocolVersion = typeof PROTOCOL_VERSION;

/**
 * ES: Clave en `joinOrCreate(room, options)` / `onJoin(client, options)` para negociar versión.
 * EN: Key in Colyseus join options for protocol negotiation.
 */
export const JOIN_OPTION_PROTOCOL_VERSION_KEY = "protocolVersion" as const;

/**
 * ES: Lee la versión enviada por el cliente en opciones de join (número o string entero).
 * EN: Read client protocol version from join options (number or integer string).
 */
export function readJoinProtocolVersion(options: unknown): number | null {
  if (!options || typeof options !== "object") return null;
  const raw = (options as Record<string, unknown>)[
    JOIN_OPTION_PROTOCOL_VERSION_KEY
  ];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}
