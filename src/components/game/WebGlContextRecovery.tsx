'use client';

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';

type Props = {
  /** ES: Incrementar `key` del `<Canvas>` para crear un contexto nuevo. EN: Bump Canvas key for new GL context. */
  onRequestRemount?: () => void;
};

/**
 * ES: `webglcontextlost` + opcional remount del Canvas (evita quedarse en fondo azul).
 * EN: Handles context loss and optionally remounts the Canvas.
 */
export default function WebGlContextRecovery({ onRequestRemount }: Props) {
  const gl = useThree((s) => s.gl);
  const remountBudget = useRef({ count: 0, windowStart: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (e: Event) => {
      e.preventDefault();
      const now = Date.now();
      const b = remountBudget.current;
      if (now - b.windowStart > 60_000) {
        b.count = 0;
        b.windowStart = now;
      }
      b.count += 1;

      useUIStore.getState().addNotification({
        id: `webgl-lost-${now}`,
        type: 'warning',
        title: 'Gráficos',
        message:
          'Se perdió el contexto WebGL (pantalla azul). Recuperando la escena…',
        duration: 8000,
        timestamp: new Date(),
      });

      if (b.count <= 3 && onRequestRemount) {
        window.setTimeout(() => onRequestRemount(), 80);
      }
    };

    const onRestored = () => {
      useUIStore.getState().addNotification({
        id: `webgl-restored-${Date.now()}`,
        type: 'info',
        title: 'Gráficos',
        message: 'Contexto gráfico restaurado.',
        duration: 4000,
        timestamp: new Date(),
      });
    };

    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl, onRequestRemount]);

  return null;
}
