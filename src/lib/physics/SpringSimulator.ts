/**
 * Simulador de resorte para movimientos suaves y físicos
 * Basado en simulaciones físicas estándar
 *
 * Útil para:
 * - Dirección de vehículos
 * - Animaciones suaves
 * - Cualquier movimiento que necesite inercia física
 */
export class SpringSimulator {
  public position: number = 0;
  public velocity: number = 0;
  public target: number = 0;

  private mass: number;
  private damping: number;
  private frequency: number;

  /**
   * Crea un nuevo simulador de resorte
   *
   * @param frequency - Frecuencia del resorte (Hz) - Mayor = más rápido de responder
   * @param damping - Amortiguación - Mayor = menos oscilación (más suave)
   * @param mass - Masa - Mayor = más inercia (más lento)
   *
   * Ejemplos de configuración:
   * - Dirección de vehículo: (60, 10, 0.6) - Rápido y suave
   * - Cámara: (30, 8, 1.0) - Más suave y cinematográfico
   * - UI: (100, 15, 0.5) - Muy rápido y responsivo
   */
  constructor(frequency: number = 60, damping: number = 10, mass: number = 1) {
    this.frequency = frequency;
    this.damping = damping;
    this.mass = mass;
  }

  /**
   * Simula un paso de tiempo del resorte
   *
   * @param timeStep - Delta time en segundos (normalmente 1/60 = 0.0166)
   */
  public simulate(timeStep: number): void {
    // Calcular la fuerza del resorte: F = k * (target - position)
    // donde k es la constante del resorte (frequency)
    const springForce = (this.target - this.position) * this.frequency;

    // Calcular la fuerza de amortiguación: F = -damping * velocity
    const dampingForce = -this.velocity * this.damping;

    // Fuerza total
    const totalForce = springForce + dampingForce;

    // Calcular aceleración: F = m * a -> a = F / m
    const acceleration = totalForce / this.mass;

    // Integrar velocidad: v = v + a * dt
    this.velocity += acceleration * timeStep;

    // Integrar posición: p = p + v * dt
    this.position += this.velocity * timeStep;
  }

  /**
   * Reinicia el simulador a cero
   */
  public reset(): void {
    this.position = 0;
    this.velocity = 0;
    this.target = 0;
  }

  /**
   * Establece posición y target instantáneamente (sin animación)
   * Útil para inicializar o teleportar
   *
   * @param value - Valor a establecer
   */
  public init(value: number): void {
    this.position = value;
    this.velocity = 0;
    this.target = value;
  }

  /**
   * Obtiene el progreso hacia el target (0-1)
   * Útil para saber cuándo el resorte ha "terminado" de moverse
   *
   * @param threshold - Distancia mínima para considerar "llegado" (default: 0.01)
   * @returns true si está cerca del target
   */
  public isAtRest(threshold: number = 0.01): boolean {
    return (
      Math.abs(this.target - this.position) < threshold &&
      Math.abs(this.velocity) < threshold
    );
  }

  /**
   * Ajusta los parámetros del resorte en tiempo real
   *
   * @param frequency - Nueva frecuencia
   * @param damping - Nueva amortiguación
   * @param mass - Nueva masa
   */
  public setParameters(
    frequency?: number,
    damping?: number,
    mass?: number
  ): void {
    if (frequency !== undefined) this.frequency = frequency;
    if (damping !== undefined) this.damping = damping;
    if (mass !== undefined) this.mass = mass;
  }
}
