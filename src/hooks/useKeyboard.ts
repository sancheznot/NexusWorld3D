import { useEffect, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { colyseusClient } from '@/lib/colyseus/client';

interface KeyboardState {
  keys: Set<string>;
  isMoving: boolean;
  isRunning: boolean;
  isJumping: boolean;
}

export const useKeyboard = (enabled: boolean = true) => {
  const keysRef = useRef<Set<string>>(new Set());
  const lastMovementRef = useRef<number>(0);
  const movementThrottle = 100; // ms
  const lastWasMovingRef = useRef<boolean>(false);
  const lastHeartbeatRef = useRef<number>(0);
  const jumpStartTimeRef = useRef<number>(0);
  const isJumpingRef = useRef<boolean>(false);

  const {
    position,
    rotation,
    isMoving,
    isRunning,
    isJumping,
    setMoving,
    setRunning,
    setJumping,
    updatePosition,
    updateRotation,
    updateVelocity,
  } = usePlayerStore();

  const {
    isInventoryOpen,
    isMapOpen,
    isChatOpen,
    isShopOpen,
    isSettingsOpen,
    toggleInventory,
    toggleMap,
    toggleChat,
    toggleShop,
    toggleSettings,
    closeAllModals,
  } = useUIStore();

  // Movement constants
  const MOVE_SPEED = 5;
  const RUN_SPEED = 8;
  const ROTATION_SPEED = 0.1;

  // Handle key down
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !event.key) return;
    
    const key = event.key.toLowerCase();
    
    // Si el chat está abierto, solo permitir teclas específicas del chat
    if (isChatOpen) {
      // Permitir solo teclas del chat: Enter, Escape, letras, números, etc.
      if (['enter', 'escape'].includes(key)) {
        switch (key) {
          case 'enter':
            // No hacer nada, el chat maneja esto
            break;
          case 'escape':
            closeAllModals();
            break;
        }
      }
      // No agregar otras teclas al keysRef cuando el chat está abierto
      return;
    }
    
    // Bloquear tecla T cuando el chat está abierto
    if (key === 't') {
      return;
    }
    
    keysRef.current.add(key);

    // Prevent default for game keys
    if (['w', 'a', 's', 'd', 'shift', ' '].includes(key)) {
      event.preventDefault();
    }

    // Handle special keys (solo si el chat NO está abierto)
    if (!isChatOpen) {
      switch (key) {
        case 'i':
          toggleInventory();
          break;
        case 'm':
          toggleMap();
          break;
        case 'enter':
          toggleChat();
          break;
        case 'escape':
          closeAllModals();
          break;
        case 'tab':
          // Handle tab for targeting (future feature)
          event.preventDefault();
          break;
      }
    } else {
      // Si el chat está abierto, solo manejar Enter y Escape
      switch (key) {
        case 'enter':
          // No hacer nada, el chat maneja esto
          break;
        case 'escape':
          closeAllModals();
          break;
      }
    }
  }, [enabled, isChatOpen, toggleInventory, toggleMap, toggleChat, closeAllModals]);

  // Handle key up
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled || !event.key) return;
    
    const key = event.key.toLowerCase();
    
    // Si el chat está abierto, no procesar teclas de movimiento
    if (isChatOpen) {
      return;
    }
    
    keysRef.current.delete(key);

    // Prevent default for game keys
    if (['w', 'a', 's', 'd', 'shift', ' '].includes(key)) {
      event.preventDefault();
    }
  }, [enabled, isChatOpen]);

  // Handle mouse click
  const handleMouseClick = useCallback((event: MouseEvent) => {
    if (!enabled) return;
    
    // Left click for attack
    if (event.button === 0) {
      // TODO: Implement attack logic
      // console.log('⚔️ Ataque con click izquierdo');
    }
  }, [enabled]);

  // Calculate movement
  const calculateMovement = useCallback(() => {
    if (!enabled) return;
    
    // BLOQUEAR MOVIMIENTO SI EL CHAT ESTÁ ABIERTO
    if (isChatOpen) {
      // Detener movimiento si el chat está abierto
      setMoving(false);
      setRunning(false);
      setJumping(false);
      updateVelocity({ x: 0, y: 0, z: 0 });
      return;
    }
    
    const keys = keysRef.current;
    const now = Date.now();

    // Check if enough time has passed since last movement update
    if (now - lastMovementRef.current < movementThrottle) {
      return;
    }

    const velocity = { x: 0, y: 0, z: 0 };
    let isMoving = false;

    // Check for running (Shift key)
    const isRunningKeyPressed = keys.has('shift');
    const speed = isRunningKeyPressed ? RUN_SPEED : MOVE_SPEED;

    // Calculate movement based on pressed keys
    if (keys.has('w')) {
      velocity.z -= speed;
      isMoving = true;
    }
    if (keys.has('s')) {
      velocity.z += speed;
      isMoving = true;
    }
    if (keys.has('a')) {
      velocity.x -= speed;
      isMoving = true;
    }
    if (keys.has('d')) {
      velocity.x += speed;
      isMoving = true;
    }

    // Check for jumping (Space key)
    const isJumping = keys.has(' ');

    // Update player state
    setMoving(isMoving);
    setRunning(isRunningKeyPressed);
    setJumping(isJumping);

    // Update velocity
    updateVelocity(velocity);

    // Send movement to server (throttled)
    if (isJumping && !isJumpingRef.current) {
      // Inicio del salto: enviar animación de salto
      isJumpingRef.current = true;
      jumpStartTimeRef.current = now;
      colyseusClient.movePlayer({
        position,
        rotation,
        velocity,
        isMoving: true,
        isRunning: false,
        isJumping: true,
        animation: 'jump',
        timestamp: now,
      });
      
      // Después de 1.5s (duración del salto), enviar transición automática a idle/walking
      setTimeout(() => {
        const currentKeys = keysRef.current;
        const stillMoving = currentKeys.has('w') || currentKeys.has('s') || currentKeys.has('a') || currentKeys.has('d');
        const stillRunning = currentKeys.has('shift');
        colyseusClient.movePlayer({
          position,
          rotation,
          velocity: { x: stillMoving ? velocity.x : 0, y: 0, z: stillMoving ? velocity.z : 0 },
          isMoving: stillMoving,
          isRunning: stillRunning && stillMoving,
          isJumping: false,
          animation: stillMoving ? (stillRunning ? 'running' : 'walking') : 'idle',
          timestamp: Date.now(),
        });
      }, 1500); // Duración de la animación de salto
    } else if (!isJumping && isJumpingRef.current) {
      // Fin del salto: volver a animación de movimiento o idle
      isJumpingRef.current = false;
      const currentlyMoving = velocity.x !== 0 || velocity.z !== 0;
      colyseusClient.movePlayer({
        position,
        rotation,
        velocity,
        isMoving: currentlyMoving,
        isRunning: isRunningKeyPressed && currentlyMoving,
        isJumping: false,
        animation: currentlyMoving ? (isRunningKeyPressed ? 'running' : 'walking') : 'idle',
        timestamp: now,
      });
    } else if (isMoving && !isJumpingRef.current) {
      colyseusClient.movePlayer({
        position,
        rotation,
        velocity,
        isMoving,
        isRunning: isRunningKeyPressed,
        isJumping,
        animation: isRunningKeyPressed ? 'running' : 'walking',
        timestamp: now,
      });
    } else if (lastWasMovingRef.current) {
      // Transition to idle: enviar una actualización para que los remotos vuelvan a idle
      colyseusClient.movePlayer({
        position,
        rotation,
        velocity: { x: 0, y: 0, z: 0 },
        isMoving: false,
        isRunning: false,
        isJumping: false,
        animation: 'idle',
        timestamp: now,
      });
    }

    // Record last moving state
    lastWasMovingRef.current = isMoving;

    lastMovementRef.current = now;
  }, [enabled, isChatOpen, position, rotation, setMoving, setRunning, setJumping, updateVelocity]);

  // Game loop for movement
  useEffect(() => {
    if (!enabled) return;
    
    let animationFrameId: number;

    const gameLoop = () => {
      calculateMovement();
      // Enviar heartbeat cada 10s para mantener lastUpdate fresco incluso sin movimiento
      const now = Date.now();
      if (now - lastHeartbeatRef.current > 10000) {
        colyseusClient.sendHeartbeat();
        lastHeartbeatRef.current = now;
      }
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled, calculateMovement]);

  // Event listeners
  useEffect(() => {
    if (!enabled) return;
    
    // Keyboard events
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseClick);

    // Prevent context menu on right click
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseClick);
      window.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [enabled, handleKeyDown, handleKeyUp, handleMouseClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      keysRef.current.clear();
    };
  }, []);

  return {
    keys: Array.from(keysRef.current),
    isMoving,
    isRunning,
    isJumping,
  };
};
