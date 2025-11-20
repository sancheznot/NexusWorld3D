'use client';

import Link from "next/link";
import LiveCameras from "@/components/ui/LiveCameras";
import LiveCameraPreview from "@/components/cameras/LiveCameraPreview";
import { useState } from "react";

export default function Home() {
  const [showCameras, setShowCameras] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Mini escena 3D oculta para captura de cámaras */}
      {showCameras && <LiveCameraPreview />}
      
      <div className="text-center text-white max-w-6xl mx-auto px-8 py-12">
        {/* NexusWorld3D Framework Logo/Title */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            NexusWorld3D
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-2">
            Framework para Mundos 3D Multiplayer
          </p>
          <p className="text-lg text-gray-400">
            Crea, explora y comparte mundos virtuales sin programación avanzada
          </p>
        </div>

        {/* Framework Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-black bg-opacity-30 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-bold mb-2">Editor Visual 3D</h3>
            <p className="text-gray-300">
              Crea mundos 3D sin conocimientos de Blender. Arrastra, coloca y personaliza objetos fácilmente.
            </p>
          </div>
          
          <div className="bg-black bg-opacity-30 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="text-xl font-bold mb-2">Multiplayer en Tiempo Real</h3>
            <p className="text-gray-300">
              Sistema de servidor integrado con Colyseus para experiencias multiplayer fluidas y escalables.
            </p>
          </div>
          
          <div className="bg-black bg-opacity-30 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Fácil de Desplegar</h3>
            <p className="text-gray-300">
              Un solo comando para desplegar en Railway, Vercel o cualquier plataforma. Sin configuración compleja.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/game"
              className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xl px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              🎮 DEMO INTERACTIVO
            </Link>
            <Link
              href="/admin"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-xl px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              🛠️ EDITOR DE MUNDOS
            </Link>
          </div>
          
          <div className="text-sm text-gray-400">
            <p>Demo: WASD para mover, Click para interactuar | Editor: Arrastra y coloca objetos</p>
            <p>Multiplayer en tiempo real | Sin instalación requerida</p>
          </div>
        </div>

        {/* Live Cameras Section */}
        <div className="mt-16 bg-black bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                📹 Cámaras en Tiempo Real
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Monitoreo de actividad en el mundo - Los números muestran jugadores conectados
              </p>
            </div>
            <button
              onClick={() => setShowCameras(!showCameras)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
            >
              {showCameras ? 'Ocultar' : 'Ver Cámaras'}
            </button>
          </div>
          
          {showCameras ? (
            <>
              <div className="mb-4 p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-500 border-opacity-30">
                <p className="text-sm text-green-200">
                  🔴 <strong>STREAMING EN VIVO:</strong> Video en tiempo real a <strong>60 FPS</strong> (actualización cada 16ms). 
                  Conectado al servidor Colyseus. Verás el mundo 3D REAL y jugadores moviéndose fluidamente.
                </p>
                <p className="text-xs text-green-300 mt-2">
                  💡 Tip: Entra al juego PRIMERO, luego ve las cámaras para verte en vivo. Abre consola (F12) para ver logs.
                </p>
              </div>
              <LiveCameras className="mt-4" />
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-5xl mb-4">📹</div>
              <div className="text-lg">
                Haz clic en &quot;Ver Cámaras&quot; para ver el monitoreo del mundo en tiempo real
              </div>
              <div className="text-sm mt-2 text-gray-500">
                Visualiza la actividad de jugadores en diferentes zonas
              </div>
            </div>
          )}
        </div>

        {/* Framework Status */}
        <div className="mt-8 bg-black bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold mb-4">⚡ Estado del Framework</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Servidor Colyseus Multiplayer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Motor 3D Three.js + React Three Fiber</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Panel de Administración</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Integración S3 + CDN</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span>Editor 3D Visual (En desarrollo)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Despliegue Automático</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Documentación Completa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                <span>Marketplace de Assets</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
