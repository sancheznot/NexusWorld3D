'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useWorldStore } from '@/store/worldStore';
import { useUIStore } from '@/store/uiStore';

interface MinimapProps {
  size?: number;
  zoom?: number;
  className?: string;
}

export default function Minimap({ size = 200, zoom = 0.1, className = '' }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { position, rotation } = usePlayerStore();
  const { players } = useWorldStore();
  const { isMinimapVisible } = useUIStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const actualSize = isExpanded ? size * 1.5 : size;

  useEffect(() => {
    if (!isMinimapVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, actualSize, actualSize);

    // Draw background circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(actualSize / 2, actualSize / 2, actualSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(actualSize / 2, actualSize / 2, actualSize / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Save context for rotation
    ctx.save();
    ctx.translate(actualSize / 2, actualSize / 2);
    ctx.rotate(-rotation.y); // Rotate map based on player rotation

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50 * zoom;
    for (let i = -actualSize; i < actualSize; i += gridSize) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i, -actualSize);
      ctx.lineTo(i, actualSize);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(-actualSize, i);
      ctx.lineTo(actualSize, i);
      ctx.stroke();
    }

    // Draw other players
    Object.entries(players).forEach(([, player]) => {
      if (!player?.position) return;

      const dx = ((player.position.x ?? 0) - position.x) * zoom;
      const dz = ((player.position.z ?? 0) - position.z) * zoom;

      // Only draw if within minimap radius
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance > actualSize / 2 - 10) return;

      // Draw player dot
      ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(dx, dz, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw player name (if expanded)
      if (isExpanded && player?.username) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.username as string, dx, dz - 8);
      }
    });

    // Restore context
    ctx.restore();

    // Draw player marker (center, always on top)
    ctx.save();
    ctx.translate(actualSize / 2, actualSize / 2);

    // Draw player triangle (pointing up)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-6, 6);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();

    // Draw player outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(-6, 6);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();

    // Draw compass (N, S, E, W)
    ctx.save();
    ctx.translate(actualSize / 2, actualSize / 2);
    ctx.rotate(-rotation.y);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // North
    ctx.fillText('N', 0, -actualSize / 2 + 15);
    // South
    ctx.fillText('S', 0, actualSize / 2 - 15);
    // East
    ctx.fillText('E', actualSize / 2 - 15, 0);
    // West
    ctx.fillText('W', -actualSize / 2 + 15, 0);

    ctx.restore();

  }, [position, rotation, players, zoom, actualSize, isExpanded, isMinimapVisible]);

  if (!isMinimapVisible) return null;

  return (
    <div 
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${className}`}
      style={{ width: actualSize, height: actualSize }}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={actualSize}
        height={actualSize}
        className="rounded-full shadow-lg cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      />

      {/* Expand/Collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-opacity-70 transition-all"
        title={isExpanded ? 'Contraer' : 'Expandir'}
      >
        {isExpanded ? '−' : '+'}
      </button>

      {/* Toggle visibility button */}
      <button
        onClick={() => useUIStore.getState().setMinimapVisible(false)}
        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-opacity-70 transition-all"
        title="Ocultar minimapa"
      >
        ×
      </button>
    </div>
  );
}

