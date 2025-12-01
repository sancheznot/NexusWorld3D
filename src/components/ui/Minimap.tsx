'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useWorldStore } from '@/store/worldStore';
import { useUIStore } from '@/store/uiStore';
import { jobsClient } from '@/lib/colyseus/JobsClient';

interface MinimapProps {
  size?: number;
  zoom?: number;
  className?: string;
}

export default function Minimap({ size = 200, zoom = 3, className = '' }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { position, rotation } = usePlayerStore();
  const { players } = useWorldStore();
  const { isMinimapVisible } = useUIStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [gpsTarget, setGpsTarget] = useState<{ x: number; z: number } | null>(null);

  const actualSize = isExpanded ? size * 1.5 : size;

  // Listen for GPS target updates from jobs
  useEffect(() => {
    const onNext = (data: unknown) => {
      const payload = data as { position?: { x: number; y: number; z: number } };
      if (payload.position) {
        setGpsTarget({ x: payload.position.x, z: payload.position.z });
      } else {
        setGpsTarget(null);
      }
    };
    
    const onCompleted = () => setGpsTarget(null);
    const onCancelled = () => setGpsTarget(null);

    jobsClient.on('jobs:next', onNext);
    jobsClient.on('jobs:completed', onCompleted);
    jobsClient.on('jobs:cancelled', onCancelled);

    // Note: jobsClient doesn't expose current target directly, but we can rely on events for now.
    // Ideally we would fetch current target state.

    return () => {
      jobsClient.off('jobs:next', onNext);
      jobsClient.off('jobs:completed', onCompleted);
      jobsClient.off('jobs:cancelled', onCancelled);
    };
  }, []);

  useEffect(() => {
    if (!isMinimapVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, actualSize, actualSize);

    // Draw background (Square)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, actualSize, actualSize);

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, actualSize, actualSize);

    // Save context for map rotation
    ctx.save();
    // Move origin to center
    ctx.translate(actualSize / 2, actualSize / 2);
    // Rotate map opposite to player rotation
    ctx.rotate(-rotation.y);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50 * zoom;
    // Draw enough grid lines to cover rotation
    const diagonal = actualSize * 1.5; 
    
    // Calculate grid offset based on player position to make it move
    const offsetX = (position.x * zoom) % gridSize;
    const offsetZ = (position.z * zoom) % gridSize;

    for (let i = -diagonal; i < diagonal; i += gridSize) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i - offsetX, -diagonal);
      ctx.lineTo(i - offsetX, diagonal);
      ctx.stroke();
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(-diagonal, i - offsetZ);
      ctx.lineTo(diagonal, i - offsetZ);
      ctx.stroke();
    }

    // Draw GPS Line
    if (gpsTarget) {
      const dx = (gpsTarget.x - position.x) * zoom;
      const dz = (gpsTarget.z - position.z) * zoom;
      
      // Draw line to target
      ctx.strokeStyle = '#f97316'; // Orange
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(0, 0); // From player (center)
      ctx.lineTo(dx, dz); // To target
      ctx.stroke();
      ctx.setLineDash([]);

      // Calculate clamped position for icon if it's outside the view
      const dist = Math.sqrt(dx * dx + dz * dz);
      const maxDist = (actualSize / 2) - 10; // Keep inside border
      
      let iconX = dx;
      let iconZ = dz;

      if (dist > maxDist) {
        const angle = Math.atan2(dz, dx);
        iconX = Math.cos(angle) * maxDist;
        iconZ = Math.sin(angle) * maxDist;
      }

      // Draw target icon
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(iconX, iconZ, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Add a small arrow pointing to the target if clamped
      if (dist > maxDist) {
        ctx.save();
        ctx.translate(iconX, iconZ);
        ctx.rotate(Math.atan2(dz, dx));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-8, -4);
        ctx.lineTo(-8, 4);
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw other players
    Object.entries(players).forEach(([, player]) => {
      if (!player?.position) return;

      const dx = ((player.position.x ?? 0) - position.x) * zoom;
      const dz = ((player.position.z ?? 0) - position.z) * zoom;

      // Only draw if within reasonable distance
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance > diagonal) return;

      // Draw player dot
      ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(dx, dz, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Restore context (undo rotation)
    ctx.restore();

    // Draw player marker (center, always on top, static relative to frame)
    ctx.save();
    ctx.translate(actualSize / 2, actualSize / 2);

    // Draw player arrow
    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-7, 8);
    ctx.lineTo(0, 4); // Indent at bottom
    ctx.lineTo(7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Draw compass letters (N, S, E, W) - rotating around border
    const radius = actualSize / 2 - 15;
    const dirs = [
      { label: 'N', angle: 0 },
      { label: 'E', angle: -Math.PI / 2 },
      { label: 'S', angle: -Math.PI },
      { label: 'W', angle: -Math.PI * 1.5 },
    ];

    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';

    dirs.forEach(dir => {
      // Adjust angle by player rotation
      const angle = dir.angle + rotation.y;
      const x = (actualSize / 2) + Math.sin(angle) * radius;
      const y = (actualSize / 2) - Math.cos(angle) * radius; // Canvas Y is down
      
      // Only draw if inside the box (roughly)
      if (x > 10 && x < actualSize - 10 && y > 10 && y < actualSize - 10) {
         ctx.fillText(dir.label, x, y);
      }
    });

  }, [position, rotation, players, zoom, actualSize, isExpanded, isMinimapVisible, gpsTarget]);

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
        className="rounded-lg shadow-2xl border-2 border-gray-800 bg-black"
        onClick={() => setIsExpanded(!isExpanded)}
      />

      {/* Expand/Collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-2 right-2 bg-black/50 text-white rounded w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
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

