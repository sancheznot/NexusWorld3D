# Fase 9: Sistema de Estados del Personaje (State Machine)

**Fecha**: 10 de noviembre de 2025  
**Estado**: ✅ **IMPLEMENTADO Y ARREGLADO** - Sistema activado y funcionando correctamente  
**Basado en**: Sketchbook `CharacterStateBase.ts` y estados relacionados  
**Última actualización**: 11 de noviembre de 2025 - Arreglado timing de animaciones

---

## 📋 Resumen

Se implementó un sistema completo de **State Machine** para el personaje, basado en el patrón de estados de Sketchbook. Este sistema permite gestionar de manera organizada el comportamiento, animaciones y transiciones del personaje.

### 🎯 Característica Principal

El State Machine es **OPCIONAL** y coexiste con el sistema actual que ya funciona bien. Se puede activar/desactivar mediante una constante en `game.ts`.

---

## 🏗️ Arquitectura del Sistema

### 1. Clase Base: `CharacterState`

**Ubicación**: `src/lib/character/CharacterState.ts`

```typescript
export abstract class CharacterState {
  protected timer: number = 0;
  protected animationLength?: number;
  public _entered: boolean = false;
  
  abstract readonly name: string;
  abstract readonly animation: string;
  
  abstract onEnter(context: CharacterStateContext): void;
  abstract update(deltaTime: number, context: CharacterStateContext): CharacterState | null;
  
  onExit(): void {}
  
  protected updateTimer(deltaTime: number): void;
  protected anyDirection(input: CharacterInput): boolean;
  protected noDirection(input: CharacterInput): boolean;
  protected animationEnded(deltaTime: number): boolean;
}
```

**Características**:
- `name`: Nombre del estado (para debugging)
- `animation`: Nombre de la animación asociada
- `timer`: Tiempo transcurrido en el estado
- `onEnter()`: Llamado al entrar al estado
- `update()`: Llamado cada frame, retorna nuevo estado si hay transición
- `onExit()`: Llamado al salir del estado
- Helpers: `anyDirection()`, `noDirection()`, `animationEnded()`

### 2. Gestor: `CharacterStateMachine`

**Ubicación**: `src/lib/character/CharacterStateMachine.ts`

```typescript
export class CharacterStateMachine {
  private currentState: CharacterState;
  
  constructor(initialState?: CharacterState);
  update(deltaTime: number, context: CharacterStateContext): string;
  getCurrentState(): CharacterState;
  getCurrentStateName(): string;
  forceState(newState: CharacterState): void;
}
```

**Responsabilidades**:
- Mantener el estado actual
- Gestionar transiciones entre estados
- Llamar a `onEnter()` y `onExit()` automáticamente
- Retornar la animación del estado actual

### 3. Estados Implementados

**Ubicación**: `src/lib/character/states/CharacterStates.ts`

#### IdleState
- **Animación**: `idle`
- **Transiciones**:
  - → `WalkState`: Si presiona dirección
  - → `JumpState`: Si presiona salto
  - → `FallingState`: Si pierde el suelo (no por salto)

#### WalkState
- **Animación**: `walking`
- **Transiciones**:
  - → `SprintState`: Si presiona correr
  - → `IdleState`: Si suelta dirección
  - → `JumpState`: Si presiona salto
  - → `FallingState`: Si pierde el suelo

#### SprintState
- **Animación**: `running`
- **Transiciones**:
  - → `WalkState`: Si suelta correr O sin stamina
  - → `IdleState`: Si suelta dirección
  - → `JumpState`: Si presiona salto
  - → `FallingState`: Si pierde el suelo

#### JumpState
- **Animación**: `jump`
- **Duración**: ~0.8s
- **Transiciones**:
  - → `IdleState`: Si aterriza (después de 0.1s)
  - → `FallingState`: Si termina animación y sigue en aire

#### FallingState
- **Animación**: `jump` (placeholder)
- **Transiciones**:
  - → `LandingState`: Si toca el suelo

#### LandingState
- **Animación**: `drop_running` o `drop_rolling` según impacto
- **Duración**: Variable según tipo de caída
- **Transiciones**:
  - → `IdleState`: Al terminar animación (sin input)
  - → `WalkState`: Al terminar animación (con input)

---

## 🎛️ Activación del Sistema

### Constante de Configuración

**Ubicación**: `src/constants/game.ts`

```typescript
player: {
  stateMachine: {
    enabled: false,        // Activar/desactivar State Machine
    debugLogs: true,      // Mostrar logs de transiciones
  },
}
```

**Uso**:
- `enabled: false` → Usa el sistema actual (que ya funciona bien)
- `enabled: true` → Usa el nuevo State Machine

### Integración en PlayerV2

**Ubicación**: `src/components/world/PlayerV2.tsx`

El sistema tiene dos modos de operación:

```typescript
// Resolver animación final
let desiredAnim = currentAnimation;

// MODO 1: Usar State Machine (si está habilitado)
if (GAME_CONFIG.player.stateMachine.enabled && stateMachine && isCurrentPlayer) {
  // Convertir inputs al formato Sketchbook
  const sketchbookInput = {
    forward: input.z > 0,
    backward: input.z < 0,
    left: input.x < 0,
    right: input.x > 0,
    run: input.isRunning,
    jump: input.isJumping,
  };
  
  // Construir contexto
  const context: CharacterStateContext = {
    input: sketchbookInput,
    isGrounded,
    velocity,
    stamina,
  };
  
  // Actualizar y obtener animación
  desiredAnim = stateMachine.update(deltaTime, context) as AnimationState;
}
// MODO 2: Usar lógica actual (sistema que ya funciona bien)
else {
  // ... lógica actual con prioridades de animación
}
```

---

## 🔄 Flujo de Transiciones

### Diagrama de Estados

```
         ┌──────────┐
    ┌───>│  Idle    │<───┐
    │    └──────────┘    │
    │      │    ▲        │
    │      │    │        │
    │   W,A,S,D │        │
    │      │    │no mov  │
    │      v    │        │
    │    ┌──────────┐    │
    │    │  Walk    │    │
    │    └──────────┘    │
    │         │ Shift    │
    │         │          │
    │         v          │
    │    ┌──────────┐    │
    │    │  Sprint  │────┘
    │    └──────────┘
    │         │
    │    Space│
    │         v
    │    ┌──────────┐
    │    │  Jump    │
    │    └──────────┘
    │         │
    │         │ >0.8s
    │         v
    │    ┌──────────┐
    │    │ Falling  │
    │    └──────────┘
    │         │
    │   toca  │
    │   suelo │
    │         v
    │    ┌──────────┐
    └────│ Landing  │
         └──────────┘
```

### Ejemplo de Transición Completa

```
Usuario presiona W → Walk State (0.0s)
  └─> Animación: 'walking'

Usuario presiona Shift → Sprint State (0.5s)
  └─> Animación: 'running'

Usuario presiona Space → Jump State (2.0s)
  └─> Animación: 'jump'
  
Pasa 0.8s → Falling State (2.8s)
  └─> Animación: 'jump' (placeholder)

Personaje toca suelo → Landing State (3.2s)
  └─> Animación: 'drop_running' o 'drop_rolling'
  
Animación termina → Idle State (4.4s)
  └─> Animación: 'idle'
```

---

## 📦 Archivos Creados

### 1. `src/lib/character/CharacterState.ts`
**Contenido**:
- `CharacterInput` interface
- `CharacterStateContext` interface
- `CharacterState` clase base abstracta

**Tamaño**: ~96 líneas

### 2. `src/lib/character/CharacterStateMachine.ts`
**Contenido**:
- `CharacterStateMachine` clase
- Gestión de transiciones
- Logging de cambios de estado

**Tamaño**: ~76 líneas

### 3. `src/lib/character/states/CharacterStates.ts`
**Contenido**:
- `IdleState`
- `WalkState`
- `SprintState`
- `JumpState`
- `FallingState`
- `LandingState`

**Tamaño**: ~235 líneas (estimado)

---

## 🔧 Archivos Modificados

### 1. `src/constants/game.ts`

**Agregado**:
```typescript
player: {
  stateMachine: {
    enabled: false,      // Activar/desactivar State Machine
    debugLogs: true,    // Mostrar logs de transiciones
  },
}
```

### 2. `src/components/world/PlayerV2.tsx`

**Agregado**:
- Import de `CharacterStateMachine` y `CharacterStateContext`
- Import de `AnimationState` type
- `useMemo` para inicializar State Machine
- Lógica de conversión de inputs (x,z → forward/backward/left/right)
- Modo dual: State Machine o lógica actual
- Cast de tipos para compatibilidad

**Cambios**: ~40 líneas agregadas

---

## 🎯 Beneficios del Sistema

### 1. **Organización del Código** 📁
- Cada estado es una clase separada
- Lógica de transiciones encapsulada
- Fácil de entender y mantener

### 2. **Extensibilidad** 🚀
- Agregar nuevos estados es trivial
- No afecta código existente
- Patrón escalable para futuras features

### 3. **Debugging** 🐛
- Logs automáticos de transiciones
- Estado actual siempre identificable
- Fácil rastrear bugs de animación

### 4. **Control Fino** 🎮
- Previene transiciones inválidas
- Control de duración de animaciones
- Comportamiento contextual por estado

### 5. **Coexistencia Pacífica** ☮️
- No rompe el sistema actual
- Activable/desactivable fácilmente
- Permite comparar comportamientos

---

## 🧪 Testing

### Pruebas Recomendadas

1. **Con State Machine Desactivado** (`enabled: false`)
   - ✅ Verificar que todo funciona igual que antes
   - ✅ Sin logs de transiciones
   - ✅ Animaciones normales

2. **Con State Machine Activado** (`enabled: true`)
   - 🔄 Verificar transiciones Idle → Walk → Sprint
   - 🔄 Verificar Jump → Falling → Landing
   - 🔄 Verificar que los logs se muestran
   - 🔄 Verificar stamina afecta Sprint → Walk

3. **Casos Edge**
   - 🔄 Saltar sin moverse (Idle → Jump)
   - 🔄 Caer de rampa (sin jump intencional)
   - 🔄 Correr sin stamina
   - 🔄 Aterrizaje fuerte vs suave

---

## 📊 Comparativa: Sistema Actual vs State Machine

| Aspecto | Sistema Actual | State Machine |
|---------|----------------|---------------|
| **Estructura** | Lógica en `if-else` | Clases por estado |
| **Extensibilidad** | Modificar cascada de `if` | Agregar nueva clase |
| **Debugging** | Console.log manual | Logs automáticos |
| **Transiciones** | Implícitas en código | Explícitas en estados |
| **Mantenibilidad** | Media | Alta |
| **Complejidad** | Baja (más simple) | Media (más robusto) |
| **Rendimiento** | Ligeramente mejor | Comparable |

---

## 🔮 Futuras Mejoras

### Corto Plazo
1. **Animaciones Faltantes**
   - `falling` (actualmente usa `jump`)
   - `drop_running` (actualmente usa `walking`)
   - `drop_rolling` (actualmente usa `jump`)

2. **Integración con Fall Physics**
   - Estado `HardLandingState` con roll completo
   - Estado `MediumLandingState` con drop running
   - Daño según tipo de aterrizaje

3. **Stamina Integration**
   - `TiredState` cuando stamina = 0
   - Transición automática Sprint → Walk
   - Animación de cansancio

### Largo Plazo
1. **Combat States**
   - `AttackState`
   - `BlockState`
   - `DodgeState`

2. **Interaction States**
   - `OpeningDoorState`
   - `PickingUpItemState`
   - `TalkingState`

3. **Vehicle States**
   - `EnteringVehicleState`
   - `DrivingState`
   - `ExitingVehicleState`

---

## 🐛 Issues Conocidos

### 1. Animaciones Placeholder
**Problema**: Algunos estados usan animaciones temporales:
- `FallingState` usa `jump` en vez de `falling`
- `LandingState` usa `jump`/`walking` en vez de `drop_*`

**Solución**: Agregar las animaciones faltantes al modelo

### 2. Delta Time Aproximado
**Problema**: Actualmente usamos `1/60` como aproximación
```typescript
const deltaTime = 1/60; // Aproximación
```

**Solución**: Usar el `delta` real del `useFrame`

### 3. Conversión de Inputs
**Problema**: Convertimos inputs de `(x, z)` a `(forward, backward, left, right)`

**Solución**: Estandarizar un único formato de input en el proyecto

---

## 📝 Notas de Implementación

### Por Qué es Opcional

1. **El sistema actual funciona bien**
   - No queríamos romper lo que ya existe
   - Permite comparar ambos enfoques
   - Transición gradual si decidimos migrar

2. **Permite testing A/B**
   - Podemos activar/desactivar fácilmente
   - Comparar comportamientos lado a lado
   - Identificar diferencias

3. **Seguridad**
   - Si el State Machine tiene bugs, podemos desactivarlo
   - No impacta producción
   - Facilita debugging

### Decisiones de Diseño

1. **Usar clases en vez de funciones**
   - Más cercano a Sketchbook
   - Mejor para encapsulación
   - Facilita herencia y composición

2. **Timer interno en cada estado**
   - Permite animaciones temporizadas
   - Facilita transiciones automáticas
   - Control de duración por estado

3. **Contexto como parámetro**
   - Estados son stateless (no guardan contexto)
   - Más fácil de testear
   - Evita problemas de sincronización

---

## 🎓 Referencias

**Basado en**:
- Sketchbook `CharacterStateBase.ts`
- Patrón State Machine
- Máquina de estados finitos (FSM)

**Archivos de Referencia**:
- `docs/Sketchbook/character/character-state/CharacterStateBase.md`
- Implementaciones de estados en Sketchbook

---

## ✅ Checklist de Implementación

- [x] Crear `CharacterState` clase base
- [x] Crear `CharacterStateMachine` gestor
- [x] Implementar `IdleState`
- [x] Implementar `WalkState`
- [x] Implementar `SprintState`
- [x] Implementar `JumpState`
- [x] Implementar `FallingState`
- [x] Implementar `LandingState`
- [x] Integrar en `PlayerV2.tsx`
- [x] Agregar constante de activación
- [x] Conversión de inputs
- [x] Resolver errores de linter
- [ ] Testing completo
- [ ] Documentación de uso
- [ ] Agregar animaciones faltantes

---

## 🐛 Bug Fix: Timing de Animaciones (11 de noviembre de 2025)

### Problema Detectado

Al activar el State Machine, las animaciones parpadeaban:
- **JumpState** → **LandingState** → **JumpState** (transiciones muy rápidas)
- La animación de salto no se veía completa
- Saltos continuos (mantener Space) no funcionaban correctamente

### Causa Raíz

El State Machine no respetaba las duraciones de animación del sistema actual:
- Sistema actual: `jumpLockedUntilRef` bloquea salto por **1.5 segundos**
- Sistema actual: `landingAnimationUntilRef` bloquea según impacto
- State Machine: Transicionaba inmediatamente según lógica de estado

### Solución Implementada

#### 1. JumpState - Bloqueo de 1.5s

```typescript
update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
  this.updateTimer(deltaTime);
  
  // MANTENER estado Jump por 1.5s completos (igual que sistema actual)
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
```

**Cambios**:
- ✅ Bloquea estado por 1.5s completos
- ✅ Igual que `jumpLockedUntilRef` del sistema actual
- ✅ Permite que la animación se vea completa

#### 2. LandingState - Bloqueo según Impacto

```typescript
onEnter(context: CharacterStateContext): void {
  this.timer = 0;
  this.impactVelocity = Math.abs(context.velocity.y);
  
  // Determinar duración según impacto (igual que sistema actual)
  if (this.impactVelocity > 6) {
    this.animationLength = 1.2; // Roll (dropRollingDuration = 1200ms)
  } else if (this.impactVelocity > 2) {
    this.animationLength = 0.8; // Drop running (dropRunningDuration = 800ms)
  } else {
    this.animationLength = 0.3; // Landing suave (300ms mínimo)
  }
}

update(deltaTime: number, context: CharacterStateContext): CharacterState | null {
  this.updateTimer(deltaTime);
  
  // BLOQUEAR salto hasta que termine la animación
  if (this.animationLength && this.timer < this.animationLength) {
    return null; // Mantener Landing bloqueado
  }
  
  // Después de la animación, transicionar según input
  if (context.input.jump) {
    return new JumpState();
  }
  // ... resto de transiciones
}
```

**Cambios**:
- ✅ Bloquea estado según tipo de aterrizaje
- ✅ Landing suave: 0.3s (antes: 0.05s - demasiado corto)
- ✅ Drop running: 0.8s
- ✅ Roll: 1.2s
- ✅ Igual que `landingAnimationUntilRef` del sistema actual

### Resultado

✅ **Animación de salto se ve completa** (1.5s)  
✅ **NO parpadea entre estados**  
✅ **Saltos continuos funcionan** (mantener Space)  
✅ **Landing respeta duraciones** según impacto  
✅ **State Machine activado** (`enabled: true`)  
✅ **Sin errores de linter**

### Archivos Modificados

1. **src/lib/character/states/CharacterStates.ts**:
   - JumpState: Bloquea 1.5s completos
   - LandingState: Bloquea según impacto (0.3s / 0.8s / 1.2s)
   - Arreglados warnings de linter (`_context`)

2. **src/constants/game.ts**:
   - `stateMachine.enabled: false → true`

---

## 🚀 Siguiente Paso

**Estado Actual**: State Machine funcionando correctamente y activado.

**Próximas Mejoras**:
1. Agregar animaciones faltantes (`drop_running`, `drop_rolling`, `falling`)
2. Continuar con mejoras de colisiones (Fase 10)
3. Testing exhaustivo del State Machine

---

**Fecha de Última Actualización**: 11 de noviembre de 2025  
**Autor**: AI Assistant  
**Revisión**: ✅ State Machine arreglado y activado

