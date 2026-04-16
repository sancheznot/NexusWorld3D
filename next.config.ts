import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@nexusworld3d/protocol",
    "@nexusworld3d/engine-client",
    "@nexusworld3d/engine-server",
  ],
  /** ES: Menos trabajo en el primer compile (barrels grandes). EN: Faster dev cold start for heavy packages. */
  experimental: {
    /** ES: lucide es barrel grande; no incluir @react-three/* (riesgo con Three/R3F). EN: Large barrel; skip R3F pkgs (module quirks). */
    optimizePackageImports: ["lucide-react"],
  },
  /* config options here */
  env: {
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
  eslint: {
    // Permitir que el build de producción continúe aunque existan errores de ESLint
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["@upstash/redis", "ioredis"],
  // Para Railway - permitir todas las rutas
  async rewrites() {
    return [
      {
        source: '/api/socket/:path*',
        destination: '/api/socket/:path*',
      },
    ];
  },
};

export default nextConfig;