# Sistema de Colisiones Optimizado - Inspirado en Sketchbook

## 📋 Resumen

El sistema de colisiones ha sido optimizado siguiendo las mejores prácticas de Sketchbook, implementando UCX boxes, materiales de física mejorados y detección de colisiones precisa.

## 🎯 Características Implementadas

### 1. Sistema UCX (Unreal Collision eXport)

El sistema UCX permite crear colliders optimizados usando meshes especiales con el prefijo `UCX_`:

```typescript
// Ejemplo de uso
physics.createUCXAutoCollidersFromScene(scene, 'city');
```

**Ventajas:**
- ✅ Colliders invisibles (solo física, no renderizado)
- ✅ Optimización automática de geometría
- ✅ Grosor mínimo garantizado (0.2m) para evitar colisiones fallidas
- ✅ Detección automática de objetos con UCX para evitar duplicados

**Convención de nombres:**
- `UCX_ObjectName_01` → Collider box para ObjectName
- `UCX_Building_Wall_01` → Collider para pared de edificio
- `UCX_Tree_Trunk_01` → Collider para tronco de árbol

### 2. Materiales de Física Mejorados

Se han configurado 4 materiales especializados:

```typescript
// Materiales disponibles
- playerMaterial: Para el jugador (alta fricción, sin rebote)
- groundMaterial: Para el suelo (fricción media)
- staticMaterial: Para objetos estáticos (edificios, árboles)
- vehicleMaterial: Para vehículos (baja fricción, alta restitución)
```

**Configuración de contactos:**
```typescript
// Jugador vs Suelo
friction: 0.8
restitution: 0

// Jugador vs Estático
friction: 0.6
restitution: 0

// Vehículo vs Suelo
friction: 0.7
restitution: 0.1

// Vehículo vs Estático
friction: 0.5
restitution: 0.3
```

### 3. Collision Groups y Masks

Sistema de capas de colisión para optimizar detección:

```typescript
export const CollisionGroups = {
  GROUND: 1 << 0,      // Suelo
  PLAYER: 1 << 1,      // Jugador
  STATIC: 1 << 2,      // Objetos estáticos
  VEHICLE: 1 << 3,     // Vehículos
  TRIGGER: 1 << 4,     // Zonas de trigger
  PROJECTILE: 1 << 5,  // Proyectiles
};

export const CollisionMasks = {
  GROUND: CollisionGroups.PLAYER | CollisionGroups.VEHICLE,
  PLAYER: CollisionGroups.GROUND | CollisionGroups.STATIC | CollisionGroups.VEHICLE,
  STATIC: CollisionGroups.PLAYER | CollisionGroups.VEHICLE | CollisionGroups.PROJECTILE,
  VEHICLE: CollisionGroups.GROUND | CollisionGroups.STATIC | CollisionGroups.PLAYER,
  TRIGGER: CollisionGroups.PLAYER,
  PROJECTILE: CollisionGroups.STATIC | CollisionGroups.PLAYER,
};
```

### 4. Colliders Precisos por Tipo de Objeto

El sistema crea colliders optimizados según el tipo de objeto:

#### 🌳 Árboles
```typescript
// Cilindro (tronco) + Esfera (copa)
const trunkRadius = size.x * 0.2;
const trunkHeight = size.y * 0.6;
const canopyRadius = size.x * 0.4;
```

#### 🪨 Rocas
```typescript
// Esfera ajustada al tamaño
const radius = Math.max(size.x, size.y, size.z) * 0.5;
```

#### 🏢 Edificios
```typescript
// Box preciso basado en bounding box
const halfExtents = new CANNON.Vec3(
  size.x / 2,
  size.y / 2,
  size.z / 2
);
```

#### 🚗 Vehículos
```typescript
// Box con esferas en las esquinas para detección de suelo
const chassisShape = new CANNON.Box(
  new CANNON.Vec3(width/2, height/2, length/2)
);
// + 4 esferas en las esquinas (radio: 0.3m)
```

### 5. Optimizaciones de Rendimiento

#### Broadphase Mejorado
```typescript
// SAPBroadphase para detección rápida
this.world.broadphase = new CANNON.SAPBroadphase(this.world);
```

#### Solver Optimizado
```typescript
const solver = new CANNON.GSSolver();
solver.iterations = 10; // Balance entre precisión y rendimiento
```

#### Throttling de Logs
```typescript
// Solo 1 log cada 500ms para evitar spam
if (now - lastLogTime > 500) {
  console.log('Collision detected');
  lastLogTime = now;
}
```

## 📊 Comparación con Sistema Anterior

| Característica | Antes | Ahora |
|---------------|-------|-------|
| Colliders por objeto | 1 (box genérico) | 1-3 (optimizados por tipo) |
| Materiales | 1 (default) | 4 (especializados) |
| Collision Groups | No | Sí (6 grupos) |
| UCX Support | No | Sí (completo) |
| Grosor mínimo | No | 0.2m garantizado |
| Detección duplicados | No | Sí (automática) |
| Throttling logs | No | Sí (500ms) |

## 🎮 Uso en el Juego

### Crear Colliders para un Mapa

```typescript
// 1. Crear colliders UCX (si existen)
physics.createUCXAutoCollidersFromScene(scene, 'map-name');

// 2. Crear colliders precisos (árboles, rocas, etc.)
physics.createPreciseCollidersFromScene(scene, 'map-name');

// 3. Crear suelo
physics.createGroundPlane();
```

### Agregar Collider a un Objeto Nuevo

```typescript
// Opción 1: UCX (recomendado)
// En Blender: Crear mesh con nombre UCX_ObjectName_01
// El sistema lo detectará automáticamente

// Opción 2: Programático
const body = new CANNON.Body({
  mass: 0, // Estático
  shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
  collisionFilterGroup: CollisionGroups.STATIC,
  collisionFilterMask: CollisionMasks.STATIC,
});
physics.addBody('object-id', body);
```

## 🔧 Configuración Avanzada

### Ajustar Fricción y Restitución

```typescript
// En constants/physics.ts
export const PHYSICS_CONFIG = {
  GRAVITY: -9.82,
  PLAYER_FRICTION: 0.8,
  GROUND_FRICTION: 0.6,
  VEHICLE_FRICTION: 0.7,
  RESTITUTION: 0.1, // Rebote
};
```

### Agregar Nuevo Collision Group

```typescript
// En constants/collisionGroups.ts
export const CollisionGroups = {
  // ... existentes
  NPC: 1 << 6, // Nuevo grupo
};

export const CollisionMasks = {
  // ... existentes
  NPC: CollisionGroups.PLAYER | CollisionGroups.STATIC,
};
```

## 📝 Mejores Prácticas

### 1. Usar UCX para Objetos Complejos
```
✅ Edificios con formas irregulares
✅ Terreno con elevaciones
✅ Objetos decorativos grandes
❌ Objetos pequeños simples (usar colliders automáticos)
```

### 2. Optimizar Número de Colliders
```
✅ 1 collider por objeto pequeño
✅ 2-3 colliders por objeto mediano
❌ >5 colliders por objeto (impacto en rendimiento)
```

### 3. Usar Collision Groups Apropiados
```
✅ STATIC para objetos que nunca se mueven
✅ TRIGGER para zonas de interacción
❌ Mezclar grupos incorrectamente
```

## 🐛 Debug de Colisiones

### Visualizar Colliders
```typescript
// En GameCanvas.tsx
<CannonDebugRenderer world={physics.world} />
```

### Logs de Colisiones
```typescript
// Filtrado automático (solo objetos relevantes)
// Excluye: suelo, objetos pequeños
console.log('💥 COLISIÓN JUGADOR con objeto en pos=(x, y, z)');
```

### Verificar Collision Groups
```typescript
console.log(`Body group=${body.collisionFilterGroup}`);
console.log(`Body mask=${body.collisionFilterMask}`);
```

## 🚀 Próximas Mejoras

- [ ] Colliders convexos (ConvexPolyhedron) para objetos complejos
- [ ] Sistema de LOD para colliders (distancia)
- [ ] Colliders dinámicos (destructibles)
- [ ] Optimización de Trimesh para terreno grande
- [ ] Sistema de pooling de colliders

## 📚 Referencias

- [Sketchbook Physics System](https://github.com/swift502/Sketchbook)
- [Cannon.js Documentation](https://pmndrs.github.io/cannon-es/)
- [Three-to-Cannon](https://github.com/donmccurdy/three-to-cannon)
- [UCX Collision in Unreal](https://docs.unrealengine.com/en-US/WorkingWithContent/Importing/FBX/StaticMeshes/)

---

**Última actualización:** 2025-11-12
**Autor:** NexusWorld3D Team

