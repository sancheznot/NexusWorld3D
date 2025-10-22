'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '@/store/playerStore';
import { useAdvancedMovement } from '@/hooks/useAdvancedMovement';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { collisionSystem } from '@/lib/three/collisionSystem';
import AnimatedCharacter from '@/components/world/AnimatedCharacter';
import { useCharacterAnimation } from '@/hooks/useCharacterAnimation';
import { PHYSICS_CONFIG } from '@/constants/physics';
import { GAME_CONFIG } from '@/constants/game';
import * as THREE from 'three';
import { PlayerCustomization } from '@/types/player.types';

interface PlayerProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isCurrentPlayer?: boolean;
  keyboardEnabled?: boolean;
  customization?: PlayerCustomization;
  username?: string;
  remoteAnimation?: string; // animación enviada desde servidor para jugadores remotos
}

export default function PlayerV2({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  isCurrentPlayer = false,
  keyboardEnabled = true,
  customization,
  username,
  remoteAnimation,
}: PlayerProps) {
  const lastPositionRef = useRef(new THREE.Vector3(...position));
  const { scene } = useThree();
  
  const { 
    position: playerPosition, 
    rotation: playerRotation,
    updatePosition,
    updateRotation,
    setMoving,
    setRunning,
    updateHealth,
    updateStamina,
    updateHunger
  } = usePlayerStore();

  const { calculateMovementInput } = useAdvancedMovement(isCurrentPlayer && keyboardEnabled);
  // Solo el jugador local debe tener physics body
  const physicsRef = useCannonPhysics(isCurrentPlayer);
  const [input, setInput] = useState({ x: 0, z: 0, rotation: 0, isRunning: false, isJumping: false, jumpType: null as 'normal' | 'running' | 'backflip' | null });
  const [isTabVisible, setIsTabVisible] = useState(true);
  const lastRunTimeRef = useRef(0);
// Control de sesión de sprint: bloquea regeneración mientras Shift esté presionado
  const sprintHeldRef = useRef(false);
  const sprintSessionIdRef = useRef(0);
  const sprintCooldownUntilRef = useRef(0); // cooldown tras llegar a 0 stamina
  const sprintActiveRef = useRef(false); // sprint realmente en curso (consume stamina)
  const tiredUntilRef = useRef(0); // bloquea iniciar sprint hasta descansar
  // Bloqueo de salto para sincronizar con animación
  const jumpLockedUntilRef = useRef(0);
  const JUMP_ANIM_DURATION_MS = 1500; // duración de anim de salto (~1.5s)
  const JUMP_APPLY_DELAY_MS = 200; // pequeña demora para que la animación suba
  const jumpApplyAtRef = useRef(0);
  const jumpAppliedRef = useRef(false);
 
  const runAnimStateRef = useRef(false);
  const lastHungerTickRef = useRef(0);
  const lastGroundYVelRef = useRef(0);
  const staminaDrainAccRef = useRef(0); // acumula fracciones de drenaje
  const staminaRegenAccRef = useRef(0); // acumula fracciones de regeneración
  const currentAnimation = useCharacterAnimation(input.jumpType);

  const defaultCustomization: PlayerCustomization = {
    bodyColor: '#007bff',
    headColor: '#ffdbac',
    eyeColor: '#000000',
    bodyType: 'normal',
    headType: 'normal',
    height: 1.0,
    modelType: 'men',
    customBaseModel: 'men',
  };

  const custom = customization || defaultCustomization;

  useEffect(() => {
    if (isCurrentPlayer) {
      collisionSystem.registerSceneColliders(scene);
      console.log('🔧 Sistema de colisiones inicializado');
      // NO precargar animaciones - se cargarán bajo demanda
    }
  }, [isCurrentPlayer, scene, custom.modelType]);

  // Detectar cambios de visibilidad de la pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
      console.log(`👁️ Tab visibility: ${!document.hidden}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useFrame((state, delta) => {
    // Solo el jugador local debe ejecutar useFrame
    if (!isCurrentPlayer) return;
    
    if (!physicsRef || !physicsRef.current) {
      console.log('⚠️ PlayerV2 useFrame: physicsRef.current is null');
      return;
    }
    
    if (!isTabVisible) {
      console.log('⚠️ PlayerV2 useFrame: tab not visible');
      return;
    }
    
    // Calcular input en useFrame, no durante el renderizado
    const currentInput = calculateMovementInput();
    setInput(currentInput);
    // Actualizar estado de tecla Shift (sesión de sprint)
    if (currentInput.isRunning && !sprintHeldRef.current) {
      sprintSessionIdRef.current += 1; // nueva sesión
    }
    sprintHeldRef.current = currentInput.isRunning;
    // Si está en periodo de cansancio, ignorar Shift para todo (evita animación de correr)
    if (performance.now() < tiredUntilRef.current) {
      sprintHeldRef.current = false;
    }
    
    // Limitar delta con timestep fijo de física
    const clampedDelta = Math.min(delta, PHYSICS_CONFIG.MAX_DELTA_TIME);
    
    // Determinar estado de sprint (inicio/fin) y aplicar movimiento
    if (physicsRef.current) {
      const store = usePlayerStore.getState();
      const wantsToMove = (currentInput.x !== 0 || currentInput.z !== 0);
      const cooldownActive = performance.now() < sprintCooldownUntilRef.current;
      const restLockActive = performance.now() < tiredUntilRef.current;
      const canStartSprint = (!cooldownActive && !restLockActive && sprintHeldRef.current && wantsToMove && store.stamina >= 10);
      // Arranque de sprint
      if (!sprintActiveRef.current && canStartSprint) {
        sprintActiveRef.current = true;
      }
      // Terminar sprint por condiciones
      if (sprintActiveRef.current && (!sprintHeldRef.current || !wantsToMove || store.stamina <= 0)) {
        sprintActiveRef.current = false;
        if (store.stamina <= 0) {
          const nowMs = performance.now();
          sprintCooldownUntilRef.current = Math.max(sprintCooldownUntilRef.current, nowMs + 1000);
          // calcular tiempo mínimo para volver a 10 (delay + tiempo de regen)
          const lockMs = GAME_CONFIG.gameplay.stamina.regenDelayMs + Math.ceil(10 / GAME_CONFIG.gameplay.stamina.regenPerSecond) * 1000;
          tiredUntilRef.current = Math.max(tiredUntilRef.current, nowMs + lockMs);
        }
      }
      physicsRef.current.updateMovement({
        x: currentInput.x,
        z: currentInput.z,
        isRunning: sprintActiveRef.current,
        stamina: store.stamina
      }, clampedDelta);
    }
    
    // Actualizar física de Cannon.js (esto mueve el cuerpo con la velocidad aplicada)
    if (physicsRef.current) {
      physicsRef.current.update(clampedDelta);
    }
    
    // Manejar saltos con pequeña demora para sincronizar con anim
    const nowMs = performance.now();
    if (physicsRef.current.isGrounded()) {
      if (currentInput.isJumping && nowMs >= jumpLockedUntilRef.current) {
        if (jumpApplyAtRef.current === 0) {
          jumpApplyAtRef.current = nowMs + JUMP_APPLY_DELAY_MS;
          jumpAppliedRef.current = false;
        }
        if (!jumpAppliedRef.current && nowMs >= jumpApplyAtRef.current) {
          let jumpForce = 6;
          if (currentInput.jumpType === 'running') jumpForce = 6.5;
          else if (currentInput.jumpType === 'backflip') jumpForce = 7.2;
          physicsRef.current.jump(jumpForce);
          jumpAppliedRef.current = true;
          jumpLockedUntilRef.current = nowMs + JUMP_ANIM_DURATION_MS;
        }
      }
      if (!currentInput.isJumping && nowMs > jumpLockedUntilRef.current) {
        jumpApplyAtRef.current = 0;
        jumpAppliedRef.current = false;
      }
    }
    
    // Obtener posición de Cannon.js y sincronizar con el store
    const cannonPosition = physicsRef.current.getPlayerPosition();
    
    // Actualizar store (para HUD y networking) y que AnimatedCharacter reciba por props
    updatePosition({ x: cannonPosition.x, y: cannonPosition.y, z: cannonPosition.z });

    // Stamina: marcar tiempo de última corrida si estás corriendo
    const now = performance.now();
    const store = usePlayerStore.getState();
    const isActuallyRunning = sprintActiveRef.current;
    
    if (isActuallyRunning) {
      lastRunTimeRef.current = now;
    }

    // Actualizar estados de animación
    const isMoving = currentInput.x !== 0 || currentInput.z !== 0;
    setMoving(isMoving);
    // Reglas de animación: bloquear correr también bajo cooldown/cansancio
    const staminaNow = usePlayerStore.getState().stamina;
    const nowAnim = performance.now();
    const lock = (nowAnim < sprintCooldownUntilRef.current) || (nowAnim < tiredUntilRef.current);
    if (!runAnimStateRef.current) {
      if (sprintActiveRef.current && !lock) runAnimStateRef.current = true;
    } else {
      if (!sprintActiveRef.current || staminaNow <= 0 || lock) runAnimStateRef.current = false;
    }
    setRunning(runAnimStateRef.current);

    // Rotar personaje siempre hacia la dirección de movimiento o cámara
    const targetRotation = currentInput.rotation;
    updateRotation({ x: 0, y: targetRotation, z: 0 });

    const currentPosition = new THREE.Vector3(cannonPosition.x, cannonPosition.y, cannonPosition.z);
    const distance = currentPosition.distanceTo(lastPositionRef.current);
    
    // Debug (comentado para no llenar la consola)
    // if (distance > 0.1 || currentInput.isJumping || Math.abs(cannonVelocity.y) > 0.1) {
    //   console.log(`🎮 Cannon Physics: pos=${cannonPosition.x.toFixed(2)}, ${cannonPosition.y.toFixed(2)}, ${cannonPosition.z.toFixed(2)}, vel=${cannonVelocity.x.toFixed(2)}, ${cannonVelocity.y.toFixed(2)}, ${cannonVelocity.z.toFixed(2)}, jump=${currentInput.isJumping}, jumpType=${currentInput.jumpType}, isGrounded=${physicsRef.current.isGrounded()}`);
    //   lastPositionRef.current.copy(currentPosition);
    // }
    if (distance > 0.1) {
      lastPositionRef.current.copy(currentPosition);
    }
  });

  // Ticks de stamina/hambre y daño por caída
  useFrame((_, delta) => {
    if (!isCurrentPlayer || !physicsRef.current) return;
    const store = usePlayerStore.getState();

    // Stamina con acumuladores para evitar saltos por frame
    const now = performance.now();
    // Intento de correr basado en tecla Shift, no en stamina
    const sprintHeld = sprintHeldRef.current;
    // solo drenamos cuando el sprint está activo (no bajo 10 ni en cooldown/lock)
    const isTryingToRun = sprintActiveRef.current;
    
    if (isTryingToRun) {
      // Drenar stamina si estás intentando correr (hasta llegar a 0)
      const drain = GAME_CONFIG.gameplay.stamina.runDrainPerSecond * delta;
      staminaDrainAccRef.current += drain;
      if (staminaDrainAccRef.current >= 1) {
        const points = Math.floor(staminaDrainAccRef.current);
        staminaDrainAccRef.current -= points;
        const next = Math.max(0, store.stamina - points);
        store.updateStamina(next);
        
        // Si seguimos intentando correr, no permitir regenerar hasta soltar Shift
        lastRunTimeRef.current = now;
        // Si llegamos a 0, iniciar cooldown de sprint de 1s
        if (next <= 0 && sprintCooldownUntilRef.current < now + 1000) {
          sprintCooldownUntilRef.current = now + 1000;
          const lockMs = GAME_CONFIG.gameplay.stamina.regenDelayMs + Math.ceil(10 / GAME_CONFIG.gameplay.stamina.regenPerSecond) * 1000;
          tiredUntilRef.current = Math.max(tiredUntilRef.current, now + lockMs);
        }
      }
      // corriendo: no acumulamos regen
      staminaRegenAccRef.current = 0;
    } else {
      // regeneración tras delay
      // Bloquear regeneración mientras se mantenga presionado Shift (sesión activa)
      if (!sprintHeld && (now - lastRunTimeRef.current > GAME_CONFIG.gameplay.stamina.regenDelayMs)) {
        const regen = GAME_CONFIG.gameplay.stamina.regenPerSecond * delta;
        staminaRegenAccRef.current += regen;
        if (staminaRegenAccRef.current >= 1) {
          const points = Math.floor(staminaRegenAccRef.current);
          staminaRegenAccRef.current -= points;
          store.updateStamina(Math.min(store.maxStamina, store.stamina + points));
        }
      }
      // no corremos: limpiar drenaje
      staminaDrainAccRef.current = 0;
    }
    // Hambre
    const hungerTickEvery = 60 / GAME_CONFIG.gameplay.hunger.drainPerMinute; // seconds per point
    if (performance.now() - lastHungerTickRef.current > hungerTickEvery * 1000) {
      lastHungerTickRef.current = performance.now();
      store.updateHunger(Math.max(0, store.hunger - 1));
    }
    if (store.hunger <= 0) {
      const dmg = GAME_CONFIG.gameplay.hunger.starvationDamagePerSecond * delta;
      store.updateHealth(Math.max(0, Math.floor(store.health - dmg)));
    }
    // Daño por caída
    const vy = physicsRef.current.getPlayerVelocity().y;
    if (physicsRef.current.isGrounded()) {
      if (lastGroundYVelRef.current < -GAME_CONFIG.gameplay.health.fallDamage.minImpactSpeed) {
        const over = Math.abs(lastGroundYVelRef.current) - GAME_CONFIG.gameplay.health.fallDamage.minImpactSpeed;
        const damage = over * GAME_CONFIG.gameplay.health.fallDamage.damagePerUnitSpeed;
        store.updateHealth(Math.max(0, Math.floor(store.health - damage)));
      }
      lastGroundYVelRef.current = 0;
    } else {
      lastGroundYVelRef.current = vy;
    }
  });

  const getModelPath = () => {
    const gender = custom.modelType === 'woman' ? 'women' : 'men';
    // Usar modelo unificado con todas las animaciones
    return `/models/characters/${gender}/${gender}-all.glb`;
  };

  // Resolver animación final incluyendo Walk Backward (S)
  let desiredAnim = currentAnimation;
  const nowAnim = performance.now();
  if (nowAnim < jumpLockedUntilRef.current) {
    desiredAnim = 'jump';
  } else if (runAnimStateRef.current) {
    desiredAnim = 'running';
  } else {
    const moving = Math.abs(input.x) > 0.05 || Math.abs(input.z) > 0.05;
    desiredAnim = moving ? 'walking' : 'idle';
  }

  return (
    <AnimatedCharacter
      modelPath={getModelPath()}
      position={isCurrentPlayer ? [playerPosition.x, playerPosition.y, playerPosition.z] : position}
      rotation={isCurrentPlayer ? [playerRotation.x, playerRotation.y, playerRotation.z] : rotation}
      scale={[1, 1, 1]}
      isCurrentPlayer={isCurrentPlayer}
      username={username || ''}
      animation={isCurrentPlayer ? desiredAnim : (remoteAnimation || 'idle')}
    />
  );
}