# 🎮 Plan: Sistema de Personaje de Sketchbook

**Fecha:** 2025-11-10  
**Estado:** 📋 Planificación

---

## 🎯 Objetivo

Implementar las características del sistema de personaje de Sketchbook para mejorar la física, movimiento y sensación del personaje en Hotel Humboldt.

---

## 📊 ¿Qué Tenemos Actualmente?

### ✅ Ya Implementado:
- Movimiento básico (WASD)
- Física con Cannon.js (CapsuleCollider)
- Cámara de tercera persona
- Sistema de stamina
- Animaciones básicas (idle, walk, run)
- Interacción con vehículos (entrar/salir)

### ❌ Lo que Nos Falta de Sketchbook:
- Sistema de estados (State Machine)
- Inclinación del personaje al moverse
- Física de caída mejorada
- Transiciones suaves entre estados
- Mejor control de salto
- Estados de vehículo (Driving, EnteringVehicle, ExitingVehicle)

---

## 🚀 Características a Implementar (Prioridad)

### 🥇 **Fase 1: Inclinación del Personaje** (ALTA PRIORIDAD)
**Impacto:** 🔥🔥🔥🔥🔥  
**Dificultad:** ⭐⭐  
**Tiempo estimado:** 1-2 horas

**¿Qué es?**
El personaje se inclina sutilmente en la dirección del movimiento, como en juegos AAA.

**Archivos de referencia:**
- `docs/Sketchbook/character/Character.md` (líneas con `tiltContainer`)
- `docs/Sketchbook/core/FunctionLibrary.md` (VectorSpringSimulator)

**Implementación:**
1. Crear `VectorSpringSimulator` (similar a `SpringSimulator` pero para vectores)
2. Agregar `tiltContainer` al modelo del personaje
3. Calcular inclinación basada en velocidad
4. Aplicar rotación suave al torso

**Beneficios:**
- ✅ Movimiento más natural y fluido
- ✅ Sensación premium (como GTA V, RDR2)
- ✅ Feedback visual inmediato de la dirección

---

### 🥈 **Fase 2: Sistema de Estados Básico** (MEDIA PRIORIDAD)
**Impacto:** 🔥🔥🔥🔥  
**Dificultad:** ⭐⭐⭐⭐  
**Tiempo estimado:** 3-4 horas

**¿Qué es?**
Máquina de estados que controla el comportamiento del personaje.

**Archivos de referencia:**
- `docs/Sketchbook/character/character-state/CharacterStateBase.md`
- `docs/Sketchbook/character/character-state/Idle.md`
- `docs/Sketchbook/character/character-state/Walk.md`
- `docs/Sketchbook/character/character-state/Sprint.md`

**Estados a implementar:**
1. `Idle` - Quieto
2. `Walk` - Caminando
3. `Sprint` - Corriendo
4. `JumpIdle` - Saltando desde quieto
5. `Falling` - Cayendo

**Implementación:**
1. Crear clase base `CharacterStateBase`
2. Crear estados individuales
3. Sistema de transiciones
4. Integrar con animaciones existentes

**Beneficios:**
- ✅ Código más organizado y mantenible
- ✅ Fácil agregar nuevos comportamientos
- ✅ Transiciones suaves entre acciones
- ✅ Base para características futuras

---

### 🥉 **Fase 3: Física de Caída Mejorada** (MEDIA PRIORIDAD)
**Impacto:** 🔥🔥🔥  
**Dificultad:** ⭐⭐  
**Tiempo estimado:** 1 hora

**¿Qué es?**
Mejor detección de caída, animaciones y daño por caída.

**Archivos de referencia:**
- `docs/Sketchbook/character/character-state/Falling.md`
- `docs/Sketchbook/character/character-state/DropRolling.md`
- `docs/Sketchbook/character/GroundImpactData.md`

**Implementación:**
1. Detectar cuando el personaje está en el aire
2. Estado `Falling` con animación
3. Calcular velocidad de impacto
4. Daño por caída basado en velocidad
5. Animación de aterrizaje (roll si es alta velocidad)

**Beneficios:**
- ✅ Más realista
- ✅ Daño por caída más preciso
- ✅ Animaciones de aterrizaje

---

### 🏅 **Fase 4: Estados de Vehículo** (BAJA PRIORIDAD)
**Impacto:** 🔥🔥🔥  
**Dificultad:** ⭐⭐⭐⭐⭐  
**Tiempo estimado:** 4-6 horas

**¿Qué es?**
Estados específicos para interacción con vehículos.

**Archivos de referencia:**
- `docs/Sketchbook/character/character-state/vehicule-state/Driving.md`
- `docs/Sketchbook/character/character-state/vehicule-state/EnteringVehicle.md`
- `docs/Sketchbook/character/character-state/vehicule-state/ExitingVehicle.md`

**Estados a implementar:**
1. `EnteringVehicle` - Animación de entrar
2. `Driving` - Conduciendo
3. `ExitingVehicle` - Animación de salir
4. `OpenVehicleDoor` - Abrir puerta
5. `CloseVehicleDoor` - Cerrar puerta

**Beneficios:**
- ✅ Transiciones suaves al entrar/salir
- ✅ Animaciones de puertas
- ✅ Más inmersivo

---

## 📋 Plan de Implementación Recomendado

### Semana 1: Inclinación del Personaje
```
Día 1-2:
  ✅ Crear VectorSpringSimulator
  ✅ Implementar inclinación básica
  ✅ Ajustar parámetros
  ✅ Testing y pulido
```

### Semana 2: Física de Caída
```
Día 3-4:
  ✅ Estado Falling
  ✅ Detección de impacto
  ✅ Daño por caída
  ✅ Animaciones de aterrizaje
```

### Semana 3: Sistema de Estados (Opcional)
```
Día 5-8:
  ✅ CharacterStateBase
  ✅ Estados básicos (Idle, Walk, Sprint)
  ✅ Sistema de transiciones
  ✅ Integración con código existente
```

---

## 🎨 Comparación: Antes vs Después

### Inclinación del Personaje

**ANTES:**
- Personaje rígido, sin inclinación
- Movimiento robótico
- Sin feedback visual de dirección

**DESPUÉS (con Sketchbook):**
- ✅ Inclinación suave al moverse
- ✅ Torso rota según velocidad
- ✅ Sensación natural y fluida
- ✅ Feedback visual inmediato

### Sistema de Estados

**ANTES:**
```typescript
// Lógica mezclada en un solo archivo
if (isMoving) {
  // código de caminar
} else if (isJumping) {
  // código de saltar
} else {
  // código de idle
}
```

**DESPUÉS (con Sketchbook):**
```typescript
// Estados separados y organizados
class Idle extends CharacterStateBase {
  update() { /* lógica de idle */ }
  onInputChange() { /* transiciones */ }
}

class Walk extends CharacterStateBase {
  update() { /* lógica de caminar */ }
  onInputChange() { /* transiciones */ }
}
```

---

## 🛠️ Herramientas Necesarias

### Archivos de Sketchbook a Revisar:
1. **`Character.md`** - Clase principal (989 líneas)
2. **`CharacterStateBase.md`** - Base de estados
3. **`FunctionLibrary.md`** - Funciones matemáticas (374 líneas)
4. **Estados específicos** - Idle.md, Walk.md, Sprint.md, etc.

### Nuevos Archivos a Crear:
1. `src/lib/physics/VectorSpringSimulator.ts` - Para inclinación
2. `src/lib/character/CharacterStateBase.ts` - Base de estados (opcional)
3. `src/lib/character/states/` - Carpeta de estados (opcional)

---

## 💡 Recomendación

**Empezar con Fase 1: Inclinación del Personaje**

**¿Por qué?**
- ✅ Impacto visual inmediato
- ✅ Relativamente fácil de implementar
- ✅ No requiere refactorización grande
- ✅ Mejora significativa en la sensación del juego
- ✅ Puedes verlo funcionando en minutos

**Siguiente:** Física de Caída (Fase 3)
- También fácil de implementar
- Gran impacto en gameplay
- No requiere sistema de estados

**Último:** Sistema de Estados (Fase 2)
- Más complejo
- Requiere refactorización
- Mejor hacerlo cuando tengamos más características

---

## 📚 Recursos

**Documentación:**
- `docs/Sketchbook/README.md` - Guía completa
- `docs/Sketchbook/character/` - Todo sobre personajes
- `docs/Sketchbook/core/FunctionLibrary.md` - Funciones útiles

**Ejemplos de código:**
- Todos los archivos `.md` en `docs/Sketchbook/` contienen código completo
- Puedes copiar y adaptar directamente

---

## 🎯 Próxima Sesión: Empezar con Inclinación

**Pasos:**
1. Leer `Character.md` (buscar `tiltContainer`)
2. Crear `VectorSpringSimulator.ts`
3. Implementar inclinación básica
4. Ajustar y probar

**Tiempo estimado:** 1-2 horas  
**Dificultad:** ⭐⭐  
**Impacto:** 🔥🔥🔥🔥🔥

---

**¡Listo para implementar características de personaje de Sketchbook! 🎮✨**

