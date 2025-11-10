# 🎮 Plan: Sistema de Personaje de Sketchbook

**Fecha:** 2025-11-10  
**Estado:** 🚀 En Progreso - Fases 1 y 3 Completadas ✅✅

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
- **Inclinación del personaje al moverse** ⭐ (Fase 1/6)
- **Física de caída mejorada con 3 niveles** ⭐ (Fase 3/7)

### ❌ Lo que Nos Falta de Sketchbook:
- Sistema de estados (State Machine)
- Transiciones suaves entre estados
- Mejor control de salto
- Estados de vehículo (Driving, EnteringVehicle, ExitingVehicle)
- Mejoras de colisiones (mallas, CollisionGroups)

---

## 🚀 Características a Implementar (Prioridad)

### ✅ **Fase 1: Inclinación del Personaje** (COMPLETADA) ⭐
**Impacto:** 🔥🔥🔥🔥🔥  
**Dificultad:** ⭐⭐  
**Tiempo real:** 2 horas

**¿Qué se implementó?**
El personaje se inclina sutilmente en la dirección del movimiento, proporcional a la velocidad.

**Implementación realizada:**
1. ✅ Agregar `tiltContainer` al modelo del personaje
2. ✅ Calcular velocidad angular basada en rotación
3. ✅ Aplicar rotación en eje Z proporcional a velocidad
4. ✅ Compensación vertical para mantener pies en el suelo
5. ✅ Factor de velocidad para inclinación proporcional
6. ✅ Límite máximo de inclinación (0.25 rad / ~14°)

**Archivos modificados:**
- ✅ `src/components/world/AnimatedCharacter.tsx`
- ✅ `src/constants/game.ts`
- ✅ `docs/FASE_6_PERSONAJE_INCLINACION.md`

**Resultados:**
- ✅ Inclinación sutil al caminar (~50% del efecto)
- ✅ Inclinación completa al correr (100% del efecto)
- ✅ Sin inclinación al estar parado
- ✅ Movimiento natural y fluido

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

### ✅ **Fase 3: Física de Caída Mejorada** (COMPLETADA) ⭐
**Impacto:** 🔥🔥🔥  
**Dificultad:** ⭐⭐  
**Tiempo real:** 1 hora

**¿Qué se implementó?**
Sistema de detección de caída con 3 niveles de impacto y animaciones apropiadas.

**Implementación realizada:**
1. ✅ Tracking de velocidad mientras está en el aire
2. ✅ Detección de 3 niveles de caída (suave, media, fuerte)
3. ✅ Caída suave (> -2 m/s): sin animación especial
4. ✅ Caída media (-2 a -6 m/s): animación drop_running
5. ✅ Caída fuerte (< -6 m/s): animación roll + 50% menos daño
6. ✅ Sistema de estados (none, falling, landing)
7. ✅ Logs de debug para análisis

**Archivos modificados:**
- ✅ `src/components/world/PlayerV2.tsx`
- ✅ `src/constants/game.ts`
- ✅ `docs/FASE_7_FISICA_CAIDA.md`

**Resultados:**
- ✅ Detección precisa de impacto
- ✅ Daño reducido con roll (50%)
- ✅ Feedback visual según tipo de caída
- ✅ Sistema extensible para futuras mejoras

**Nota:** Usando animaciones placeholder (jump/walking) hasta agregar las reales (falling, drop_running, drop_rolling)

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

## ✅ Fases 1 y 3 Completadas - ¿Qué Sigue?

### 🎯 **Recomendación: Fase 2 - Sistema de Estados**

**¿Por qué esta fase?**
- ✅ Organiza mejor el código existente
- ✅ Facilita agregar nuevas características
- ✅ Base sólida para futuras mejoras
- ✅ Complementa las fases 1 y 3 ya implementadas

**¿Qué implementaremos?**
1. Crear clase base `CharacterStateBase`
2. Implementar estados: `Idle`, `Walk`, `Sprint`, `Jump`, `Fall`
3. Sistema de transiciones entre estados
4. Integrar con animaciones existentes
5. Refactorizar lógica actual a State Machine

**Archivos a modificar:**
- `src/components/world/PlayerV2.tsx` - Refactorizar a estados
- `src/lib/character/states/` - Nuevos archivos de estados
- `src/constants/game.ts` - Constantes de estados

### 🔄 Alternativa: Mejoras de Colisiones

Si prefieres algo más técnico:
- Analizar sistema de mallas de Sketchbook
- Implementar CollisionGroups
- Mejorar colisiones por capas (player, vehicle, world)

---

**Estado actual:** Fases 1 y 3 completadas ✅✅  
**Próximo paso recomendado:** Fase 2 (Sistema de Estados) 🎯  
**Alternativa:** Mejoras de Colisiones 🔄

---

**¡2 de 4 fases completadas exitosamente! (50% progreso) 🎮✨**

