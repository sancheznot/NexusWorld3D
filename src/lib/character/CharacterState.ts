/**
 * Sistema de Estados del Personaje (Sketchbook Integration)
 * 
 * Clase base para todos los estados del personaje.
 * Cada estado controla el comportamiento, animaciones y transiciones.
 * 
 * Basado en: Sketchbook CharacterStateBase
 * Referencia: docs/Sketchbook/character/character-state/CharacterStateBase.md
 */

export interface CharacterInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  jump: boolean;          // Si está presionado (puede ser mantenido)
  jumpPressed?: boolean;  // Si fue RECIÉN presionado (edge detection)
}

export interface CharacterStateContext {
  input: CharacterInput;
  isGrounded: boolean;
  velocity: { x: number; y: number; z: number };
  stamina: number;
}

/**
 * Clase base abstracta para estados del personaje
 */
export abstract class CharacterState {
  protected timer: number = 0;
  protected animationLength?: number;
  public _entered: boolean = false; // Flag interno para StateMachine
  
  /**
   * Nombre del estado (para debugging)
   */
  abstract readonly name: string;
  
  /**
   * Animación asociada al estado
   */
  abstract readonly animation: string;
  
  /**
   * Llamado cuando se entra al estado
   */
  abstract onEnter(context: CharacterStateContext): void;
  
  /**
   * Llamado cada frame mientras el estado está activo
   * @returns Nuevo estado si hay transición, o null para mantener el actual
   */
  abstract update(deltaTime: number, context: CharacterStateContext): CharacterState | null;
  
  /**
   * Llamado cuando se sale del estado
   */
  onExit(): void {
    // Por defecto no hace nada
  }
  
  /**
   * Incrementar el timer interno
   */
  protected updateTimer(deltaTime: number): void {
    this.timer += deltaTime;
  }
  
  /**
   * Verificar si el jugador está presionando alguna dirección
   */
  protected anyDirection(input: CharacterInput): boolean {
    return input.forward || input.backward || input.left || input.right;
  }
  
  /**
   * Verificar si el jugador NO está presionando ninguna dirección
   */
  protected noDirection(input: CharacterInput): boolean {
    return !this.anyDirection(input);
  }
  
  /**
   * Verificar si la animación ha terminado
   */
  protected animationEnded(deltaTime: number): boolean {
    if (this.animationLength === undefined) {
      console.warn(`${this.name}: animationLength not set`);
      return false;
    }
    return this.timer > this.animationLength - deltaTime;
  }
}

