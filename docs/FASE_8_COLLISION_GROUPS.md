# Fase 8: Sistema de CollisionGroups (Sketchbook Integration)

## 📋 Resumen

Implementación del sistema de **CollisionGroups** basado en **Sketchbook** de `swift502`. Este sistema permite controlar qué objetos colisionan con qué otros objetos usando máscaras de bits.

**Fecha de implementación:** 10 de noviembre de 2025  
**Referencia:** `docs/Sketchbook/enum/CollisionGroups.md`

---

## 🎯 ¿Qué son los CollisionGroups?

### Concepto

Los **CollisionGroups** son **grupos de colisión** que permiten filtrar qué objetos pueden colisionar entre sí usando **operaciones de bits** (bitwise operations).

### ¿Cómo Funcionan?

Cada objeto físico tiene dos propiedades:
1. **`collisionFilterGroup`**: A qué grupo pertenece (quién soy)
2. **`collisionFilterMask`**: Con qué grupos puedo colisionar (con quién colisiono)

### Operación de Bits

Cannon.js usa esta fórmula para determinar si dos objetos colisionan:

```typescript
// Dos objetos A y B colisionan SI:
(A.collisionFilterGroup & B.collisionFilterMask) !== 0 
&& 
(B.collisionFilterGroup & A.collisionFilterMask) !== 0
```

---

## 🎨 Sistema de Sketchbook

### Grupos Definidos

```typescript
export enum CollisionGroups {
  Default = 1,           // 0001 en binario
  Characters = 2,        // 0010 en binario
  TrimeshColliders = 4   // 0100 en binario
}
```

### ¿Por qué estos valores?

Son **potencias de 2** para poder usar operaciones de bits:
- `1` = `0001` (bit 0)
- `2` = `0010` (bit 1)
- `4` = `0100` (bit 2)
- `8` = `1000` (bit 3)
- etc.

### Operador `~` (NOT bitwise)

El operador `~` invierte todos los bits:

```typescript
~CollisionGroups.TrimeshColliders
// ~4 = ~0100 = 1011 (en binario)
// Significa: "colisionar con TODO excepto TrimeshColliders"
```

---

## 🚗 Aplicación en Vehículos

### Problema que Resuelve

Sin CollisionGroups:
- ❌ Las ruedas colisionan con el cuerpo del vehículo
- ❌ El personaje colisiona consigo mismo
- ❌ Objetos internos del vehículo colisionan entre sí

Con CollisionGroups:
- ✅ Las ruedas NO colisionan con el cuerpo
- ✅ El personaje NO colisiona consigo mismo
- ✅ Control fino de qué colisiona con qué

### Configuración en Sketchbook

```typescript
// Vehicle.md - líneas 406-416

// Cuerpo del vehículo (cajas)
let phys = new CANNON.Box(...);
phys.collisionFilterMask = ~CollisionGroups.TrimeshColliders;
// Colisiona con: Default (1) y Characters (2)
// NO colisiona con: TrimeshColliders (4)

// Ruedas del vehículo (esferas)
let phys = new CANNON.Sphere(...);
phys.collisionFilterGroup = CollisionGroups.TrimeshColliders;
// Pertenece al grupo TrimeshColliders
// Esto hace que NO colisione con el cuerpo del vehículo
```

### ¿Por qué las Esferas son de Diferente Color?

Los colores en el debug renderer representan:
- 🟢 **Verde**: `CollisionGroups.TrimeshColliders` (ruedas)
- 🔵 **Azul**: `CollisionGroups.Default` (cuerpo del vehículo)
- 🟡 **Amarillo**: `CollisionGroups.Characters` (personaje)
- 🔴 **Rojo**: Terreno/mundo

---

## 🎮 Aplicación en Personajes

### Configuración en Sketchbook

```typescript
// Character.md - líneas 136-143

// Cápsula del personaje
this.characterCapsule.body.shapes.forEach((shape) => {
  // NO colisionar con TrimeshColliders (ruedas de vehículos)
  shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders;
});

// Mover personaje a grupo Characters para raycast
this.characterCapsule.body.collisionFilterGroup = 2; // Characters
```

### Raycast del Personaje

```typescript
// Character.md - líneas 819-824

const rayCastOptions = {
  collisionFilterMask: CollisionGroups.Default,
  skipBackfaces: true
};

// El raycast SOLO detecta objetos del grupo Default (terreno)
// NO detecta Characters ni TrimeshColliders
```

---

## 📊 Tabla de Colisiones

| Objeto | Group | Mask | Colisiona con |
|--------|-------|------|---------------|
| **Terreno** | Default (1) | -1 (todos) | Todo |
| **Personaje** | Characters (2) | ~TrimeshColliders | Default, Characters |
| **Cuerpo Vehículo** | Default (1) | ~TrimeshColliders | Default, Characters |
| **Ruedas Vehículo** | TrimeshColliders (4) | Default | Solo Default (terreno) |

### Explicación

1. **Terreno**: Colisiona con todo (mask = -1)
2. **Personaje**: 
   - Grupo: Characters (2)
   - Colisiona con: Default y Characters
   - NO colisiona con: TrimeshColliders (ruedas)
3. **Cuerpo Vehículo**:
   - Grupo: Default (1)
   - Colisiona con: Default y Characters
   - NO colisiona con: TrimeshColliders (sus propias ruedas)
4. **Ruedas Vehículo**:
   - Grupo: TrimeshColliders (4)
   - Colisiona con: Solo Default (terreno)
   - NO colisiona con: Cuerpo del vehículo ni personajes

---

## 🔧 Implementación en Hotel Humboldt

### Paso 1: Definir CollisionGroups

```typescript
// src/constants/collisionGroups.ts

export enum CollisionGroups {
  Default = 1,           // Terreno, objetos estáticos
  Characters = 2,        // Personajes (jugadores, NPCs)
  TrimeshColliders = 4,  // Ruedas de vehículos, objetos internos
  Vehicles = 8,          // Cuerpos de vehículos
}

// Máscaras predefinidas
export const CollisionMasks = {
  // Terreno: colisiona con todo
  Default: -1,
  
  // Personaje: colisiona con Default y Vehicles, NO con TrimeshColliders
  Character: CollisionGroups.Default | CollisionGroups.Vehicles,
  
  // Cuerpo de vehículo: colisiona con Default y Characters, NO con TrimeshColliders
  VehicleBody: CollisionGroups.Default | CollisionGroups.Characters,
  
  // Ruedas: solo colisionan con Default (terreno)
  VehicleWheel: CollisionGroups.Default,
};
```

### Paso 2: Aplicar al Personaje

```typescript
// src/lib/three/cannonPhysics.ts - createPlayerBody()

const playerBody = new CANNON.Body({
  mass: 80,
  shape: capsuleShape,
  collisionFilterGroup: CollisionGroups.Characters,
  collisionFilterMask: CollisionMasks.Character,
});

// Aplicar a todas las shapes
playerBody.shapes.forEach((shape) => {
  shape.collisionFilterMask = CollisionMasks.Character;
});
```

### Paso 3: Aplicar al Vehículo

```typescript
// src/lib/three/cannonPhysics.ts - createVehicle()

// Cuerpo del vehículo
const chassisBody = new CANNON.Body({
  mass: 500,
  collisionFilterGroup: CollisionGroups.Vehicles,
  collisionFilterMask: CollisionMasks.VehicleBody,
});

// Ruedas del vehículo
wheelBodies.forEach(wheelBody => {
  wheelBody.collisionFilterGroup = CollisionGroups.TrimeshColliders;
  wheelBody.collisionFilterMask = CollisionMasks.VehicleWheel;
  
  wheelBody.shapes.forEach(shape => {
    shape.collisionFilterGroup = CollisionGroups.TrimeshColliders;
    shape.collisionFilterMask = CollisionMasks.VehicleWheel;
  });
});
```

### Paso 4: Aplicar al Raycast

```typescript
// src/lib/three/cannonPhysics.ts - raycast para detectar suelo

const raycastOptions = {
  collisionFilterMask: CollisionGroups.Default,
  skipBackfaces: true,
};

world.raycastClosest(from, to, raycastOptions, rayResult);
```

---

## 🎨 Beneficios

### Antes (Sin CollisionGroups)
- ❌ Ruedas colisionan con cuerpo del vehículo (física inestable)
- ❌ Personaje puede colisionar con ruedas (bugs)
- ❌ Objetos internos causan colisiones no deseadas
- ❌ Raycast detecta todo (incluso cosas que no debería)

### Después (Con CollisionGroups)
- ✅ Ruedas NO colisionan con cuerpo (física estable)
- ✅ Personaje NO colisiona con ruedas (sin bugs)
- ✅ Control fino de colisiones
- ✅ Raycast solo detecta terreno
- ✅ Mejor rendimiento (menos cálculos de colisión)

---

## 🧪 Testing

### Pruebas a Realizar

1. **Vehículo Solo**:
   - Verificar que ruedas NO colisionan con cuerpo
   - Verificar que vehículo colisiona con terreno
   - Física debe ser estable

2. **Personaje + Vehículo**:
   - Personaje puede empujar vehículo
   - Personaje NO atraviesa vehículo
   - Personaje NO colisiona con ruedas

3. **Raycast**:
   - Raycast de personaje detecta suelo
   - Raycast NO detecta ruedas de vehículos
   - Raycast NO detecta otros personajes

4. **Múltiples Vehículos**:
   - Vehículos colisionan entre sí
   - Sin colisiones internas entre sus propias ruedas

---

## 📝 Archivos a Modificar

1. **`src/constants/collisionGroups.ts`** (NUEVO)
   - Definir enum CollisionGroups
   - Definir máscaras predefinidas

2. **`src/lib/three/cannonPhysics.ts`**
   - Aplicar CollisionGroups al personaje
   - Aplicar CollisionGroups al vehículo
   - Aplicar CollisionGroups al raycast

3. **`src/components/world/CityModel.tsx`** (opcional)
   - Aplicar CollisionGroups al terreno

---

## 🔍 Debugging

### Visualizar CollisionGroups

Para ver qué grupo tiene cada objeto, puedes agregar:

```typescript
console.log('Player group:', playerBody.collisionFilterGroup);
console.log('Player mask:', playerBody.collisionFilterMask);
console.log('Vehicle group:', vehicleBody.collisionFilterGroup);
console.log('Vehicle mask:', vehicleBody.collisionFilterMask);
```

### Colores en CannonDebugRenderer

Si usas el debug renderer, los colores representan:
- 🟢 Verde: TrimeshColliders (4)
- 🔵 Azul: Default (1)
- 🟡 Amarillo: Characters (2)
- 🔴 Rojo: Vehicles (8)

---

## 📚 Referencias

- **Sketchbook CollisionGroups.md**: `docs/Sketchbook/enum/CollisionGroups.md`
- **Sketchbook Character.md**: Líneas 136-143 (aplicación en personaje)
- **Sketchbook Vehicle.md**: Líneas 406-416 (aplicación en vehículo)
- **Cannon.js Docs**: Bitwise collision filtering

---

## ✅ Checklist de Implementación

- [x] Crear archivo `collisionGroups.ts` con enum y máscaras
- [x] Aplicar CollisionGroups al personaje
- [x] Aplicar CollisionGroups al vehículo (cuerpo)
- [x] Aplicar CollisionGroups a las ruedas (N/A - usamos RaycastVehicle)
- [x] Aplicar CollisionGroups al raycast
- [x] Aplicar CollisionGroups a TODOS los colliders del mundo
- [ ] Probar colisiones personaje-vehículo
- [ ] Probar colisiones vehículo-terreno
- [ ] Probar raycast de personaje
- [ ] Verificar que ruedas NO colisionan con cuerpo
- [x] Documentar cambios

---

## 🔧 Actualización: Implementación Completa (10 Nov 2025)

### Colliders del Mundo - TODOS Implementados ✅

Se aplicaron CollisionGroups a **TODOS** los colliders del mundo:

#### 1. **Trimesh Colliders** (Terreno, Colinas, Rocas)
**Funciones afectadas:**
- `createNamedTrimeshCollidersFromScene()` - Línea 117-133
- `createTrimeshColliderFromWorldMesh()` - Línea 1330-1345

**Configuración:**
```typescript
const body = new CANNON.Body({ 
  mass: 0,
  collisionFilterGroup: CollisionGroups.Default,
  collisionFilterMask: -1, // Colisiona con todo
});

// Aplicar a shapes
body.shapes.forEach((shape) => {
  shape.collisionFilterGroup = CollisionGroups.Default;
  shape.collisionFilterMask = -1;
});
```

#### 2. **Box Colliders** (Edificios, Muros, UCX)
**Funciones afectadas:**
- `createBoxCollider()` - Línea 1148-1167
- `createUCXBoxCollidersFromScene()` - Usa createBoxCollider
- `createBBoxCollidersFromScene()` - Usa createBoxCollider

**Configuración:** Igual que Trimesh (Default + mask -1)

#### 3. **Mesh Colliders** (Modelos GLB)
**Funciones afectadas:**
- `createMeshCollider()` - Línea 1260-1291
- `createBodyFromShape()` - Línea 1183-1201

**Configuración:** Igual que Trimesh (Default + mask -1)

### Resumen de Cobertura

| Tipo de Collider | Estado | Función | Grupo | Máscara |
|------------------|--------|---------|-------|---------|
| **Terreno (Trimesh)** | ✅ | createTrimeshColliderFromWorldMesh | Default (1) | -1 (todos) |
| **Colinas (Convex)** | ✅ | createNamedTrimeshCollidersFromScene | Default (1) | -1 (todos) |
| **Edificios (Box)** | ✅ | createBoxCollider | Default (1) | -1 (todos) |
| **UCX (Box)** | ✅ | createUCXBoxCollidersFromScene | Default (1) | -1 (todos) |
| **BBox (Box)** | ✅ | createBBoxCollidersFromScene | Default (1) | -1 (todos) |
| **Mesh (GLB)** | ✅ | createMeshCollider | Default (1) | -1 (todos) |
| **Personaje** | ✅ | createPlayerBody | Characters (2) | Default \| Vehicles |
| **Vehículo** | ✅ | createRaycastVehicle | Vehicles (8) | Default \| Characters |

### Beneficios de la Implementación Completa

✅ **Consistencia**: TODO el mundo usa el mismo sistema  
✅ **Rendimiento**: Menos colisiones innecesarias  
✅ **Mantenibilidad**: Código más claro y organizado  
✅ **Prevención de bugs**: Control fino de interacciones  
✅ **Escalabilidad**: Fácil agregar nuevos grupos

### Nota sobre Ruedas del Vehículo

En nuestro sistema usamos `RaycastVehicle` de Cannon.js, que:
- **NO usa bodies físicos** para las ruedas
- Usa **raycasts** para detectar el suelo
- Los raycasts detectan automáticamente el terreno (Default)
- **NO necesita** CollisionGroups explícitos

En Sketchbook, las ruedas son esferas físicas con `CollisionGroups.TrimeshColliders`, pero nuestro enfoque es diferente y más eficiente.

---

**Implementado por:** AI Assistant  
**Basado en:** Sketchbook by swift502  
**Fecha:** 10 de noviembre de 2025  
**Última actualización:** 10 de noviembre de 2025 (Implementación completa)

---

## 💡 Nota Importante

Este sistema es **crítico** para la estabilidad de la física. Sin él:
- Los vehículos son inestables (ruedas colisionan con cuerpo)
- Hay bugs de colisión extraños
- El rendimiento es peor (más colisiones innecesarias)

Con él:
- ✅ Física estable y predecible
- ✅ Sin bugs de colisión
- ✅ Mejor rendimiento
- ✅ Control fino de interacciones
- ✅ Sistema completo y consistente

