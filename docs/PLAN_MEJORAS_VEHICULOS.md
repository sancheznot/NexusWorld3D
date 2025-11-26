# 🚗 Plan de Mejoras: Física de Vehículos

## 🎯 Objetivo General
Mejorar gradualmente la física de vehículos integrando las mejores prácticas de Sketchbook **sin romper** el código existente.

---

## 📋 Checklist de Mejoras

### ✅ Fase 1: Mejoras Rápidas (1-2 días)
- [ ] 1.1 Implementar SpringSimulator para dirección suave
- [ ] 1.2 Mejorar curva de torque del motor
- [ ] 1.3 Agregar física de aire (air spin)
- [ ] 1.4 Ajustar parámetros de suspensión

### ⏳ Fase 2: Sistema de Transmisión (3-5 días)
- [ ] 2.1 Agregar sistema de marchas (1-5 + R)
- [ ] 2.2 Implementar cambio automático
- [ ] 2.3 Agregar curvas de potencia por marcha
- [ ] 2.4 Agregar indicador visual de marcha

### 🎨 Fase 3: Mejoras Visuales (2-3 días)
- [ ] 3.1 Animación de volante
- [ ] 3.2 Rotación de ruedas
- [ ] 3.3 Efectos de partículas (polvo, humo)
- [ ] 3.4 Sonidos de motor

### 🏗️ Fase 4: Refactorización Opcional (1-2 semanas)
- [ ] 4.1 Crear clase Vehicle base
- [ ] 4.2 Migrar lógica a clases
- [ ] 4.3 Sistema de asientos
- [ ] 4.4 Sistema de puertas

---

## 🔧 Implementación Detallada

## Fase 1.1: SpringSimulator para Dirección

### 📝 Descripción
Reemplazar la interpolación lineal de dirección con un simulador de resorte físico para movimiento más natural y suave.

### 📂 Archivos a Crear

#### 1. `src/lib/physics/SpringSimulator.ts`
```typescript
/**
 * Simulador de resorte para movimientos suaves y físicos
 * Basado en Sketchbook por swift502
 */
export class SpringSimulator {
  public position: number = 0;
  public velocity: number = 0;
  public target: number = 0;
  
  private mass: number;
  private damping: number;
  private frequency: number;
  
  /**
   * @param frequency - Frecuencia del resorte (Hz) - Mayor = más rápido
   * @param damping - Amortiguación - Mayor = menos oscilación
   * @param mass - Masa - Mayor = más inercia
   */
  constructor(frequency: number = 60, damping: number = 10, mass: number = 1) {
    this.frequency = frequency;
    this.damping = damping;
    this.mass = mass;
  }
  
  /**
   * Simula un paso de tiempo
   * @param timeStep - Delta time en segundos
   */
  public simulate(timeStep: number): void {
    // Calcular aceleración del resorte
    const acceleration = (this.target - this.position) * this.frequency - this.velocity * this.damping;
    
    // Integrar velocidad
    this.velocity += acceleration * timeStep / this.mass;
    
    // Integrar posición
    this.position += this.velocity * timeStep;
  }
  
  /**
   * Reinicia el simulador
   */
  public reset(): void {
    this.position = 0;
    this.velocity = 0;
    this.target = 0;
  }
  
  /**
   * Establece posición y target instantáneamente
   */
  public init(value: number): void {
    this.position = value;
    this.velocity = 0;
    this.target = value;
  }
}
```

### 📂 Archivos a Modificar

#### 2. `src/lib/three/cannonPhysics.ts`

**Paso 1: Importar SpringSimulator**
```typescript
// Al inicio del archivo
import { SpringSimulator } from '../physics/SpringSimulator';
```

**Paso 2: Agregar propiedad al estado del vehículo**
```typescript
// Línea ~16, modificar la interfaz del estado
private vehicleState: Map<string, { 
  reverseMode: boolean;
  steeringSimulator?: SpringSimulator;  // ← NUEVO
}> = new Map();
```

**Paso 3: Inicializar SpringSimulator al crear vehículo**
```typescript
// En createRaycastVehicle(), después de la línea 549
this.vehicleState.set(id, { 
  reverseMode: false,
  steeringSimulator: new SpringSimulator(60, 10, 0.6)  // ← NUEVO
});
```

**Paso 4: Usar SpringSimulator en updateRaycastVehicle**
```typescript
// Reemplazar las líneas 575-580 con:
updateRaycastVehicle(id: string, input: { throttle: number; brake: number; steer: number }, deltaTime: number) {
  const vehicle = (this as unknown as Record<string, { wheelInfos: Array<{ suspensionRestLength: number; suspensionLength: number }>; setBrake: (b:number,i:number)=>void; setSteeringValue: (v:number,i:number)=>void; applyEngineForce: (f:number,i:number)=>void; getWheelInfo: (i:number)=>{ worldTransform: { position: CANNON.Vec3 } } }>)[`${id}:vehicle`];
  if (!vehicle) return;
  
  const chassis = this.bodies.get(id);
  const state = this.vehicleState.get(id) || { reverseMode: false };
  
  // ========== NUEVO: Dirección con SpringSimulator ==========
  const steeringSimulator = state.steeringSimulator;
  if (steeringSimulator) {
    // Actualizar target del simulador
    steeringSimulator.target = input.steer;
    
    // Simular física del resorte
    steeringSimulator.simulate(deltaTime);
    
    // Aplicar dirección suavizada
    const maxSteer = 0.6;
    const steerVal = maxSteer * steeringSimulator.position;
    
    vehicle.setSteeringValue(steerVal, 0);
    vehicle.setSteeringValue(steerVal, 1);
  } else {
    // Fallback al método anterior si no hay simulador
    const maxSteer = 0.6;
    const speedNorm = Math.min(Math.abs(forwardSpeed) / 25, 1);
    const speedAtt = 1 - 0.5 * speedNorm;
    const steerVal = maxSteer * speedAtt * input.steer;
    vehicle.setSteeringValue(steerVal, 0);
    vehicle.setSteeringValue(steerVal, 1);
  }
  // ========== FIN NUEVO ==========
  
  // ... resto del código sin cambios
}
```

### ✅ Resultado Esperado
- Dirección más suave y natural
- Menos "twitchy" al girar
- Sensación más realista
- **Sin romper código existente** (fallback incluido)

### 🧪 Cómo Probar
1. Entra a un vehículo
2. Gira el volante (A/D)
3. Observa que el giro es más suave
4. Suelta las teclas y observa que vuelve al centro suavemente

---

## Fase 1.2: Curva de Torque Mejorada

### 📝 Descripción
Agregar curva de potencia realista que simula RPM del motor.

### 📂 Modificar: `src/lib/three/cannonPhysics.ts`

**Agregar método para calcular curva de potencia:**
```typescript
// Agregar después del método updateRaycastVehicle (línea ~645)

/**
 * Calcula la curva de potencia del motor basada en RPM
 * @param rpm - Revoluciones por minuto del motor
 * @returns Factor de potencia (0-1)
 */
private calculatePowerCurve(rpm: number): number {
  // Curva de potencia realista:
  // - Bajo RPM (0-2000): Poco torque
  // - Medio RPM (2000-5000): Máximo torque
  // - Alto RPM (5000-7000): Torque decrece
  
  const idleRPM = 1000;
  const peakRPM = 4000;
  const redlineRPM = 7000;
  
  if (rpm < idleRPM) {
    // Muy bajo RPM - poco torque
    return 0.3 + (rpm / idleRPM) * 0.2;
  } else if (rpm < peakRPM) {
    // Subida al pico de torque
    const t = (rpm - idleRPM) / (peakRPM - idleRPM);
    return 0.5 + t * 0.5; // 0.5 a 1.0
  } else if (rpm < redlineRPM) {
    // Caída después del pico
    const t = (rpm - peakRPM) / (redlineRPM - peakRPM);
    return 1.0 - t * 0.3; // 1.0 a 0.7
  } else {
    // Limitador de RPM
    return 0.7;
  }
}
```

**Modificar aceleración en updateRaycastVehicle:**
```typescript
// Reemplazar líneas 589-594 con:
if (input.throttle > 0.01) {
  // Forward with torque curve
  if (forwardSpeed < maxForwardSpeed) {
    // Calcular RPM simulado basado en velocidad
    const rpm = 1000 + Math.abs(forwardSpeed) * 200; // 1000-8000 RPM
    const powerCurve = this.calculatePowerCurve(rpm);
    
    // Boost a baja velocidad (mantener para facilidad)
    const lowSpeedBoost = 1.0 + Math.max(0, 1 - Math.abs(forwardSpeed) / 8) * 0.5;
    
    engineForce = engineForceBase * powerCurve * lowSpeedBoost * input.throttle;
  }
}
```

### ✅ Resultado Esperado
- Aceleración más realista
- Motor "respira" mejor
- Mejor sensación de potencia

---

## Fase 1.3: Física de Aire (Air Spin)

### 📝 Descripción
Permitir que el vehículo rote en el aire para trucos y saltos.

### 📂 Modificar: `src/lib/three/cannonPhysics.ts`

**Paso 1: Agregar timer al estado**
```typescript
// Modificar vehicleState (línea ~16)
private vehicleState: Map<string, { 
  reverseMode: boolean;
  steeringSimulator?: SpringSimulator;
  airSpinTimer: number;  // ← NUEVO
}> = new Map();
```

**Paso 2: Inicializar en createRaycastVehicle**
```typescript
// Línea ~549
this.vehicleState.set(id, { 
  reverseMode: false,
  steeringSimulator: new SpringSimulator(60, 10, 0.6),
  airSpinTimer: 0  // ← NUEVO
});
```

**Paso 3: Agregar lógica de aire en updateRaycastVehicle**
```typescript
// Agregar después de calcular forwardSpeed (línea ~573)

// ========== NUEVO: Física de aire ==========
const wheelsOnGround = vehicle.numWheelsOnGround || 0;
const isInAir = wheelsOnGround === 0;

if (isInAir) {
  // Incrementar timer de aire
  state.airSpinTimer += deltaTime;
  
  // Permitir rotación en el aire después de 0.2 segundos
  if (state.airSpinTimer > 0.2 && chassis) {
    // Reducir damping angular para permitir giros
    chassis.angularDamping = 0.1;
    
    // Aplicar torque si se presiona dirección
    if (input.steer !== 0) {
      const airTorque = new CANNON.Vec3(0, input.steer * 5, 0);
      chassis.applyTorque(airTorque);
    }
    
    // Permitir inclinación adelante/atrás
    if (input.throttle > 0) {
      const pitchTorque = new CANNON.Vec3(-2, 0, 0);
      chassis.applyTorque(pitchTorque);
    } else if (input.brake > 0) {
      const pitchTorque = new CANNON.Vec3(2, 0, 0);
      chassis.applyTorque(pitchTorque);
    }
  }
} else {
  // En el suelo - resetear timer y damping
  state.airSpinTimer = 0;
  if (chassis) {
    chassis.angularDamping = 0.5;
  }
}
// ========== FIN NUEVO ==========
```

### ✅ Resultado Esperado
- Vehículo puede rotar en el aire
- Trucos y saltos más divertidos
- Control en el aire con W/S/A/D

---

## 📊 Resumen de Cambios

| Archivo | Líneas Nuevas | Líneas Modificadas | Riesgo |
|---------|---------------|-------------------|--------|
| `SpringSimulator.ts` | +80 | 0 | ✅ Bajo (nuevo archivo) |
| `cannonPhysics.ts` | +60 | ~30 | ⚠️ Medio (modificaciones graduales) |

---

## 🧪 Plan de Testing

### Test 1: SpringSimulator
```
1. Entrar al vehículo
2. Girar suavemente (A/D)
3. Verificar: Giro suave sin sacudidas
4. Soltar teclas
5. Verificar: Volante vuelve al centro suavemente
```

### Test 2: Curva de Torque
```
1. Acelerar desde parado (W)
2. Verificar: Aceleración progresiva
3. Alcanzar velocidad media
4. Verificar: Máxima potencia
5. Alcanzar velocidad alta
6. Verificar: Potencia decrece ligeramente
```

### Test 3: Física de Aire
```
1. Conducir hacia una rampa
2. Saltar
3. Presionar A/D en el aire
4. Verificar: Vehículo rota
5. Presionar W/S en el aire
6. Verificar: Vehículo se inclina
7. Aterrizar
8. Verificar: Control normal restaurado
```

---

## 🚀 Próximos Pasos

Una vez completada la Fase 1:
1. ✅ Probar exhaustivamente
2. ✅ Ajustar parámetros si es necesario
3. ✅ Documentar cambios
4. ➡️ Continuar con Fase 2 (Transmisión)

---

**¿Listo para empezar con la Fase 1.1? 🎯**

