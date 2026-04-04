/**
 * Estados del Personaje (Character State Interface)
 *
 * Implementación simplificada de los estados de personaje
 * adaptados a nuestro sistema existente.
 */

import { CharacterState, CharacterStateContext } from "../CharacterState";
import { getAnimationDuration } from "@/hooks/useAnimationDurations";
import { GAME_CONFIG, computeJumpVelocityForApex } from "@/constants/game";

/**
 * Estado: Idle (Parado)
 *
 * El personaje está quieto, sin moverse.
 * Transiciones:
 * - A Walk si presiona dirección
 * - A Jump si presiona salto
 */
export class IdleState extends CharacterState {
  readonly name = "Idle";
  readonly animation = "idle";

  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    console.log("🧍 Estado: Idle");
  }

  update(
    deltaTime: number,
    context: CharacterStateContext
  ): CharacterState | null {
    this.updateTimer(deltaTime);

    // Transición a salto - SOLO si es un NUEVO input (jumpPressed)
    if (context.input.jumpPressed && context.isGrounded) {
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
  readonly name = "Walk";
  readonly animation = "walking";

  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    console.log("🚶 Estado: Walk");
  }

  update(
    deltaTime: number,
    context: CharacterStateContext
  ): CharacterState | null {
    this.updateTimer(deltaTime);

    // Transición a salto - SOLO si es un NUEVO input (jumpPressed)
    if (context.input.jumpPressed && context.isGrounded) {
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
  readonly name = "Sprint";
  readonly animation = "running";

  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    console.log("🏃 Estado: Sprint");
  }

  update(
    deltaTime: number,
    context: CharacterStateContext
  ): CharacterState | null {
    this.updateTimer(deltaTime);

    // Transición a salto - SOLO si es un NUEVO input (jumpPressed)
    if (context.input.jumpPressed && context.isGrounded) {
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
 * NO SE CANCELA aunque sueltes Space - la animación debe completarse
 * Transiciones:
 * - Mantiene 'jump' por 1.5s COMPLETOS (ignora input)
 * - Luego transiciona según si está en suelo o aire
 */
export class JumpState extends CharacterState {
  readonly name = "Jump";
  readonly animation = "jump";

  onEnter(context: CharacterStateContext): void {
    this.timer = 0;
    // Usar duración REAL de la animación del modelo
    this.animationLength = getAnimationDuration("jump");
    console.log(
      `🦘 Estado: Jump (${this.animationLength.toFixed(
        2
      )}s bloqueado - NO CANCELABLE)`
    );

    // APLICAR SALTO FÍSICO (sincronizar animación con física)
    if (context.applyJump) {
      const apex = GAME_CONFIG.physics.playerCharacter.jumpApexHeightNormal;
      const vy = computeJumpVelocityForApex(
        apex,
        GAME_CONFIG.physics.gravity
      );
      context.applyJump(vy);
    }
  }

  update(
    deltaTime: number,
    context: CharacterStateContext
  ): CharacterState | null {
    this.updateTimer(deltaTime);

    // MANTENER estado Jump por 1.5s completos (igual que sistema actual)
    // IGNORA completamente el input - la animación DEBE completarse
    // Esto previene:
    // 1. Cancelación prematura si sueltas Space
    // 2. Repetición de animación si mantienes Space
    if (this.animationLength && this.timer < this.animationLength) {
      return null; // Mantener Jump - NO CANCELABLE
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
  readonly name = "Falling";
  readonly animation = "jump"; // Usar jump como placeholder

  onEnter(_context: CharacterStateContext): void {
    this.timer = 0;
    console.log("🪂 Estado: Falling");
  }

  update(
    deltaTime: number,
    context: CharacterStateContext
  ): CharacterState | null {
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
  readonly name = "Landing";
  readonly animation = "idle"; // Por ahora idle, después drop_running/roll

  private impactVelocity: number = 0;

  onEnter(context: CharacterStateContext): void {
    this.timer = 0;
    this.impactVelocity = Math.abs(context.velocity.y);

    // Determinar duración según impacto - Usar duraciones REALES de animaciones
    if (this.impactVelocity > 6) {
      // Roll - usar duración real de la animación
      this.animationLength = getAnimationDuration("dropRolling");
      console.log(
        `💥 Estado: Landing (Roll - ${this.animationLength.toFixed(
          2
        )}s bloqueado)`
      );
    } else if (this.impactVelocity > 2) {
      // Drop running - usar duración real de la animación
      this.animationLength = getAnimationDuration("dropRunning");
      console.log(
        `⚠️ Estado: Landing (Drop - ${this.animationLength.toFixed(
          2
        )}s bloqueado)`
      );
    } else {
      // Landing suave - usar duración real o mínimo 0.3s
      this.animationLength = Math.max(getAnimationDuration("landing"), 0.3);
      console.log(
        `✅ Estado: Landing (Suave - ${this.animationLength.toFixed(2)}s)`
      );
    }
  }

  update(
    deltaTime: number,
    context: CharacterStateContext
  ): CharacterState | null {
    this.updateTimer(deltaTime);

    // BLOQUEAR salto hasta que termine la animación (igual que sistema actual)
    // El sistema actual NO permite saltar mientras landingAnimationUntilRef > now
    if (this.animationLength && this.timer < this.animationLength) {
      return null; // Mantener Landing bloqueado
    }

    // Después de la animación, transicionar según input
    // IMPORTANTE: Usar jumpPressed (no jump) para evitar saltos repetidos al mantener Space
    if (context.input.jumpPressed) {
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
