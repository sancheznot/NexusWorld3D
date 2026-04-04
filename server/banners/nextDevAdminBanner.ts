/**
 * ES: Recuadro consola ES/EN → /admin/login (compartido con banner Colyseus).
 * EN: Console box ES/EN → /admin/login (shared with Colyseus banner).
 */

import { nexusWorld3DConfig } from "@repo/nexusworld3d.config";

function padRow(text: string, width: number): string {
  const t = text.length > width ? `${text.slice(0, width - 1)}…` : text;
  return `│ ${t.padEnd(width)} │`;
}

/**
 * ES: Cuadro con ruta de login staff (NEXT_PUBLIC_APP_URL / CLIENT_URL + /admin/login).
 * EN: Staff login URL box (NEXT_PUBLIC_APP_URL / CLIENT_URL + /admin/login).
 */
export function printAdminRouteConsoleBox(): void {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:3000";
  const adminUrl = `${base.replace(/\/$/, "")}/admin/login`;
  const { appName } = nexusWorld3DConfig.branding;

  const content = [
    "",
    `${appName} — panel de administración / server admin panel`,
    "",
    "ES: Ve a la ruta de abajo para administrar tu servidor (landing, mundos,",
    "    assets y base de datos).",
    "",
    "EN: Use the URL below to manage your server (landing, worlds, assets,",
    "    and database).",
    "",
    `→  ${adminUrl}`,
    "",
  ];

  const innerW = Math.max(68, ...content.map((l) => l.length));
  const bar = "─".repeat(innerW + 2);
  const top = `┌${bar}┐`;
  const bottom = `└${bar}┘`;

  const lines = ["", top, ...content.map((l) => padRow(l, innerW)), bottom, ""];
  console.log(lines.join("\n"));
}
