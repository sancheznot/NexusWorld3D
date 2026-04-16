/**
 * ES: Solo servidor — reexporta persistencia Redis. No importar desde componentes cliente.
 * EN: Server-only — re-exports Redis persistence. Do not import from client components.
 */
export { gameRedis, getGameRedis } from "@server/persistence/gameRedis";
