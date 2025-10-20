import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
  eslint: {
    // Permitir que el build de producción continúe aunque existan errores de ESLint
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@upstash/redis'],
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