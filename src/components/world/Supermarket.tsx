'use client';

interface SupermarketProps {
  position?: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}

export default function Supermarket({ 
  position = [0, 0, 0], 
  scale = [1, 1, 1],
  rotation = [0, 0, 0]
}: SupermarketProps) {
  return (
    <group position={position} scale={scale} rotation={rotation}>
      {/* Piso del supermercado */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* Paredes */}
      {/* Pared trasera */}
      <mesh position={[0, 2.5, -10]} castShadow>
        <boxGeometry args={[20, 5, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Pared izquierda */}
      <mesh position={[-10, 2.5, 0]} castShadow>
        <boxGeometry args={[0.2, 5, 20]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Pared derecha */}
      <mesh position={[10, 2.5, 0]} castShadow>
        <boxGeometry args={[0.2, 5, 20]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Pared frontal (con espacio para puerta) */}
      <mesh position={[-5, 2.5, 10]} castShadow>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[5, 2.5, 10]} castShadow>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Techo */}
      <mesh position={[0, 5, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>

      {/* Estanterías */}
      {/* Fila 1 */}
      <group position={[-5, 0, -5]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[8, 2, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </group>

      {/* Fila 2 */}
      <group position={[-5, 0, 0]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[8, 2, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </group>

      {/* Fila 3 */}
      <group position={[-5, 0, 5]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[8, 2, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </group>

      {/* Fila 4 (lado derecho) */}
      <group position={[5, 0, -5]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[8, 2, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </group>

      {/* Fila 5 (lado derecho) */}
      <group position={[5, 0, 0]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[8, 2, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </group>

      {/* Mostrador de caja (donde está el NPC) */}
      <group position={[2, 0, 4]}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <boxGeometry args={[3, 1.5, 1.5]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
        {/* Computadora */}
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 0.3]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>

      {/* Letreros decorativos */}
      <group position={[0, 4, -9.8]}>
        <mesh castShadow>
          <boxGeometry args={[6, 1, 0.1]} />
          <meshStandardMaterial color="#ff6b6b" />
        </mesh>
      </group>

      {/* Iluminación ambiental del supermercado */}
      <pointLight position={[0, 4, 0]} intensity={0.5} distance={15} color="#ffffff" />
      <pointLight position={[-5, 4, -5]} intensity={0.3} distance={10} color="#ffffff" />
      <pointLight position={[5, 4, -5]} intensity={0.3} distance={10} color="#ffffff" />
      <pointLight position={[-5, 4, 5]} intensity={0.3} distance={10} color="#ffffff" />
      <pointLight position={[5, 4, 5]} intensity={0.3} distance={10} color="#ffffff" />
    </group>
  );
}

