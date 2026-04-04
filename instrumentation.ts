/**
 * ES: Hook de arranque Next.js — migraciones MariaDB si aplica.
 * EN: Next.js startup hook — MariaDB migrations when configured.
 *
 * ES: Aviso /admin/login va en consola Colyseus (debajo del ASCII NEXUS).
 * EN: /admin/login hint is printed by the Colyseus process (below NEXUS ASCII).
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // ES: Solo Edge se omite; si NEXT_RUNTIME viene vacío en algún entorno, no bloquear Node.
  // EN: Skip Edge only; if NEXT_RUNTIME is unset in some setups, still run on Node.
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { runPendingMigrations } = await import("@/lib/db/runMigrations");
  const m = await runPendingMigrations({
    quiet: process.env.NODE_ENV === "production",
  });
  if (!m.ok) {
    console.error("❌ Auto-migrate failed:", m.error);
    throw new Error(m.error ?? "Database migration failed");
  }
}
