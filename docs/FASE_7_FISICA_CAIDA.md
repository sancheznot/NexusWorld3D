# Fase 7: Física de Caída Mejorada (Sketchbook Integration)

## 📋 Resumen

Implementación del sistema de física de caída mejorada basado en **Sketchbook** de `swift502`. Este sistema detecta diferentes tipos de caídas y aplica animaciones y comportamientos apropiados según la velocidad de impacto.

**Fecha de implementación:** 10 de noviembre de 2025  
**Referencia:** `docs/Sketchbook/character/character-state/Falling.md`

---

## 🎯 ¿Cómo Funciona en Sketchbook?

### Sistema de Detección de Caída

Sketchbook usa un sistema de **raycast** para detectar si el personaje está en el suelo:

```typescript
// Character.md - línea 824
this.rayHasHit = this.world.physicsWorld.raycastClosest(start, end, rayCastOptions, this.rayResult);
```

### Almacenamiento de Datos de Impacto

Cuando el personaje está en el aire, guarda la velocidad para calcular el impacto:

```typescript
// Character.md - líneas 902-904
character.groundImpactData.velocity.x = body.velocity.x;
character.groundImpactData.velocity.y = body.velocity.y;
character.groundImpactData.velocity.z = body.velocity.z;
```

### Lógica de Estados de Caída

Cuando el personaje toca el suelo, determina qué estado aplicar basándose en la velocidad Y:

```typescript
// CharacterStateBase.md - líneas 109-127
public setAppropriateDropState(): void
{
    if (this.character.groundImpactData.velocity.y < -6)
    {
        // Caída fuerte: Roll (rodar)
        this.character.setState(new DropRolling(this.character));
    }
    else if (this.anyDirection())
    {
        if (this.character.groundImpactData.velocity.y < -2)
        {
            // Caída media: Drop Running (aterrizaje corriendo)
            this.character.setState(new DropRunning(this.character));
        }
        else
        {
            // Caída suave: Continuar caminando/corriendo
            this.character.setState(new Walk/Sprint(this.character));
        }
    }
    else
    {
        // Sin movimiento: Idle
        this.character.setState(new Idle(this.character));
    }
}
```

---

## 🚀 Plan de Implementación

### Fase 7.1: Detección de Caída Mejorada ✅

**Objetivo:** Detectar cuándo el personaje está cayendo y guardar datos de impacto.

**Archivos a modificar:**
- `src/lib/three/cannonPhysics.ts` - Agregar tracking de velocidad en el aire
- `src/components/world/PlayerV2.tsx` - Detectar estado de caída

**Implementación:**
1. Agregar variable `groundImpactVelocity` para guardar velocidad antes de tocar suelo
2. Actualizar esta velocidad cada frame mientras está en el aire
3. Usar `isGrounded()` existente para detectar impacto

### Fase 7.2: Animaciones de Caída

**Objetivo:** Agregar animaciones apropiadas según velocidad de caída.

**Animaciones necesarias:**
- `falling` - Caída en el aire
- `drop_running` - Aterrizaje suave (velocidad Y: -2 a -6)
- `drop_running_roll` - Aterrizaje fuerte con roll (velocidad Y < -6)

**Archivos a modificar:**
- `src/hooks/useCharacterAnimation.ts` - Agregar lógica de animaciones de caída
- `src/components/world/AnimatedCharacter.tsx` - Mapear animaciones

### Fase 7.3: Lógica de Estados de Caída

**Objetivo:** Aplicar comportamiento correcto según velocidad de impacto.

**Estados a implementar:**
1. **Caída Suave** (velocidad Y > -2):
   - Sin animación especial
   - Continuar con movimiento normal

2. **Caída Media** (velocidad Y: -2 a -6):
   - Animación `drop_running` (aterrizaje corriendo)
   - Reducir velocidad temporalmente
   - Transición suave a caminar/correr

3. **Caída Fuerte** (velocidad Y < -6):
   - Animación `drop_running_roll` (rodar)
   - Bloquear controles durante animación
   - Reducir daño por caída (50% menos)
   - Transición a idle/walk después

**Archivos a modificar:**
- `src/components/world/PlayerV2.tsx` - Lógica de estados
- `src/constants/game.ts` - Constantes de umbrales

---

## 📊 Umbrales de Velocidad

| Velocidad Y | Estado | Animación | Daño | Comportamiento |
|-------------|--------|-----------|------|----------------|
| > -2 | Caída Suave | Ninguna | 0% | Continuar normal |
| -2 a -6 | Caída Media | `drop_running` | 100% | Aterrizaje corriendo |
| < -6 | Caída Fuerte | `drop_running_roll` | 50% | Roll + reducción daño |

---

## 🔧 Constantes Configurables

```typescript
// src/constants/game.ts
player: {
  fall: {
    // Umbrales de velocidad (valores negativos)
    softLandingThreshold: -2,    // Menor que esto = caída media
    hardLandingThreshold: -6,    // Menor que esto = caída fuerte
    
    // Daño por caída
    minImpactSpeed: 6,           // Ya existe
    damagePerUnitSpeed: 5,       // Ya existe
    rollDamageReduction: 0.5,    // 50% menos daño con roll
    
    // Duración de animaciones (ms)
    dropRunningDuration: 800,    // Duración de drop_running
    dropRollingDuration: 1200,   // Duración de drop_rolling
    
    // Control durante caída
    airControl: 0.05,            // Control en el aire (muy bajo)
  },
}
```

---

## 🎮 Flujo de Implementación

### 1. Variables de Estado

```typescript
// PlayerV2.tsx
const [fallState, setFallState] = useState<'none' | 'falling' | 'landing'>('none');
const groundImpactVelocityRef = useRef({ x: 0, y: 0, z: 0 });
const landingAnimationUntilRef = useRef(0);
```

### 2. Detección de Caída

```typescript
// En useFrame
const velocity = physicsRef.current.getPlayerVelocity();
const isGrounded = physicsRef.current.isGrounded();

if (!isGrounded) {
  // Guardar velocidad mientras está en el aire
  groundImpactVelocityRef.current = { x: velocity.x, y: velocity.y, z: velocity.z };
  setFallState('falling');
} else if (fallState === 'falling') {
  // Acaba de tocar el suelo
  handleLanding();
  setFallState('landing');
}
```

### 3. Manejo de Aterrizaje

```typescript
function handleLanding() {
  const impactVelocity = groundImpactVelocityRef.current.y;
  const now = performance.now();
  
  if (impactVelocity < GAME_CONFIG.player.fall.hardLandingThreshold) {
    // Caída fuerte: Roll
    landingAnimationUntilRef.current = now + GAME_CONFIG.player.fall.dropRollingDuration;
    // Reducir daño
    const damage = calculateFallDamage(impactVelocity) * GAME_CONFIG.player.fall.rollDamageReduction;
    applyDamage(damage);
  } else if (impactVelocity < GAME_CONFIG.player.fall.softLandingThreshold) {
    // Caída media: Drop Running
    landingAnimationUntilRef.current = now + GAME_CONFIG.player.fall.dropRunningDuration;
    // Daño normal
    const damage = calculateFallDamage(impactVelocity);
    applyDamage(damage);
  } else {
    // Caída suave: Sin animación especial
    setFallState('none');
  }
}
```

### 4. Animaciones

```typescript
// useCharacterAnimation.ts o PlayerV2.tsx
let animation = 'idle';

if (fallState === 'falling') {
  animation = 'falling';
} else if (fallState === 'landing' && performance.now() < landingAnimationUntilRef.current) {
  const impactVelocity = groundImpactVelocityRef.current.y;
  if (impactVelocity < GAME_CONFIG.player.fall.hardLandingThreshold) {
    animation = 'drop_rolling';
  } else if (impactVelocity < GAME_CONFIG.player.fall.softLandingThreshold) {
    animation = 'drop_running';
  }
} else {
  // Animaciones normales (idle, walk, run, etc.)
  animation = getCurrentAnimation();
}
```

---

## 🎨 Beneficios

### Antes
- ❌ Solo daño por caída (sin feedback visual)
- ❌ Caídas se ven abruptas
- ❌ Sin diferencia entre caída corta y larga
- ❌ Sin animación de aterrizaje

### Después
- ✅ Animaciones de caída apropiadas
- ✅ Aterrizaje suave vs fuerte
- ✅ Sistema de roll para reducir daño
- ✅ Feedback visual claro
- ✅ Más realista y satisfactorio

---

## 📝 Notas de Implementación

### Animaciones Faltantes

Es posible que no tengamos las animaciones `drop_running` y `drop_running_roll` en nuestros modelos actuales. Opciones:

1. **Opción A (Ideal):** Agregar estas animaciones a los modelos
2. **Opción B (Temporal):** Usar animaciones existentes como placeholder:
   - `drop_running` → `walking` (temporal)
   - `drop_running_roll` → `jump` o crear animación simple

### Control Durante Caída

Sketchbook permite un control mínimo en el aire (`airControl: 0.05`). Podemos implementar esto reduciendo la influencia del input cuando `!isGrounded()`.

### Integración con Sistema Existente

Ya tenemos:
- ✅ Detección de suelo (`isGrounded()`)
- ✅ Daño por caída básico
- ✅ Sistema de animaciones

Solo necesitamos:
- Agregar tracking de velocidad en el aire
- Implementar lógica de estados de aterrizaje
- Mapear animaciones nuevas

---

## 🧪 Testing

### Pruebas a Realizar

1. **Caída Corta** (< 2 unidades):
   - Saltar en el lugar
   - Verificar que no hay animación especial
   - Sin daño

2. **Caída Media** (2-6 unidades):
   - Saltar desde plataforma media
   - Verificar animación `drop_running`
   - Daño moderado

3. **Caída Larga** (> 6 unidades):
   - Saltar desde plataforma alta
   - Verificar animación `drop_rolling`
   - Daño reducido (50%)

4. **Caída Mientras Corre**:
   - Correr y caer
   - Verificar transición suave

---

## 📚 Referencias

- **Sketchbook Falling.md**: `docs/Sketchbook/character/character-state/Falling.md`
- **Sketchbook DropRunning.md**: `docs/Sketchbook/character/character-state/DropRunning.md`
- **Sketchbook DropRolling.md**: `docs/Sketchbook/character/character-state/DropRolling.md`
- **Sketchbook CharacterStateBase.md**: `docs/Sketchbook/character/character-state/CharacterStateBase.md`
- **Sketchbook Character.md**: Líneas 902-904 (groundImpactData)

---

## ✅ Checklist de Implementación

- [ ] Agregar constantes de caída a `game.ts`
- [ ] Agregar variables de estado en `PlayerV2.tsx`
- [ ] Implementar tracking de velocidad en el aire
- [ ] Implementar detección de aterrizaje
- [ ] Implementar lógica de `handleLanding()`
- [ ] Agregar animaciones de caída
- [ ] Integrar con sistema de daño existente
- [ ] Agregar reducción de daño con roll
- [ ] Probar diferentes alturas de caída
- [ ] Ajustar umbrales si es necesario
- [ ] Documentar cambios

---

**Implementado por:** AI Assistant  
**Basado en:** Sketchbook by swift502  
**Fecha:** 10 de noviembre de 2025

