/**
 * Estados del Personaje (Sketchbook Integration)
 * 
 * Implementación simplificada de los estados de Sketchbook
 * adaptados a nuestro sistema existente.
 */

import { CharacterState, CharacterStateContext } from '../CharacterState';

/**
 * Estado: Idle (Parado)
 * 
 * El personaje está quieto, sin moverse.
 * Transiciones:
 * - A Walk si presiona dirección
 * - A Jump si presiona salto
 */
export class IdleState extends CharacterState {
  readonly name = 'Idle';
  readonly animation = 'idle';
  
  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    console.log('🧍 Estado: Idle');
  }
  
  update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
    this.updateTimer(deltaTime);
    
    // Transición a salto
    if (context.input.jump && context.isGrounded) {
      return new JumpState();
    }
    
    // Transición a movimiento
    if (this.anyDirection(context.input)) {
      if (context.input.run && context.stamina >= 10) {
        return new SprintState();
      } else {
        return new WalkState();
      }
    }
    
    // Transición a caída si no está en el suelo
    if (!context.isGrounded && context.velocity.y < -1) {
      return new FallingState();
    }
    
    return null; // Mantener estado actual
  }
}

/**
 * Estado: Walk (Caminando)
 * 
 * El personaje está caminando.
 * Transiciones:
 * - A Idle si suelta dirección
 * - A Sprint si presiona correr
 * - A Jump si presiona salto
 */
export class WalkState extends CharacterState {
  readonly name = 'Walk';
  readonly animation = 'walking';
  
  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    console.log('🚶 Estado: Walk');
  }
  
  update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
    this.updateTimer(deltaTime);
    
    // Transición a salto
    if (context.input.jump && context.isGrounded) {
      return new JumpState();
    }
    
    // Transición a sprint
    if (context.input.run && context.stamina >= 10) {
      return new SprintState();
    }
    
    // Transición a idle
    if (this.noDirection(context.input)) {
      return new IdleState();
    }
    
    // Transición a caída
    if (!context.isGrounded && context.velocity.y < -1) {
      return new FallingState();
    }
    
    return null;
  }
}

/**
 * Estado: Sprint (Corriendo)
 * 
 * El personaje está corriendo.
 * Transiciones:
 * - A Walk si suelta correr o se queda sin stamina
 * - A Idle si suelta dirección
 * - A Jump si presiona salto
 */
export class SprintState extends CharacterState {
  readonly name = 'Sprint';
  readonly animation = 'running';
  
  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    console.log('🏃 Estado: Sprint');
  }
  
  update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
    this.updateTimer(deltaTime);
    
    // Transición a salto
    if (context.input.jump && context.isGrounded) {
      return new JumpState();
    }
    
    // Transición a walk si suelta correr o sin stamina
    if (!context.input.run || context.stamina <= 0) {
      return new WalkState();
    }
    
    // Transición a idle
    if (this.noDirection(context.input)) {
      return new IdleState();
    }
    
    // Transición a caída
    if (!context.isGrounded && context.velocity.y < -1) {
      return new FallingState();
    }
    
    return null;
  }
}

/**
 * Estado: Jump (Saltando)
 * 
 * El personaje está en el aire por un salto intencional.
 * IMPORTANTE: Este estado dura 1.5s completos para que la animación se vea
 * Transiciones:
 * - Mantiene 'jump' por 1.5s (igual que sistema actual)
 * - Luego transiciona según si está en suelo o aire
 */
export class JumpState extends CharacterState {
  readonly name = 'Jump';
  readonly animation = 'jump';
  
  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    this.animationLength = 1.5; // CRÍTICO: Duración completa de animación (igual que JUMP_ANIM_DURATION_MS)
    console.log('🦘 Estado: Jump (1.5s bloqueado)');
  }
  
  update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
    this.updateTimer(deltaTime);
    
    // MANTENER estado Jump por 1.5s completos (igual que sistema actual)
    // Esto permite que la animación se vea completa sin parpadeos
    if (this.animationLength && this.timer < this.animationLength) {
      return null; // Mantener Jump
    }
    
    // Después de 1.5s, transicionar según estado
    if (context.isGrounded) {
      return new LandingState();
    } else {
      return new FallingState();
    }
  }
}

/**
 * Estado: Falling (Cayendo)
 * 
 * El personaje está cayendo.
 * Transiciones:
 * - A Landing cuando toca el suelo
 */
export class FallingState extends CharacterState {
  readonly name = 'Falling';
  readonly animation = 'jump'; // Usar jump como placeholder
  
  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    console.log('🪂 Estado: Falling');
  }
  
  update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
    this.updateTimer(deltaTime);
    
    // Transición a landing cuando toca el suelo
    if (context.isGrounded) {
      return new LandingState();
    }
    
    return null;
  }
}

/**
 * Estado: Landing (Aterrizando)
 * 
 * El personaje acaba de tocar el suelo.
 * IMPORTANTE: NO permite saltar hasta que termine la animación (igual que sistema actual)
 * Transiciones automáticas según velocidad de impacto y input.
 */
export class LandingState extends CharacterState {
  readonly name = 'Landing';
  readonly animation = 'idle'; // Por ahora idle, después drop_running/roll
  
  private impactVelocity: number = 0;
  
  onEnter(context: CharacterStateContext): void {
    this.timer = 0;
    this.impactVelocity = Math.abs(context.velocity.y);
    
    // Determinar duración según impacto (igual que sistema actual)
    if (this.impactVelocity > 6) {
      this.animationLength = 1.2; // Roll (dropRollingDuration = 1200ms)
      console.log('💥 Estado: Landing (Roll - 1.2s bloqueado)');
    } else if (this.impactVelocity > 2) {
      this.animationLength = 0.8; // Drop running (dropRunningDuration = 800ms)
      console.log('⚠️ Estado: Landing (Drop - 0.8s bloqueado)');
    } else {
      this.animationLength = 0.3; // Landing suave (300ms mínimo para que se vea)
      console.log('✅ Estado: Landing (Suave - 0.3s)');
    }
  }
  
  update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
    this.updateTimer(deltaTime);
    
    // BLOQUEAR salto hasta que termine la animación (igual que sistema actual)
    // El sistema actual NO permite saltar mientras landingAnimationUntilRef > now
    if (this.animationLength && this.timer < this.animationLength) {
      return null; // Mantener Landing bloqueado
    }
    
    // Después de la animación, transicionar según input
    if (context.input.jump) {
      return new JumpState();
    }
    
    // Transición según input
    if (this.anyDirection(context.input)) {
      if (context.input.run && context.stamina >= 10) {
        return new SprintState();
      } else {
        return new WalkState();
      }
    } else {
      return new IdleState();
    }
  }
}

