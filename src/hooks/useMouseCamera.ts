'use client';

import { useCallback, useEffect } from 'react';

interface CameraState {
  horizontal: number;
  vertical: number;
}

// Singleton compartido
const cameraStateGlobal = { horizontal: 0, vertical: 0 };
let listenersBound = false;
let isMouseDown = false;
let lastMousePosition = { x: 0, y: 0 };

export function useMouseCamera(enabled: boolean = true) {
  // usa el singleton:
  const cameraState = cameraStateGlobal;

  const handleMouseDown = useCallback((event: MouseEvent) => {
    isMouseDown = true;
    lastMousePosition = { x: event.clientX, y: event.clientY };
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDown = false;
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isMouseDown) return;

    const deltaX = event.clientX - lastMousePosition.x;
    const deltaY = event.clientY - lastMousePosition.y;

    // Sensibilidad del mouse (ajustable)
    const sensitivity = 0.003;

    // Actualizar rotación horizontal (Y-axis)
    cameraState.horizontal += deltaX * sensitivity;

    // Actualizar rotación vertical (X-axis) con límites
    cameraState.vertical += deltaY * sensitivity;
    cameraState.vertical = Math.max(
      -Math.PI / 2, // -90 grados
      Math.min(Math.PI / 2, cameraState.vertical) // +90 grados
    );

    lastMousePosition = { x: event.clientX, y: event.clientY };
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
  }, []);

  // bindea listeners solo una vez globalmente
  useEffect(() => {
    if (!enabled || listenersBound) return;

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('wheel', handleWheel, { passive: false });

    listenersBound = true;
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('wheel', handleWheel);
      listenersBound = false;
    };
  }, [enabled, handleMouseDown, handleMouseUp, handleMouseMove, handleWheel]);

  const getCameraState = useCallback(() => cameraState, []);
  
  const setCameraState = useCallback((newState: Partial<CameraState>) => {
    if (newState.horizontal !== undefined) {
      cameraState.horizontal = newState.horizontal;
    }
    if (newState.vertical !== undefined) {
      cameraState.vertical = newState.vertical;
    }
  }, []);

  return { getCameraState, setCameraState };
}
