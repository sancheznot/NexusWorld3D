'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { usePlayerStore } from '@/store/playerStore';
import { useAdvancedMovement } from '@/hooks/useAdvancedMovement';
import { useCannonPhysics } from '@/hooks/useCannonPhysics';
import { useAdminTeleport } from '@/hooks/useAdminTeleport';
import { collisionSystem } from '@/lib/three/collisionSystem';
import AnimatedCharacter from '@/components/world/AnimatedCharacter';
import { useCharacterAnimation, type AnimationState } from '@/hooks/useCharacterAnimation';
import { GAME_CONFIG, computeJumpVelocityForApex } from '@/constants/game';
import * as THREE from 'three';
import { PlayerCustomization } from '@/types/player.types';
import { CharacterStateMachine } from '@/lib/character/CharacterStateMachine';
import { CharacterStateContext } from '@/lib/character/CharacterState';

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
    setRunning
  } = usePlayerStore();
  
  // Ref para detectar cambios de teleportación
  const lastStorePositionRef = useRef(new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z));

  const { calculateMovementInput } = useAdvancedMovement(isCurrentPlayer && keyboardEnabled);
  // Solo el jugador local debe tener physics body
  const physicsRef = useCannonPhysics(isCurrentPlayer);
  // Sistema de teletransportación para admin/desarrollo
  const { isAdminMode, showTeleportHelp } = useAdminTeleport();
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
  const staminaDrainAccRef = useRef(0); // acumula fracciones de drenaje
  const staminaRegenAccRef = useRef(0); // acumula fracciones de regeneración
  const currentAnimation = useCharacterAnimation(input.jumpType);
  
  // Sistema de física de caída (Custom Physics)
  const [fallState, setFallState] = useState<'none' | 'falling' | 'landing'>('none');
  const groundImpactVelocityRef = useRef({ x: 0, y: 0, z: 0 });
  const landingAnimationUntilRef = useRef(0);
  const wasGroundedRef = useRef(true);
  const wasJumpingRef = useRef(false); // Para saber si estamos en un salto intencional
  
  // Edge detection para salto (State Machine)
  const lastJumpInputRef = useRef(false); // Para detectar cuando Space es RECIÉN presionado

  // Sistema de Estados (State Machine) - OPCIONAL
  const stateMachine = useMemo(() => {
    if (!GAME_CONFIG.player.stateMachine.enabled) return null;
    return new CharacterStateMachine(); // Inicia en IdleState por defecto
  }, []);

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
      // console.log('🔧 Sistema de colisiones inicializado');
      // NO precargar animaciones - se cargarán bajo demanda
      
      // Mostrar ayuda de teletransportación si está en modo admin
      if (isAdminMode) {
        // console.log('🚀 MODO ADMIN ACTIVADO - Sistema de teletransportación disponible');
        showTeleportHelp();
      }
    }
  }, [isCurrentPlayer, scene, custom.modelType, isAdminMode, showTeleportHelp]);

  // Detectar cambios de visibilidad de la pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
      console.log(`👁️ Tab visibility: ${!document.hidden}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Efecto para detectar teleportaciones (cambios bruscos de posición en el store)
  useEffect(() => {
    if (!isCurrentPlayer || !physicsRef?.current) return;
    
    const currentStorePos = new THREE.Vector3(playerPosition.x, playerPosition.y, playerPosition.z);
    const distance = currentStorePos.distanceTo(lastStorePositionRef.current);
    
    // Debug: mostrar siempre la distancia para ver qué está pasando
    // console.log(`🔍 Distance check: ${distance.toFixed(2)} (threshold: 2.0)`);
    // console.log(`🔍 Current pos: ${currentStorePos.x.toFixed(2)}, ${currentStorePos.y.toFixed(2)}, ${currentStorePos.z.toFixed(2)}`);
    // console.log(`🔍 Last pos: ${lastStorePositionRef.current.x.toFixed(2)}, ${lastStorePositionRef.current.y.toFixed(2)}, ${lastStorePositionRef.current.z.toFixed(2)}`);
    
    // Si hay un cambio brusco de posición (> 2 unidades), es una teleportación
    if (distance > 2) {
      console.log(`🚀 TELEPORTACIÓN DETECTADA! Distance: ${distance.toFixed(2)}`);
      console.log(`🚀 From: ${lastStorePositionRef.current.x.toFixed(2)}, ${lastStorePositionRef.current.y.toFixed(2)}, ${lastStorePositionRef.current.z.toFixed(2)}`);
      console.log(`🚀 To: ${currentStorePos.x.toFixed(2)}, ${currentStorePos.y.toFixed(2)}, ${currentStorePos.z.toFixed(2)}`);
      
      // Teleportar físicamente al jugador
      physicsRef.current.teleportPlayer(
        { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z },
        { x: playerRotation.x, y: playerRotation.y, z: playerRotation.z }
      );
      
      lastStorePositionRef.current.copy(currentStorePos);
    } else {
      // Debug: mostrar distancia pequeña para ver si hay cambios
      if (distance > 0.1) {
        // console.log(`📍 Movimiento normal: distance=${distance.toFixed(2)}`);
      }
    }
  }, [playerPosition.x, playerPosition.y, playerPosition.z, playerRotation.x, playerRotation.y, playerRotation.z, isCurrentPlayer, physicsRef]);

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
    const clampedDelta = Math.min(delta, GAME_CONFIG.physics.maxDeltaTime);
    
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
    
    // La simulación de Cannon.js ahora se realiza globalmente en CannonStepper
    
    // Manejar saltos con pequeña demora para sincronizar con anim
    const nowMs = performance.now();
    if (physicsRef.current.isGrounded()) {
      wasJumpingRef.current = false; // Ya no estamos saltando
      if (currentInput.isJumping && nowMs >= jumpLockedUntilRef.current) {
        if (jumpApplyAtRef.current === 0) {
          jumpApplyAtRef.current = nowMs + JUMP_APPLY_DELAY_MS;
          jumpAppliedRef.current = false;
        }
        if (!jumpAppliedRef.current && nowMs >= jumpApplyAtRef.current) {
          const pc = GAME_CONFIG.physics.playerCharacter;
          const g = GAME_CONFIG.physics.gravity;
          let apex: number = pc.jumpApexHeightNormal;
          if (currentInput.jumpType === "running") apex = pc.jumpApexHeightRunning;
          else if (currentInput.jumpType === "backflip")
            apex = pc.jumpApexHeightBackflip;
          physicsRef.current.jump(computeJumpVelocityForApex(apex, g));
          jumpAppliedRef.current = true;
          jumpLockedUntilRef.current = nowMs + JUMP_ANIM_DURATION_MS;
          wasJumpingRef.current = true; // Marcar que iniciamos un salto intencional
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

    // Detectar teleportaciones bruscas (para corrección local)
    const newPos = new THREE.Vector3(cannonPosition.x, cannonPosition.y, cannonPosition.z);
    const distSq = newPos.distanceToSquared(lastStorePositionRef.current);
    if (distSq > 0.000001) {
       lastStorePositionRef.current.copy(newPos);
    }

    // Stamina: marcar tiempo de última corrida si estás corriendo
    const now = performance.now();
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
    // Sistema de física de caída mejorado (Updated Physics)
    const velocity = physicsRef.current.getPlayerVelocity();
    const isGrounded = physicsRef.current.isGrounded();
    
    if (!isGrounded) {
      // Personaje en el aire: guardar velocidad para calcular impacto
      groundImpactVelocityRef.current = { x: velocity.x, y: velocity.y, z: velocity.z };
      
      // Si acabamos de despegar Y fue un salto intencional, marcar como cayendo
      if (wasGroundedRef.current && wasJumpingRef.current) {
        setFallState('falling');
      }
      // Si la velocidad Y es muy negativa (cayendo rápido), también marcar como cayendo
      else if (wasGroundedRef.current && velocity.y < -2) {
        setFallState('falling');
      }
      
      wasGroundedRef.current = false;
    } else if (!wasGroundedRef.current) {
      // Acabamos de tocar el suelo después de estar en el aire
      handleLanding(groundImpactVelocityRef.current.y, store);
      wasGroundedRef.current = true;
      wasJumpingRef.current = false;
    }
  });
  
  // Función para manejar el aterrizaje según velocidad de impacto
  const handleLanding = (impactVelocityY: number, store: ReturnType<typeof usePlayerStore.getState>) => {
    const now = performance.now();
    const absImpact = Math.abs(impactVelocityY);
    
    // Determinar tipo de aterrizaje según umbrales configurados
    if (impactVelocityY < GAME_CONFIG.player.fall.hardLandingThreshold) {
      // Caída fuerte: Roll (rodar) - Reduce daño
      setFallState('landing');
      landingAnimationUntilRef.current = now + GAME_CONFIG.player.fall.dropRollingDuration;
      
      // Calcular daño con reducción por roll
      if (absImpact > GAME_CONFIG.gameplay.health.fallDamage.minImpactSpeed) {
        const over = absImpact - GAME_CONFIG.gameplay.health.fallDamage.minImpactSpeed;
        const baseDamage = over * GAME_CONFIG.gameplay.health.fallDamage.damagePerUnitSpeed;
        const reducedDamage = baseDamage * GAME_CONFIG.player.fall.rollDamageReduction;
        store.updateHealth(Math.max(0, Math.floor(store.health - reducedDamage)));
        console.log(`💥 Caída fuerte (roll): ${absImpact.toFixed(2)} m/s, daño reducido: ${reducedDamage.toFixed(1)}`);
      }
    } else if (impactVelocityY < GAME_CONFIG.player.fall.softLandingThreshold) {
      // Caída media: Drop Running (aterrizaje corriendo)
      setFallState('landing');
      landingAnimationUntilRef.current = now + GAME_CONFIG.player.fall.dropRunningDuration;
      
      // Calcular daño normal
      if (absImpact > GAME_CONFIG.gameplay.health.fallDamage.minImpactSpeed) {
        const over = absImpact - GAME_CONFIG.gameplay.health.fallDamage.minImpactSpeed;
        const damage = over * GAME_CONFIG.gameplay.health.fallDamage.damagePerUnitSpeed;
        store.updateHealth(Math.max(0, Math.floor(store.health - damage)));
        console.log(`⚠️ Caída media: ${absImpact.toFixed(2)} m/s, daño: ${damage.toFixed(1)}`);
      }
    } else {
      // Caída suave: Sin animación especial
      setFallState('none');
      console.log(`✅ Caída suave: ${absImpact.toFixed(2)} m/s, sin daño`);
    }
  };

  const getModelPath = () => {
    const gender = custom.modelType === 'woman' ? 'women' : 'men';
    // Usar modelo unificado con todas las animaciones
    return `/models/characters/${gender}/${gender}-all.glb`;
  };

  // Resolver animación final
  let desiredAnim = currentAnimation;
  const nowAnim = performance.now();
  
  // MODO 1: Usar State Machine si está habilitado
  if (GAME_CONFIG.player.stateMachine.enabled && stateMachine && isCurrentPlayer) {
    const velocity = physicsRef.current?.getPlayerVelocity() || { x: 0, y: 0, z: 0 };
    const isGrounded = physicsRef.current?.isGrounded() || true;
    const stamina = usePlayerStore.getState().stamina;
    
    // Edge detection: detectar cuando Space es RECIÉN presionado (no mantenido)
    const jumpPressed = input.isJumping && !lastJumpInputRef.current;
    lastJumpInputRef.current = input.isJumping;
    
    // Convertir input (forward, backward, left, right)
    const stateInput = {
      forward: input.z > 0,
      backward: input.z < 0,
      left: input.x < 0,
      right: input.x > 0,
      run: input.isRunning,
      jump: input.isJumping,      // Si está presionado (puede ser mantenido)
      jumpPressed: jumpPressed,    // Si fue RECIÉN presionado (edge detection)
    };
    
    // Callback para aplicar salto físico (sincroniza State Machine con física)
    const applyJump = (force: number) => {
      if (physicsRef.current && isGrounded) {
        physicsRef.current.jump(force);
        wasJumpingRef.current = true; // Marcar que iniciamos un salto intencional
        console.log(`⚡ Salto físico aplicado: ${force}`);
      }
    };
    
    // Construir contexto actualizado para el State Machine
    const context: CharacterStateContext = {
      input: stateInput,
      isGrounded,
      velocity,
      stamina,
      applyJump, // Pasar callback para aplicar salto físico
    };
    
    // Actualizar State Machine y obtener animación
    const deltaTime = 1/60; // Aproximación, en producción usar delta real
    const stateAnimation = stateMachine.update(deltaTime, context);
    // Mapear nombres de animación a nuestras animaciones
    desiredAnim = stateAnimation as AnimationState;
    
    if (GAME_CONFIG.player.stateMachine.debugLogs) {
      // Los logs ya se hacen en el State Machine
    }
  }
  // MODO 2: Usar lógica actual (sistema que ya funciona bien)
  else {
    // Prioridad 1: Animaciones de aterrizaje (landing)
    if (fallState === 'landing' && nowAnim < landingAnimationUntilRef.current) {
      const impactVelocity = groundImpactVelocityRef.current.y;
      if (impactVelocity < GAME_CONFIG.player.fall.hardLandingThreshold) {
        // Caída fuerte: Roll - Usar 'jump' como placeholder hasta tener animación real
        desiredAnim = 'jump'; // TODO: Cambiar a 'drop_rolling' cuando tengamos la animación
      } else if (impactVelocity < GAME_CONFIG.player.fall.softLandingThreshold) {
        // Caída media: Drop Running - Usar 'walking' como placeholder
        desiredAnim = 'walking'; // TODO: Cambiar a 'drop_running' cuando tengamos la animación
      }
    }
    // Prioridad 2: Animación de caída en el aire
    else if (fallState === 'falling' && !physicsRef.current?.isGrounded() && wasJumpingRef.current) {
      // Solo mostrar animación de salto/caída si fue un salto intencional
      desiredAnim = 'jump'; // TODO: Cambiar a 'falling' cuando tengamos la animación
    }
    // Prioridad 3: Salto
    else if (nowAnim < jumpLockedUntilRef.current) {
      desiredAnim = 'jump';
    }
    // Prioridad 4: Correr
    else if (runAnimStateRef.current) {
      desiredAnim = 'running';
    }
    // Prioridad 5: Caminar o idle
    else {
      const moving = Math.abs(input.x) > 0.05 || Math.abs(input.z) > 0.05;
      desiredAnim = moving ? 'walking' : 'idle';
      
      // Resetear estado de caída si ya terminó la animación
      if (fallState === 'landing' && nowAnim >= landingAnimationUntilRef.current) {
        setFallState('none');
      }
    }
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