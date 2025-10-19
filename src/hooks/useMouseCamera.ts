'use client';

import { useCallback, useEffect, useRef } from 'react';

interface CameraState {
  horizontal: number;
  vertical: number;
}

export function useMouseCamera(enabled: boolean = true) {
  const cameraState = useRef<CameraState>({ horizontal: 0, vertical: 0 });
  const isMouseDown = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!enabled) return;
    isMouseDown.current = true;
    lastMousePosition.current = { x: event.clientX, y: event.clientY };
    console.log('🖱️ Mouse down - iniciando control de cámara');
  }, [enabled]);

  const handleMouseUp = useCallback(() => {
    if (!enabled) return;
    isMouseDown.current = false;
    console.log('🖱️ Mouse up - deteniendo control de cámara');
  }, [enabled]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!enabled || !isMouseDown.current) return;

    const deltaX = event.clientX - lastMousePosition.current.x;
    const deltaY = event.clientY - lastMousePosition.current.y;

    // Sensibilidad del mouse (ajustable)
    const sensitivity = 0.003;

    // Actualizar rotación horizontal (Y-axis)
    cameraState.current.horizontal += deltaX * sensitivity;

    // Actualizar rotación vertical (X-axis) con límites
    cameraState.current.vertical += deltaY * sensitivity;
    cameraState.current.vertical = Math.max(
      -Math.PI / 2, // -90 grados
      Math.min(Math.PI / 2, cameraState.current.vertical) // +90 grados
    );

    lastMousePosition.current = { x: event.clientX, y: event.clientY };

    console.log(`🖱️ Cámara: H=${cameraState.current.horizontal.toFixed(2)}, V=${cameraState.current.vertical.toFixed(2)}`);
  }, [enabled]);

  const handleWheel = useCallback((event: WheelEvent) => {
    if (!enabled) return;
    event.preventDefault();
    
    // Control de zoom con scroll (opcional)
    console.log('🖱️ Wheel scroll:', event.deltaY);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    console.log('🖱️ Configurando control de cámara con mouse');
    
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('wheel', handleWheel);
      console.log('🖱️ Control de cámara removido');
    };
  }, [enabled, handleMouseDown, handleMouseUp, handleMouseMove, handleWheel]);

  const getCameraState = useCallback(() => cameraState.current, []);
  
  const setCameraState = useCallback((newState: Partial<CameraState>) => {
    if (newState.horizontal !== undefined) {
      cameraState.current.horizontal = newState.horizontal;
    }
    if (newState.vertical !== undefined) {
      cameraState.current.vertical = newState.vertical;
    }
  }, []);

  return { getCameraState, setCameraState };
}
