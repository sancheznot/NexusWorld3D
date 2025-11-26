# Fase 6: Inclinación del Personaje (Sketchbook Integration)

## 📋 Resumen

Implementación del sistema de inclinación del personaje basado en **Sketchbook** de `swift502`. Este sistema hace que el personaje se incline lateralmente cuando gira mientras se mueve, creando un efecto visual más realista y dinámico.

**Fecha de implementación:** 10 de noviembre de 2025  
**Referencia:** `docs/Sketchbook/character/Character.md` (líneas 586-588)

---

## 🎯 Características Implementadas

### 1. **Contenedor de Inclinación (Tilt Container)**

Se agregó un grupo interno (`tiltContainer`) que permite rotar el modelo del personaje sin afectar su posición física o la cámara.

**Estructura de jerarquía:**
```
group (posición y rotación principal)
  └── tiltContainer (inclinación lateral)
      └── modelContainer (offset vertical -1)
          └── primitive (modelo 3D)
```

### 2. **Cálculo de Velocidad Angular**

El sistema calcula la velocidad angular del personaje basándose en el cambio de rotación por frame:

```typescript
// Calcular velocidad angular (cambio de rotación por segundo)
const currentRotation = rotation[1];
let rotationDelta = currentRotation - lastRotationRef.current;

// Normalizar el delta de rotación para manejar el wrap-around de -π a π
if (rotationDelta > Math.PI) rotationDelta -= Math.PI * 2;
if (rotationDelta < -Math.PI) rotationDelta += Math.PI * 2;

angularVelocityRef.current = rotationDelta / delta;
```

### 3. **Inclinación Lateral**

La inclinación se aplica en el eje Z basándose en la velocidad angular y la velocidad lineal:

```typescript
// Fórmula de Sketchbook: rotation.z = -angularVelocity * multiplier * velocity.length()
const velocityLength = velocityRef.current.length();
const tiltAmount = -angularVelocityRef.current * GAME_CONFIG.player.tilt.multiplier * velocityLength;

// Aplicar inclinación con suavizado
tiltContainerRef.current.rotation.z = THREE.MathUtils.lerp(
  tiltContainerRef.current.rotation.z,
  tiltAmount,
  0.1 // Factor de suavizado
);
```

### 4. **Compensación Vertical**

Para evitar que el personaje parezca "flotar" cuando se inclina, se aplica una compensación vertical:

```typescript
// Fórmula de Sketchbook: position.y = (cos(abs(tilt)) / 2) - 0.5
const verticalCompensation = 
  (Math.cos(Math.abs(tiltAmount)) / 2) * GAME_CONFIG.player.tilt.verticalCompensation + 
  GAME_CONFIG.player.tilt.verticalOffset;

tiltContainerRef.current.position.y = THREE.MathUtils.lerp(
  tiltContainerRef.current.position.y,
  verticalCompensation,
  0.1 // Factor de suavizado
);
```

---

## 🔧 Constantes Configurables

Todas las constantes están centralizadas en `src/constants/game.ts`:

```typescript
player: {
  tilt: {
    multiplier: 2.3,          // Multiplicador de inclinación (mayor = más inclinación)
    verticalOffset: -0.5,     // Offset vertical base
    verticalCompensation: 0.5, // Compensación vertical para evitar flotación
  },
}
```

### Ajuste de Valores

- **`multiplier`**: Controla cuánto se inclina el personaje. Valores más altos = más inclinación.
  - Sketchbook usa `2.3`
  - Rango recomendado: `1.5 - 3.0`

- **`verticalOffset`**: Posición Y base del contenedor de inclinación.
  - Sketchbook usa `-0.5`
  - Ajustar si el personaje parece flotar o hundirse

- **`verticalCompensation`**: Cuánto compensar verticalmente cuando se inclina.
  - Sketchbook usa `0.5`
  - Valores más altos = más compensación

---

## 📝 Archivos Modificados

### 1. `src/components/world/AnimatedCharacter.tsx`

**Cambios principales:**
- Agregado `tiltContainerRef` para el contenedor de inclinación
- Agregado `useFrame` para calcular velocidad angular y aplicar inclinación
- Agregados refs para tracking de posición y rotación
- Modificada estructura JSX para incluir `tiltContainer`

**Líneas clave:**
- **67-79**: Declaración de refs para sistema de inclinación
- **172-215**: Lógica de cálculo y aplicación de inclinación en `useFrame`
- **227-233**: Estructura JSX con `tiltContainer`

### 2. `src/constants/game.ts`

**Cambios principales:**
- Agregada sección `player.tilt` con constantes configurables

**Líneas clave:**
- **63-67**: Constantes de inclinación del personaje

---

## 🎮 Comportamiento

### Antes
- El personaje se movía y rotaba sin inclinación
- Giros se veían rígidos y poco naturales
- Sin feedback visual de la velocidad de giro

### Después
- El personaje se inclina lateralmente al girar mientras se mueve
- Giros se ven más naturales y dinámicos
- Feedback visual claro de la velocidad de giro
- Compensación vertical automática para evitar flotación

### Cuándo se Activa
- ✅ Solo para el jugador local (`isCurrentPlayer === true`)
- ✅ Cuando el personaje está girando (velocidad angular > 0)
- ✅ Cuando el personaje está en movimiento (velocidad lineal > 0)
- ❌ No se aplica a jugadores remotos (para evitar conflictos con networking)

---

## 🧪 Pruebas Recomendadas

1. **Giro Básico**
   - Caminar en línea recta y girar bruscamente
   - Verificar que el personaje se incline en la dirección del giro

2. **Giro Suave**
   - Caminar en círculos amplios
   - Verificar que la inclinación sea proporcional a la velocidad de giro

3. **Sprint + Giro**
   - Correr y girar rápidamente
   - Verificar que la inclinación sea más pronunciada

4. **Idle + Giro**
   - Girar sin moverse
   - Verificar que NO haya inclinación (velocidad lineal = 0)

5. **Compensación Vertical**
   - Observar que el personaje no flote cuando se inclina
   - Verificar que los pies permanezcan en el suelo

---

## 🔍 Comparación con Sketchbook

| Aspecto | Sketchbook | Nuestra Implementación | Diferencia |
|---------|-----------|------------------------|------------|
| **Contenedor de inclinación** | `tiltContainer: THREE.Group` | `tiltContainerRef: useRef<THREE.Group>` | Adaptado a React refs |
| **Velocidad angular** | `angularVelocity: number` | `angularVelocityRef.current` | Adaptado a React refs |
| **Fórmula de inclinación** | `rotation.z = -angularVelocity * 2.3 * velocity.length()` | `tiltAmount = -angularVelocity * multiplier * velocityLength` | Idéntica, pero configurable |
| **Compensación vertical** | `position.y = (cos(abs(tilt)) / 2) - 0.5` | `(cos(abs(tilt)) / 2) * compensation + offset` | Mejorada con constantes |
| **Suavizado** | Directo | `THREE.MathUtils.lerp(..., 0.1)` | Agregado para suavidad |

---

## 🚀 Próximos Pasos

Según el plan de implementación (`docs/PLAN_PERSONAJE_SKETCHBOOK.md`), las siguientes fases son:

### Fase 2: Sistema de Estados (MEDIA PRIORIDAD)
- Implementar `CharacterStateBase`
- Crear estados: `Idle`, `Walk`, `Run`, `Jump`, `Fall`
- Sistema de transiciones entre estados

### Fase 3: Física de Caída Mejorada (MEDIA PRIORIDAD)
- Detección de impacto con el suelo
- Animaciones de caída suave vs caída fuerte
- Sistema de "roll" al caer desde altura

### Fase 4: Estados de Vehículo (BAJA PRIORIDAD)
- `Driving`, `EnteringVehicle`, `ExitingVehicle`
- Sincronización con sistema de vehículos

---

## 📚 Referencias

- **Sketchbook Character.md**: `docs/Sketchbook/character/Character.md`
- **Plan de Implementación**: `docs/PLAN_PERSONAJE_SKETCHBOOK.md`
- **Código Original**: Líneas 586-588 de `Character.md`

---

## ✅ Checklist de Implementación

- [x] Agregar constantes de inclinación a `game.ts`
- [x] Crear `tiltContainerRef` en `AnimatedCharacter`
- [x] Implementar cálculo de velocidad angular
- [x] Implementar cálculo de velocidad lineal
- [x] Aplicar inclinación lateral (rotation.z)
- [x] Aplicar compensación vertical (position.y)
- [x] Agregar suavizado con `lerp`
- [x] Limitar a jugador local solamente
- [x] Documentar implementación
- [ ] Probar en juego y ajustar valores si es necesario

---

## 🎨 Notas de Diseño

### Por qué funciona

La inclinación del personaje es un detalle visual que mejora significativamente la percepción de movimiento:

1. **Física intuitiva**: Los humanos se inclinan naturalmente al girar para mantener el equilibrio
2. **Feedback visual**: El jugador puede "sentir" la velocidad de giro
3. **Dinamismo**: Hace que el personaje se vea más vivo y reactivo

### Consideraciones técnicas

- **Solo jugador local**: Para evitar conflictos con la interpolación de red
- **Suavizado**: El `lerp` evita cambios bruscos que se verían artificiales
- **Compensación vertical**: Crítica para mantener los pies en el suelo

---

**Implementado por:** AI Assistant  
**Basado en:** Sketchbook by swift502  
**Fecha:** 10 de noviembre de 2025

