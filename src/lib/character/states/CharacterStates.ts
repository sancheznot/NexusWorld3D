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
  
  onEnter(context: CharacterStateContext): void {
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
  
  onEnter(context: CharacterStateContext): void {
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
  
  onEnter(context: CharacterStateContext): void {
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
 * Transiciones:
 * - A Falling cuando empieza a caer (velocidad Y negativa)
 * - A Landing cuando toca el suelo
 */
export class JumpState extends CharacterState {
  readonly name = 'Jump';
  readonly animation = 'jump';
  
  onEnter(context: CharacterStateContext): void {
    this.timer = 0;
    this.animationLength = 1.5; // Duración completa de animación de salto
    console.log('🦘 Estado: Jump');
  }
  
  update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
    this.updateTimer(deltaTime);
    
    // Transición a landing si toca el suelo (aterrizaje rápido)
    if (context.isGrounded && this.timer > 0.2) {
      return new LandingState();
    }
    
    // Transición a falling solo cuando empieza a caer (velocidad Y negativa)
    // Y ha pasado suficiente tiempo para la animación de impulso
    if (context.velocity.y < -1 && this.timer > 0.5) {
      return new FallingState();
    }
    
    return null;
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
  
  onEnter(context: CharacterStateContext): void {
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
 * Transiciones automáticas según velocidad de impacto y input.
 */
export class LandingState extends CharacterState {
  readonly name = 'Landing';
  readonly animation = 'idle'; // Por ahora idle, después drop_running/roll
  
  private impactVelocity: number = 0;
  
  onEnter(context: CharacterStateContext): void {
    this.timer = 0;
    this.impactVelocity = Math.abs(context.velocity.y);
    
    // Determinar duración según impacto
    if (this.impactVelocity > 6) {
      this.animationLength = 1.2; // Roll
      console.log('💥 Estado: Landing (Roll)');
    } else if (this.impactVelocity > 2) {
      this.animationLength = 0.8; // Drop running
      console.log('⚠️ Estado: Landing (Drop)');
    } else {
      this.animationLength = 0.1; // Landing suave
      console.log('✅ Estado: Landing (Suave)');
    }
  }
  
  update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
    this.updateTimer(deltaTime);
    
    // Esperar a que termine la animación
    if (!this.animationEnded(deltaTime)) {
      return null;
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

