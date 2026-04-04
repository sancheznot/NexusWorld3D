/**
 * ES: Banner de consola NexusWorld3D + crédito Colyseus (sustituye @colyseus/greeting-banner).
 * EN: Console banner NexusWorld3D + Colyseus credit (replaces default Colyseus greeting).
 */

import { nexusWorld3DConfig } from "@repo/nexusworld3d.config";
import { printAdminRouteConsoleBox } from "./nextDevAdminBanner";

const COLYSEUS_CREDIT_LINES = [
  "",
  "     · Multiplayer powered by Colyseus ·",
  "",
  "💖 Consider becoming a Sponsor on GitHub → https://github.com/sponsors/endel",
  "🌟 Give us a star on GitHub → https://github.com/colyseus/colyseus",
  "☁️  Deploy and scale your project on Colyseus Cloud → https://cloud.colyseus.io",
  "",
];

/** ES: "NEXUS" estilo bloque (UTF-8). EN: Block-style "NEXUS" (UTF-8). */
export const NEXUS_BLOCK = String.raw`
███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝`.trimStart();

export function printGameServerDevBanner(opts: {
  port: number;
  clientUrl: string;
}): void {
  const { branding } = nexusWorld3DConfig;
  const head = [
    "",
    NEXUS_BLOCK,
    "",
  ];
  console.log(head.join("\n"));
  printAdminRouteConsoleBox();
  const tail = [
    `     ${branding.appName} · game server (dev)`,
    ...COLYSEUS_CREDIT_LINES,
    `⚡ Listening on port ${opts.port}`,
    `🌐 Client URL: ${opts.clientUrl}`,
    `📡 WebSocket: ws://127.0.0.1:${opts.port}`,
    `🎮 Colyseus rooms registered (${branding.appName})`,
    "",
  ];
  console.log(tail.join("\n"));
}

export function printUnifiedServerBanner(opts: {
  port: number;
  dev: boolean;
}): void {
  const { branding } = nexusWorld3DConfig;
  const proto = opts.dev ? "http" : "https";
  const ws = opts.dev ? "ws" : "wss";
  const head = ["", NEXUS_BLOCK, ""];
  console.log(head.join("\n"));
  printAdminRouteConsoleBox();
  const tail = [
    `     ${branding.appName} · unified Next + Colyseus`,
    ...COLYSEUS_CREDIT_LINES,
    `🚀 Unified server ${proto}://0.0.0.0:${opts.port}`,
    `📡 Colyseus ${ws} on same port`,
    "",
  ];
  console.log(tail.join("\n"));
}
