#!/usr/bin/env node
/**
 * ES: Evita `npm run dev` medio muerto: Next en :3000 y Colyseus en COLYSEUS_PORT deben estar libres.
 * EN: Prevents a half-dead dev stack when Next (e.g. :3000) or Colyseus port is already taken.
 */
import net from "node:net";

function canBindPort(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
        return;
      }
      console.warn(`[ensure-dev-ports] port ${port}: ${err.message}`);
      resolve(false);
    });
    s.listen(port, "0.0.0.0", () => {
      s.close(() => resolve(true));
    });
  });
}

async function main() {
  const nextPort = Number(process.env.PORT) || 3000;
  const colyseusPort =
    Number(process.env.COLYSEUS_PORT || process.env.SOCKET_PORT) || 3001;

  const okNext = await canBindPort(nextPort);
  if (!okNext) {
    console.error(
      `\n❌ Port ${nextPort} is already in use — Next.js cannot start.\n` +
        `   Fix: run ./launch.sh → option 3 (Stop dev stack), or free the port:\n` +
        `        fuser -k ${nextPort}/tcp   # Linux\n`
    );
    process.exit(1);
  }

  const okColyseus = await canBindPort(colyseusPort);
  if (!okColyseus) {
    console.error(
      `\n❌ Port ${colyseusPort} is already in use — Colyseus cannot start.\n` +
        `   Fix: ./launch.sh → option 3, or: fuser -k ${colyseusPort}/tcp\n`
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
