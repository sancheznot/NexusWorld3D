# 📝 Fase 5: Mejoras Avanzadas de Física (Sketchbook Integration)

**Fecha:** 2025-11-10  
**Estado:** ✅ Completado

---

## 🎯 Objetivo

Integrar las mejoras avanzadas de física del repositorio **Sketchbook** de swift502 para llevar la física de vehículos al siguiente nivel.

---

## 📚 Referencia

Código base tomado de:
- **Repositorio:** https://github.com/swift502/Sketchbook
- **Archivo principal:** `docs/Sketchbook/vehicles/Car.md`
- **Funciones matemáticas:** `docs/Sketchbook/core/FunctionLibrary.md`

---

## ✅ Mejoras Implementadas

### 1. Sistema de Física de Aire Mejorado 🚁

**Inspirado en:** `Car.md` líneas 180-235 (método `physicsPreStep`)

#### ¿Qué se mejoró?

**ANTES:**
```typescript
// Sistema simple: control instantáneo en el aire
if (isInAir && state.airSpinTimer > 0.2) {
  const airTorque = new CANNON.Vec3(0, input.steer * 5, 0);
  chassis.applyTorque(airTorque);
}
```

**AHORA (Sketchbook):**
```typescript
// Sistema gradual: control crece hasta 2 segundos
const airSpinInfluence = Math.min(state.airSpinTimer / 2, 1) * Math.min(Math.abs(forwardSpeed), 1);

// Factor de flip: más fácil hacer flips a baja velocidad
const flipSpeedFactor = Math.max(1 - Math.abs(forwardSpeed), 0);

// Detectar si está boca abajo
const chassisUp = chassis.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
const upFactor = (chassisUp.dot(new CANNON.Vec3(0, -1, 0)) / 2) + 0.5;
const flipOverInfluence = flipSpeedFactor * upFactor * 3;
```

#### Beneficios:
- ✅ Control en el aire más realista (crece gradualmente)
- ✅ Más fácil hacer flips a baja velocidad
- ✅ Auto-corrección cuando está boca abajo
- ✅ Control proporcional a la velocidad

#### Parámetros:
- `airSpinInfluence`: Crece de 0 a 1 en 2 segundos
- `maxAirSpinMagnitude`: 2.0 (límite de velocidad angular)
- `airSpinAcceleration`: 0.15 (aceleración de rotación)

---

### 2. Drift Correction (Corrección de Derrape) 🏎️

**Inspirado en:** `Car.md` líneas 236-254 (steering con drift correction)

#### ¿Qué es?

Un sistema que calcula el ángulo entre la **dirección del vehículo** y la **dirección de la velocidad** para ayudar a corregir derrapes automáticamente.

#### Implementación:

```typescript
// Calcular drift correction (ángulo entre velocidad y dirección)
const velocity = new CANNON.Vec3().copy(chassis.velocity);
velocity.normalize();

const forward = chassis.quaternion.vmult(new CANNON.Vec3(0, 0, 1));

// Calcular ángulo usando producto cruz para determinar el signo
const cross = new CANNON.Vec3();
forward.cross(velocity, cross);
const dotProduct = forward.dot(velocity);
const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

driftCorrection = cross.y < 0 ? -angle : angle;
```

#### Uso en Steering:

```typescript
if (input.steer > 0.01) {
  // Girando a la derecha: limitar por drift correction
  const steering = Math.min(-maxSteer / speedFactor, -driftCorrection);
  steeringSimulator.target = clamp(steering, -maxSteer, maxSteer);
}
```

#### Beneficios:
- ✅ Ayuda a enderezar el vehículo automáticamente
- ✅ Previene derrapes excesivos
- ✅ Sensación más realista de conducción
- ✅ Más fácil controlar el vehículo en curvas

---

### 3. Speed Factor en Steering (Dirección más difícil a alta velocidad) 🏁

**Inspirado en:** `Car.md` línea 242

#### ¿Qué es?

Un factor que hace que sea más difícil girar a alta velocidad (como en la vida real).

#### Implementación:

```typescript
// Speed factor de Sketchbook: más difícil girar a alta velocidad
const speedFactor = Math.max(Math.abs(forwardSpeed) * 0.3, 1);

// Aplicar al steering
const steering = maxSteer / speedFactor;
```

#### Comparación:

| Velocidad | Speed Factor | Steering Máximo | Sensación |
|-----------|--------------|-----------------|-----------|
| 0 m/s | 1.0 | 0.6 rad | Giro completo |
| 10 m/s | 3.0 | 0.2 rad | Giro reducido |
| 20 m/s | 6.0 | 0.1 rad | Giro mínimo |
| 30 m/s | 9.0 | 0.067 rad | Muy difícil girar |

#### Beneficios:
- ✅ Más realista (como carros reales)
- ✅ Previene giros bruscos a alta velocidad
- ✅ Fuerza al jugador a frenar antes de curvas
- ✅ Mejor balance arcade/simulación

---

### 4. Sistema de Volante Visual 🎮

**Inspirado en:** `Car.md` línea 141

#### ¿Qué es?

Rotación del volante visual del modelo 3D basada en el steering actual.

#### Implementación:

**En `cannonPhysics.ts`:**
```typescript
/**
 * Obtiene el steering actual del vehículo (para animación de volante)
 */
getVehicleSteering(id: string): number {
  const state = this.vehicleState.get(id);
  if (!state?.steeringSimulator) return 0;
  
  // Normalizar a rango -1 a 1 (maxSteer es 0.6)
  return state.steeringSimulator.position / 0.6;
}
```

**En `CannonCar.tsx`:**
```typescript
// Buscar volante en el modelo
cloned.traverse((child) => {
  const name = child.name.toLowerCase();
  if (name.includes('steering') || name.includes('volante')) {
    steeringWheel = child;
  }
});

// Rotar volante en cada frame
if (steeringWheelRef.current) {
  const steering = physics.getVehicleSteering(id);
  // Rotación en Z: -steering * 2 radianes (~115° máximo)
  steeringWheelRef.current.rotation.z = -steering * 2;
}
```

#### Beneficios:
- ✅ Feedback visual inmediato
- ✅ Más inmersivo
- ✅ Ayuda a entender el steering actual
- ✅ Profesional (como juegos AAA)

#### Nombres de volante soportados:
- `steering`
- `volante`
- `wheel` (excluyendo `tire` y `rim`)

---

## 📊 Comparación: Antes vs Después

### Física de Aire

| Aspecto | Antes (Fase 1-4) | Ahora (Fase 5) |
|---------|------------------|----------------|
| **Control en aire** | Instantáneo (0.2s) | Gradual (2s) |
| **Influencia velocidad** | No | Sí (proporcional) |
| **Flip factor** | No | Sí (más fácil a baja velocidad) |
| **Auto-corrección** | No | Sí (cuando está boca abajo) |
| **Realismo** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### Steering (Dirección)

| Aspecto | Antes (Fase 1-4) | Ahora (Fase 5) |
|---------|------------------|----------------|
| **Drift correction** | No | Sí (auto-enderezamiento) |
| **Speed factor** | Atenuación simple | Factor realista de Sketchbook |
| **Alta velocidad** | Difícil controlar | Muy difícil (realista) |
| **Baja velocidad** | Normal | Fácil (realista) |
| **Volante visual** | No | Sí (rotación sincronizada) |
| **Realismo** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🧪 Cómo Probar

### Test 1: Física de Aire Mejorada
```
1. Buscar una rampa o colina
2. Saltar con el vehículo
3. ✅ Observar: Control crece gradualmente (no instantáneo)
4. Intentar hacer flips a baja velocidad
5. ✅ Observar: Más fácil que a alta velocidad
6. Voltear el vehículo boca abajo
7. ✅ Observar: Auto-corrección gradual
```

### Test 2: Drift Correction
```
1. Acelerar a velocidad media (30-40 km/h)
2. Girar bruscamente (A o D)
3. Soltar la tecla de dirección
4. ✅ Observar: El vehículo se endereza automáticamente
5. ✅ Observar: No sigue derrapando indefinidamente
```

### Test 3: Speed Factor
```
1. Acelerar al máximo (5ta marcha, 79 km/h)
2. Intentar girar (A o D)
3. ✅ Observar: Muy difícil girar (realista)
4. Frenar a velocidad baja (1ra marcha, 18 km/h)
5. Intentar girar
6. ✅ Observar: Mucho más fácil girar
```

### Test 4: Volante Visual
```
1. Entrar al vehículo (F)
2. Cambiar a vista interior (si está disponible)
3. Girar con A o D
4. ✅ Observar: El volante rota suavemente
5. ✅ Observar: Rotación máxima ~115° (realista)
6. Soltar la tecla
7. ✅ Observar: El volante vuelve al centro suavemente
```

---

## 📂 Archivos Modificados

### 1. `src/lib/three/cannonPhysics.ts`

**Cambios:**
```
+ Sistema de física de aire mejorado (líneas 690-757)
  - airSpinInfluence gradual
  - flipSpeedFactor
  - upFactor para auto-corrección
  
+ Drift correction en steering (líneas 660-718)
  - Cálculo de ángulo entre velocidad y dirección
  - Corrección automática de derrapes
  
+ Speed factor realista (línea 686)
  - speedFactor = max(abs(forwardSpeed) * 0.3, 1)
  
+ Método getVehicleSteering() (líneas 969-980)
  - Para animación de volante visual
```

**Líneas modificadas:** ~80  
**Líneas agregadas:** ~60

### 2. `src/components/vehicles/CannonCar.tsx`

**Cambios:**
```
+ Búsqueda de volante en modelo (líneas 28-50)
  - Detecta por nombre: steering, volante, wheel
  
+ Rotación de volante visual (líneas 148-154)
  - Sincronizada con steering actual
  - Rotación en Z: -steering * 2 radianes
```

**Líneas modificadas:** ~15  
**Líneas agregadas:** ~30

---

## 🎉 Resumen de Fase 5

### ✅ Todas las Mejoras Implementadas

| Mejora | Inspiración | Impacto | Complejidad |
|--------|-------------|---------|-------------|
| Física de aire mejorada | Sketchbook Car.md | 🔥🔥🔥🔥🔥 | Media |
| Drift correction | Sketchbook Car.md | 🔥🔥🔥🔥🔥 | Alta |
| Speed factor | Sketchbook Car.md | 🔥🔥🔥🔥 | Baja |
| Volante visual | Sketchbook Car.md | 🔥🔥🔥 | Media |

### 📈 Progreso Total

**Fases completadas:**
- ✅ Fase 1: SpringSimulator, Torque Curve, Air Physics
- ✅ Fase 2: Sistema de Transmisión (5 marchas + R)
- ✅ Fase 3: Vehicle HUD (Marcha, Velocidad, RPM)
- ✅ Fase 4: Correcciones Críticas (Dirección, Reversa, Freno, Anti-vuelco)
- ✅ **Fase 5: Mejoras Avanzadas (Sketchbook Integration)** ⭐ NUEVO

**Total de mejoras:** 20+ características implementadas

---

## 🚀 Resultado Final

**El vehículo ahora tiene física de nivel AAA:**
- ✅ Sistema de transmisión completo (5 marchas + R)
- ✅ Dirección suave con SpringSimulator
- ✅ Drift correction automático
- ✅ Speed factor realista
- ✅ Física de aire gradual y realista
- ✅ Volante visual sincronizado
- ✅ HUD profesional
- ✅ Sistema anti-vuelco
- ✅ Curva de potencia del motor
- ✅ Freno de mano funcional

---

## 💡 Próximos Pasos (Opcionales)

### Opción A: Más Mejoras de Vehículo
- ⬜ Sonidos del motor (según RPM y marcha)
- ⬜ Partículas de polvo/humo
- ⬜ Daño del vehículo
- ⬜ Más tipos de vehículos (helicóptero, avión)

### Opción B: Mejoras de Personaje (Sketchbook)
- ⬜ Sistema de estados del personaje
- ⬜ Física de caída mejorada
- ⬜ Inclinación del personaje al moverse
- ⬜ Animaciones suaves con transiciones

### Opción C: Optimización
- ⬜ Optimizar rendimiento
- ⬜ Mejorar colisiones
- ⬜ Testing exhaustivo

---

## 📚 Referencias

- **Sketchbook Repository:** https://github.com/swift502/Sketchbook
- **Código de referencia:** `docs/Sketchbook/vehicles/Car.md`
- **Funciones matemáticas:** `docs/Sketchbook/core/FunctionLibrary.md`
- **Changelog completo:** `docs/CHANGELOG_VEHICULOS.md`
- **Resumen del proyecto:** `docs/RESUMEN_ESTADO_ACTUAL.md`

---

**¡Fase 5 completada con éxito! 🎊**

**Créditos:** Código inspirado en **Sketchbook** de swift502 (Jan Bláha)

