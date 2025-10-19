import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white max-w-4xl mx-auto px-8">
        {/* Hotel Humboldt Logo/Title */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Hotel Humboldt
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-2">
            MMORPG 3D Inspirado en Venezuela
          </p>
          <p className="text-lg text-gray-400">
            Explora, lucha, socializa y vive aventuras épicas
          </p>
        </div>

        {/* Game Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-black bg-opacity-30 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">🏨</div>
            <h3 className="text-xl font-bold mb-2">Hotel Interactivo</h3>
            <p className="text-gray-300">
              Explora el icónico Hotel Humboldt con NPCs, habitaciones y secretos por descubrir.
            </p>
          </div>
          
          <div className="bg-black bg-opacity-30 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-bold mb-2">Combate Épico</h3>
            <p className="text-gray-300">
              Lucha contra monstruos, sube de nivel y mejora tus habilidades en múltiples mundos.
            </p>
          </div>
          
          <div className="bg-black bg-opacity-30 rounded-lg p-6 backdrop-blur-sm">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-bold mb-2">Múltiples Mundos</h3>
            <p className="text-gray-300">
              Viaja entre diferentes mundos, cada uno con sus propias mecánicas y desafíos únicos.
            </p>
          </div>
        </div>

        {/* Play Button */}
        <div className="space-y-4">
          <Link
            href="/game"
            className="inline-block bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold text-xl px-12 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-2xl"
          >
            🎮 JUGAR AHORA
          </Link>
          
          <div className="text-sm text-gray-400">
            <p>Controles: WASD para mover, I para inventario, M para mapa</p>
            <p>Enter para chat, Shift para correr, Click para atacar</p>
          </div>
        </div>

        {/* Development Status */}
        <div className="mt-16 bg-black bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold mb-4">🚧 Estado del Desarrollo</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Servidor Socket.IO</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Sistema de Movimiento</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>UI Básica</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <span>Mundo 3D (En desarrollo)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                <span>Sistema de Combate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                <span>Hotel Humboldt 3D</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
