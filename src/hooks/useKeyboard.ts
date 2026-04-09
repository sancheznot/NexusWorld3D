import { useEffect, useCallback, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useUIStore } from '@/store/uiStore';
import { colyseusClient } from '@/lib/colyseus/client';
import {
  MOVEMENT_KEYS,
  normalizeKeyboardKey,
  isMovementKey,
} from '@/config/gameKeybindings';
import { tryPickupNearestWorldItem } from '@/lib/gameplay/pickupActions';
import { tryDropSelectedHotbarItem } from '@/lib/gameplay/dropActions';
import { tryUseSelectedHotbarConsumable } from '@/lib/gameplay/hotbarUseActions';
import { triggerMeleeClick } from '@/lib/gameplay/meleeActionBridge';
import { placeBuildPieceAtPlayer } from '@/lib/housing/housingClient';
import { useBuildPreviewStore } from '@/store/buildPreviewStore';

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
    isBankOpen,
    isJobsOpen,
    isPauseMenuOpen,
    isMinimapVisible,
    isCraftingOpen,
    toggleInventory,
    toggleMap,
    toggleChat,
    togglePauseMenu,
    toggleCrafting,
    setPauseMenuOpen,
    setHotbarSelectedSlot,
    setMinimapVisible,
    closeAllModals,
  } = useUIStore();

  // Movement constants
  const MOVE_SPEED = 5;
  const RUN_SPEED = 8;
  const ROTATION_SPEED = 0.1;

  // Handle key down
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !event.key) return;

    const key = normalizeKeyboardKey(event);

    if (isPauseMenuOpen) {
      if (key === "escape") {
        setPauseMenuOpen(false);
      }
      return;
    }

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

    if (isMovementKey(key)) {
      event.preventDefault();
    }

    // Handle special keys (solo si el chat NO está abierto)
    if (!isChatOpen) {
      const uiBlocksWorldActions =
        isInventoryOpen ||
        isMapOpen ||
        isCraftingOpen ||
        isShopOpen ||
        isSettingsOpen ||
        isBankOpen ||
        isJobsOpen;

      switch (key) {
        case "i":
          toggleInventory();
          break;
        case "m":
          toggleMap();
          break;
        case "n":
          setMinimapVisible(!isMinimapVisible);
          break;
        case "enter":
          toggleChat();
          break;
        case "escape":
          if (
            isInventoryOpen ||
            isMapOpen ||
            isShopOpen ||
            isSettingsOpen ||
            isBankOpen ||
            isJobsOpen ||
            isCraftingOpen
          ) {
            closeAllModals();
          } else {
            togglePauseMenu();
          }
          break;
        case "tab":
          event.preventDefault();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          setHotbarSelectedSlot(Number(key) - 1);
          event.preventDefault();
          break;
        case "e": {
          const previewId = useBuildPreviewStore.getState().previewPieceId;
          if (
            previewId &&
            !uiBlocksWorldActions &&
            colyseusClient.isConnectedToWorldRoom()
          ) {
            placeBuildPieceAtPlayer(previewId);
            event.preventDefault();
            break;
          }
          if (
            !uiBlocksWorldActions &&
            tryPickupNearestWorldItem()
          ) {
            event.preventDefault();
          }
          break;
        }
        case "g":
          if (
            !uiBlocksWorldActions &&
            tryDropSelectedHotbarItem(1)
          ) {
            event.preventDefault();
          }
          break;
        case "q":
          if (
            !uiBlocksWorldActions &&
            tryUseSelectedHotbarConsumable()
          ) {
            event.preventDefault();
          }
          break;
        case "c":
          toggleCrafting();
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
  }, [
    enabled,
    isChatOpen,
    isInventoryOpen,
    isMapOpen,
    isShopOpen,
    isSettingsOpen,
    isBankOpen,
    isJobsOpen,
    isPauseMenuOpen,
    isMinimapVisible,
    isCraftingOpen,
    toggleInventory,
    toggleMap,
    toggleChat,
    togglePauseMenu,
    toggleCrafting,
    setPauseMenuOpen,
    setHotbarSelectedSlot,
    setMinimapVisible,
    closeAllModals,
  ]);

  // Handle key up
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled || !event.key) return;
    
    const key = normalizeKeyboardKey(event);

    if (isChatOpen) {
      return;
    }

    keysRef.current.delete(key);

    if (isMovementKey(key)) {
      event.preventDefault();
    }
  }, [enabled, isChatOpen]);

  // Handle mouse click
  const handleMouseClick = useCallback((event: MouseEvent) => {
    if (!enabled) return;
    if (isPauseMenuOpen || isChatOpen) return;

    const uiBlocksWorldActions =
      isInventoryOpen ||
      isMapOpen ||
      isCraftingOpen ||
      isShopOpen ||
      isSettingsOpen ||
      isBankOpen ||
      isJobsOpen;

    // Left click: melee / talar (raycast en ChopRaycastBridge)
    if (event.button === 0 && !uiBlocksWorldActions) {
      if (triggerMeleeClick(event)) {
        event.preventDefault();
      }
    }
  }, [
    enabled,
    isPauseMenuOpen,
    isChatOpen,
    isInventoryOpen,
    isMapOpen,
    isCraftingOpen,
    isShopOpen,
    isSettingsOpen,
    isBankOpen,
    isJobsOpen,
  ]);

  // Calculate movement
  const calculateMovement = useCallback(() => {
    if (!enabled) return;
    
    if (isChatOpen || isPauseMenuOpen) {
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
    const mk = MOVEMENT_KEYS;
    const isRunningKeyPressed = keys.has(mk.run);
    const speed = isRunningKeyPressed ? RUN_SPEED : MOVE_SPEED;

    if (keys.has(mk.forward)) {
      velocity.z -= speed;
      isMoving = true;
    }
    if (keys.has(mk.back)) {
      velocity.z += speed;
      isMoving = true;
    }
    if (keys.has(mk.left)) {
      velocity.x -= speed;
      isMoving = true;
    }
    if (keys.has(mk.right)) {
      velocity.x += speed;
      isMoving = true;
    }

    const isJumping = keys.has(mk.jump);

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
        const stillMoving =
          currentKeys.has(mk.forward) ||
          currentKeys.has(mk.back) ||
          currentKeys.has(mk.left) ||
          currentKeys.has(mk.right);
        const stillRunning = currentKeys.has(mk.run);
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
  }, [
    enabled,
    isChatOpen,
    isPauseMenuOpen,
    position,
    rotation,
    setMoving,
    setRunning,
    setJumping,
    updateVelocity,
  ]);

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

  useEffect(() => {
    if (isPauseMenuOpen || !enabled) {
      keysRef.current.clear();
    }
  }, [isPauseMenuOpen, enabled]);

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
