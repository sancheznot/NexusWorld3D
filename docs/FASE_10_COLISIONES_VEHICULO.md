# 🚗 Fase 10: Colisiones de Vehículo Mejoradas (Sketchbook)

**Fecha:** 2025-11-12  
**Estado:** ✅ COMPLETADA  
**Tiempo:** ~3 horas

---

## 🎯 Objetivo

Mejorar el sistema de colisiones del vehículo para que detecte correctamente objetos con Trimesh colliders (árboles, edificios, escaleras) sin frenar el vehículo en terreno plano.

---

## 🔍 Problema Inicial

**Síntomas:**
- ❌ Vehículo atravesaba árboles sin colisionar
- ❌ Vehículo atravesaba edificios sin colisionar
- ❌ Vehículo atravesaba escaleras/rampas sin colisionar
- ✅ Vehículo SÍ colisionaba con UCX boxes (postes, cilindros)
- ✅ Player SÍ colisionaba con todo correctamente

**Causa raíz identificada:**
El **chasis del vehículo estaba muy ALTO** (Y=1.0 + offset 0.4 = 1.4m del suelo), mientras que los Trimesh colliders de árboles/edificios están a nivel del suelo. El box verde (chasis) flotaba sobre las ruedas, dejando un hueco donde los objetos podían pasar.

---

## 💡 Solución Implementada (Sketchbook)

### **1. Esferas en las Esquinas**

Agregar 4 esferas de colisión en las esquinas del vehículo (donde estarían las ruedas) para detectar colisiones a nivel del suelo.

**Configuración final:**
```typescript
const sphereRadius = 0.7; // Radio GRANDE para cubrir más área lateral
const sphereOffsetY = 0.7; // Altura para NO golpear el piso
const sphereOffsetX = 0.7; // Separación horizontal (ancho del carro)
const sphereOffsetZ = 1.6; // Separación longitudinal (largo del carro)
```

**Posiciones:**
- Delante izquierda: `(-0.7, 0.7, 1.6)`
- Delante derecha: `(0.7, 0.7, 1.6)`
- Atrás izquierda: `(-0.7, 0.7, -1.6)`
- Atrás derecha: `(0.7, 0.7, -1.6)`

**Material:**
- `vehicleMaterial` (baja fricción) para evitar frenado

**CollisionGroups:**
- `collisionFilterGroup: CollisionGroups.Vehicles (8)`
- `collisionFilterMask: CollisionMasks.VehicleBody (~4 = -5)`

### **2. Cilindro Horizontal Central**

Agregar un cilindro horizontal en el centro del vehículo para cubrir el hueco entre las 4 esferas.

**Configuración:**
```typescript
const cylinderRadius = 0.5; // Radio del cilindro
const cylinderLength = 3.0; // Longitud (cubre todo el largo del vehículo)
```

**Orientación:**
- Rotado 90° en X para quedar horizontal (eje Z, frente-atrás)
- Posición: `(0, 0.7, 0)` - Centro del vehículo, misma altura que esferas

**Material y CollisionGroups:**
- Igual que las esferas (baja fricción, Vehicles group)

### **3. Steering Aumentado**

Aumentar el ángulo máximo de cruce de las ruedas para mejor maniobrabilidad.

**Progresión:**
- Original: `0.6 rad` (~34°)
- Primera mejora: `0.72 rad` (~41°) - +20%
- Segunda mejora: `0.85 rad` (~49°) - +42%
- **Final: `0.95 rad` (~54°) - +58%**

---

## 📊 Configuración Final del Vehículo

### **Shapes del Chasis:**

| Shape | Posición Y | Dimensiones | Material | Función |
|-------|-----------|-------------|----------|---------|
| **Box (chasis)** | 0.4m | 1.6x1.0x3.8m | vehicleMaterial | Cuerpo principal |
| **4 Esferas** | 0.7m | Radio 0.7m | vehicleMaterial | Detección lateral |
| **1 Cilindro** | 0.7m | Radio 0.5m, Largo 3.0m | vehicleMaterial | Cubre hueco central |

### **CollisionGroups:**
- Todas las shapes: `CollisionGroups.Vehicles (8)`
- Todas las shapes: `CollisionMasks.VehicleBody (~4 = -5)`

### **Material:**
- Todas las shapes: `vehicleMaterial` (baja fricción)

---

## 🔧 Archivos Modificados

### **`src/lib/three/cannonPhysics.ts`**

**Líneas 537-558: Esferas en esquinas**
```typescript
// 🎯 SKETCHBOOK: Agregar esferas en las esquinas para detectar colisiones laterales
const sphereRadius = 0.7;
const sphereOffsetY = 0.7;
const sphereOffsetX = 0.7;
const sphereOffsetZ = 1.6;

const cornerSphere = new CANNON.Sphere(sphereRadius);
cornerSphere.collisionFilterGroup = CollisionGroups.Vehicles;
cornerSphere.collisionFilterMask = CollisionMasks.VehicleBody;
cornerSphere.material = this.vehicleMaterial;

// 4 esferas en las esquinas
chassisBody.addShape(cornerSphere, new CANNON.Vec3(-sphereOffsetX, sphereOffsetY, sphereOffsetZ));
chassisBody.addShape(cornerSphere, new CANNON.Vec3(sphereOffsetX, sphereOffsetY, sphereOffsetZ));
chassisBody.addShape(cornerSphere, new CANNON.Vec3(-sphereOffsetX, sphereOffsetY, -sphereOffsetZ));
chassisBody.addShape(cornerSphere, new CANNON.Vec3(sphereOffsetX, sphereOffsetY, -sphereOffsetZ));
```

**Líneas 560-574: Cilindro horizontal central**
```typescript
// 🎯 Cilindro horizontal en el medio para cubrir el hueco central
const cylinderRadius = 0.5;
const cylinderLength = 3.0;
const cylinderShape = new CANNON.Cylinder(cylinderRadius, cylinderRadius, cylinderLength, 8);
cylinderShape.collisionFilterGroup = CollisionGroups.Vehicles;
cylinderShape.collisionFilterMask = CollisionMasks.VehicleBody;
cylinderShape.material = this.vehicleMaterial;

// Rotar 90° en X para que quede horizontal (eje Z)
const cylinderQuaternion = new CANNON.Quaternion();
cylinderQuaternion.setFromEuler(Math.PI / 2, 0, 0);

chassisBody.addShape(cylinderShape, new CANNON.Vec3(0, sphereOffsetY, 0), cylinderQuaternion);
```

**Líneas 566-579: Logs de colisión filtrados**
```typescript
// DEBUG: Escuchar eventos de colisión del vehículo (solo objetos importantes)
let lastLogTime = 0;
chassisBody.addEventListener('collide', (event: any) => {
  const otherBody = event.body as CANNON.Body;
  const bodyId = Array.from(this.bodies.entries()).find(([_, b]) => b === otherBody)?.[0] || 'unknown';
  // Solo loguear colisiones con árboles, edificios, rocas (no terreno/ground)
  if (bodyId.includes('Tree_') || bodyId.includes('Building') || bodyId.includes('Rock') || bodyId.includes('SM_') || bodyId.includes('UCX_')) {
    const now = Date.now();
    if (now - lastLogTime > 500) { // Throttle: 1 log cada 500ms
      console.log(`🚗💥 Vehicle collided with: ${bodyId}`);
      lastLogTime = now;
    }
  }
});
```

### **`src/constants/game.ts`**

**Línea 95: Steering aumentado**
```typescript
maxSteer: 0.95, // Ángulo máximo de dirección - Aumentado ~58% (0.6 → 0.95 rad / ~54°)
```

---

## 🐛 Problemas Encontrados y Soluciones

### **Problema 1: Esferas muy bajas → Vibración con el suelo**

**Síntoma:**
```
🚗💥 Vehicle collided with: unknown (group=1, mask=-1)
🚗💥 Vehicle collided with: city-hills-Terrain_01-137 (group=1, mask=-1)
```
Cámara vibraba constantemente, vehículo no avanzaba.

**Causa:**
Esferas con `sphereOffsetY = -0.3` tocaban el suelo constantemente.

**Solución:**
Subir esferas: `-0.3` → `0.2` → `0.5` → `0.7` (final)

### **Problema 2: Hueco en el medio del vehículo**

**Síntoma:**
Objetos pequeños pasaban entre las 4 esferas sin colisionar.

**Solución:**
Agregar cilindro horizontal en el centro del vehículo.

### **Problema 3: Vibración en rampas complejas**

**Síntoma:**
Al subir rampas de parking (Trimesh complejo), el vehículo vibraba.

**Causa:**
Trimesh con geometría compleja (muchos triángulos) genera colisiones múltiples.

**Solución parcial:**
- Aplicar `vehicleMaterial` (baja fricción) a todas las shapes
- Subir esferas a Y=0.7m
- **Solución definitiva:** Crear UCX boxes en Blender para rampas (futuro)

---

## ✅ Resultados

### **Colisiones:**
- ✅ Vehículo colisiona correctamente con árboles (Trimesh)
- ✅ Vehículo colisiona correctamente con edificios (Trimesh/Mesh)
- ✅ Vehículo colisiona correctamente con escaleras (Trimesh)
- ✅ Vehículo colisiona correctamente con postes UCX (Box)
- ✅ Vehículo colisiona correctamente con rocas (Trimesh)
- ✅ Sin huecos en el medio (cilindro central)

### **Física:**
- ✅ Vehículo avanza suavemente en terreno plano
- ✅ Sin vibración en terreno plano
- ✅ Sin frenado inesperado
- ⚠️ Vibración leve en rampas complejas (tolerable, normal con Trimesh)

### **Maniobrabilidad:**
- ✅ Giros muy cerrados (54° de cruce)
- ✅ Mejor control en curvas
- ✅ Más realista y divertido

---

## 📈 Comparación: Antes vs Después

### **ANTES:**

**Colisiones:**
```
❌ Atraviesa árboles
❌ Atraviesa edificios
❌ Atraviesa escaleras
✅ Colisiona con UCX boxes
```

**Shapes del vehículo:**
```
- 1 Box (chasis): Y=0.4m
- Total: 1 shape
```

**Steering:**
```
- 0.6 rad (~34°)
```

### **DESPUÉS (Sketchbook):**

**Colisiones:**
```
✅ Colisiona con árboles
✅ Colisiona con edificios
✅ Colisiona con escaleras
✅ Colisiona con UCX boxes
✅ Sin huecos
```

**Shapes del vehículo:**
```
- 1 Box (chasis): Y=0.4m
- 4 Esferas (esquinas): Y=0.7m, radio 0.7m
- 1 Cilindro (centro): Y=0.7m, radio 0.5m, largo 3.0m
- Total: 6 shapes
```

**Steering:**
```
- 0.95 rad (~54°) - +58%
```

---

## 🎨 Visualización

```
Vista Superior del Vehículo:
        
        [Esfera]━━━━━━━━━[Esfera]
           ║  Cilindro  ║
           ║  Horizontal ║
           ║     ━━━     ║
           ║   [Box]    ║
           ║     ━━━     ║
        [Esfera]━━━━━━━━━[Esfera]

Vista Lateral:
        
        ┌─────────────┐
        │    Box      │ Y=0.4m
        └─────────────┘
        
        ●━━━━━━━━━━━━━● Y=0.7m (Esferas + Cilindro)
        
        ═══════════════ Y=0 (Suelo)
```

---

## 🔮 Próximos Pasos

### **Optimización de Colisiones:**
1. Crear UCX boxes en Blender para rampas de parking
2. Simplificar Trimesh de edificios complejos
3. Optimizar geometría de escaleras

### **Más Features de Sketchbook:**
1. Sonidos del motor (según RPM)
2. Partículas de polvo/humo
3. Daño del vehículo
4. Más tipos de vehículos

### **Personaje:**
1. Continuar con sistema de estados
2. Mejoras de animaciones
3. Estados de vehículo (driving, entering, exiting)

---

## 📚 Referencias

**Sketchbook:**
- `docs/Sketchbook/vehicles/RaycastVehicle.md`
- Concepto de múltiples shapes para detección de colisiones

**Implementación:**
- Inspirado en Sketchbook pero adaptado a nuestro sistema
- Esferas + Cilindro = cobertura completa sin huecos
- Material de baja fricción = sin frenado inesperado

---

## 💡 Lecciones Aprendidas

1. **Cannon.js usa CollisionGroups del BODY, no del SHAPE** cuando el body tiene múltiples shapes
2. **Las esferas deben estar ARRIBA del suelo** para no causar fricción constante
3. **Un cilindro central** es necesario para cubrir el hueco entre esferas
4. **Material de baja fricción** es crítico para evitar frenado en rampas
5. **Trimesh complejos** siempre generan vibración - mejor usar UCX boxes

---

**¡Fase 10 completada con éxito! 🚗💥✨**

El vehículo ahora colisiona correctamente con todos los objetos del mundo, sin huecos y sin frenado inesperado.

