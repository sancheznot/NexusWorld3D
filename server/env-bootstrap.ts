/**
 * ES: Cargar .env y luego .env.local (override) antes del resto del servidor.
 * EN: Load .env then .env.local (override) before other server imports run.
 *
 * ES: Importar este módulo como PRIMERA línea en entrypoints (combined, index).
 * EN: Import this module as the FIRST line in entrypoints (combined, index).
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
