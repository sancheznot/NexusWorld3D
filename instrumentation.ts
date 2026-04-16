/**
 * ES: Hook de arranque Next.js — migraciones MariaDB en runtime de producción.
 * EN: Next.js startup hook — MariaDB migrations in production runtime.
 *
 * ES: En `next dev` + `tsx server/index.ts` **no** repetir migraciones aquí: compiten por el
 *     mismo `GET_LOCK` en MariaDB y `throw` en fallo puede impedir que Next abra :3000 (solo
 *     verías Console Ninja sin "Ready"). En dev las migraciones ya van en Colyseus/combined.
 * EN: Do **not** run migrations here during `next dev` alongside Colyseus — DB lock race and
 *     thrown errors can block Next from listening on :3000.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  if (process.env.NODE_ENV === "development") {
    return;
  }

  const { runPendingMigrations } = await import("@/lib/db/runMigrations");
  const m = await runPendingMigrations({
    quiet: process.env.NODE_ENV === "production",
  });
  if (!m.ok) {
    console.error("❌ Auto-migrate failed:", m.error);
    throw new Error(m.error ?? "Database migration failed");
  }
}
