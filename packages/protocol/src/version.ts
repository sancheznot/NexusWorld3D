/**
 * ES: Incrementar cuando cambien payloads incompatibles de mensajes `core:*`.
 * EN: Bump when core message payloads break backward compatibility.
 */
export const PROTOCOL_VERSION = 1 as const;

export type ProtocolVersion = typeof PROTOCOL_VERSION;
