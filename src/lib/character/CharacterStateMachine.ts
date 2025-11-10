/**
 * CharacterStateMachine
 * 
 * Administra el estado actual del personaje y las transiciones entre estados.
 */

import { CharacterState, CharacterStateContext } from './CharacterState';
import { IdleState } from './states/CharacterStates';

export class CharacterStateMachine {
  private currentState: CharacterState;
  
  constructor(initialState?: CharacterState) {
    this.currentState = initialState || new IdleState();
  }
  
  /**
   * Actualizar la máquina de estados
   * @returns Nombre de la animación actual
   */
  update(deltaTime: number, context: CharacterStateContext): string {
    // Llamar a onEnter si el estado acaba de cambiar
    if (!this.currentState['_entered']) {
      this.currentState.onEnter(context);
      this.currentState['_entered'] = true;
    }
    
    // Actualizar el estado actual
    const newState = this.currentState.update(deltaTime, context);
    
    // Si hay transición a nuevo estado
    if (newState) {
      this.transitionTo(newState);
    }
    
    // Retornar la animación del estado actual
    return this.currentState.animation;
  }
  
  /**
   * Transicionar a un nuevo estado
   */
  private transitionTo(newState: CharacterState): void {
    // Llamar a onExit del estado actual
    this.currentState.onExit();
    
    // Cambiar al nuevo estado
    this.currentState = newState;
    this.currentState['_entered'] = false;
    
    console.log(`🔄 Transición: ${this.currentState.name}`);
  }
  
  /**
   * Obtener el estado actual
   */
  getCurrentState(): CharacterState {
    return this.currentState;
  }
  
  /**
   * Obtener el nombre del estado actual
   */
  getCurrentStateName(): string {
    return this.currentState.name;
  }
  
  /**
   * Forzar un cambio de estado (útil para eventos externos)
   */
  forceState(newState: CharacterState): void {
    this.transitionTo(newState);
  }
}

