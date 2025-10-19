import { useEffect, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { socketClient } from '@/lib/socket/client';

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
    keysRef.current.add(key);

    // Prevent default for game keys
    if (['w', 'a', 's', 'd', 'shift', ' '].includes(key)) {
      event.preventDefault();
    }

    // Handle special keys
    switch (key) {
      case 'i':
        if (!isChatOpen) {
          toggleInventory();
        }
        break;
      case 'm':
        if (!isChatOpen) {
          toggleMap();
        }
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
  }, [isChatOpen, toggleInventory, toggleMap, toggleChat, closeAllModals]);

  // Handle key up
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled || !event.key) return;
    
    const key = event.key.toLowerCase();
    keysRef.current.delete(key);

    // Prevent default for game keys
    if (['w', 'a', 's', 'd', 'shift', ' '].includes(key)) {
      event.preventDefault();
    }
  }, [enabled]);

  // Handle mouse click
  const handleMouseClick = useCallback((event: MouseEvent) => {
    if (!enabled) return;
    
    // Left click for attack
    if (event.button === 0) {
      // TODO: Implement attack logic
      console.log('⚔️ Ataque con click izquierdo');
    }
  }, [enabled]);

  // Calculate movement
  const calculateMovement = useCallback(() => {
    if (!enabled) return;
    
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
    if (isMoving) {
      socketClient.movePlayer({
        position,
        rotation,
        velocity,
        isMoving,
        isRunning: isRunningKeyPressed,
        isJumping,
        timestamp: now,
      });
    }

    lastMovementRef.current = now;
  }, [enabled, position, rotation, setMoving, setRunning, setJumping, updateVelocity]);

  // Game loop for movement
  useEffect(() => {
    if (!enabled) return;
    
    let animationFrameId: number;

    const gameLoop = () => {
      calculateMovement();
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
