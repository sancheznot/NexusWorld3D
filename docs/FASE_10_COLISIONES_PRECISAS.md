# Fase 10: Colisiones Más Precisas (Sketchbook Integration)

**Fecha**: 10 de noviembre de 2025  
**Estado**: 🚧 En Progreso  
**Basado en**: Sketchbook Collision System

---

## 🎯 Objetivo

Mejorar la precisión de las colisiones del juego implementando técnicas de Sketchbook para crear mallas de colisión más precisas y eficientes.

---

## 📊 Situación Actual

### ✅ Lo que Ya Tenemos

1. **CollisionGroups Implementados** ✅
   - Default, Characters, Vehicles, TrimeshColliders
   - Sistema completo y funcional

2. **Tipos de Colliders**:
   - ✅ Trimesh (terreno, colinas)
   - ✅ Box (edificios, muros, UCX)
   - ✅ Mesh (modelos GLB)
   - ✅ Convex (Hill_03.001)

3. **Precisión Actual**:
   - 🟡 **Media**: Usamos bounding boxes para la mayoría de objetos
   - 🟡 **Básica**: Trimesh solo para terreno natural
   - 🟡 **Limitada**: No usamos Convex para objetos complejos

### ❌ Lo que Nos Falta

1. **Colliders Compuestos** (Multiple Shapes)
   - Sketchbook usa múltiples shapes por objeto
   - Ejemplo: Vehículo = 5-10 boxes + esferas

2. **Convex Hulls** para Objetos Complejos
   - Más precisos que boxes
   - Menos costosos que Trimesh

3. **Colliders Personalizados por Tipo**
   - Árboles: Cilindro + esfera (copa)
   - Rocas: Convex hull
   - Edificios: Múltiples boxes

4. **Optimización de Trimesh**
   - Simplificación de geometría
   - LOD para colisiones

---

## 🚀 Plan de Mejoras

### Mejora 1: Colliders Compuestos para Objetos Comunes

**Objetivo**: Crear colliders más precisos para árboles, rocas, postes, etc.

#### Árboles
**Actual**: 1 box (bounding box completo)  
**Mejorado**: Cilindro (tronco) + Esfera (copa)

```typescript
// Detectar árbol por nombre
if (/tree|arbol/i.test(child.name)) {
  // Tronco: Cilindro
  const trunkRadius = 0.3;
  const trunkHeight = 4.0;
  const trunkShape = new CANNON.Cylinder(trunkRadius, trunkRadius, trunkHeight, 8);
  body.addShape(trunkShape, new CANNON.Vec3(0, trunkHeight/2, 0));
  
  // Copa: Esfera
  const crownRadius = 2.0;
  const crownShape = new CANNON.Sphere(crownRadius);
  body.addShape(crownShape, new CANNON.Vec3(0, trunkHeight + crownRadius, 0));
}
```

**Beneficio**: 
- ✅ Más realista (puedes pasar cerca del tronco)
- ✅ Mejor para vehículos (no chocan con ramas altas)
- ✅ Rendimiento similar (2 shapes simples)

#### Rocas
**Actual**: 1 box  
**Mejorado**: Convex hull (forma real)

```typescript
if (/rock|roca|stone|piedra/i.test(child.name)) {
  const result = threeToCannon(mesh, { type: ShapeType.HULL });
  if (result?.shape) {
    body.addShape(result.shape, result.offset, result.orientation);
  }
}
```

**Beneficio**:
- ✅ Forma exacta de la roca
- ✅ Colisiones más naturales
- ✅ Costo moderado (Convex es eficiente)

#### Postes/Farolas
**Actual**: 1 box grueso  
**Mejorado**: Cilindro delgado

```typescript
if (/pole|post|lamp|farol/i.test(child.name)) {
  const radius = 0.15; // Delgado
  const height = 5.0;
  const shape = new CANNON.Cylinder(radius, radius, height, 8);
  body.addShape(shape, new CANNON.Vec3(0, height/2, 0));
}
```

**Beneficio**:
- ✅ Puedes pasar muy cerca
- ✅ Más realista
- ✅ Mejor para vehículos

---

### Mejora 2: Sistema de Detección Inteligente

**Objetivo**: Detectar automáticamente el mejor tipo de collider según el objeto.

```typescript
function getOptimalColliderType(mesh: THREE.Mesh): 'box' | 'cylinder' | 'sphere' | 'convex' | 'trimesh' {
  const name = mesh.name.toLowerCase();
  const bbox = new THREE.Box3().setFromObject(mesh);
  const size = bbox.getSize(new THREE.Vector3());
  
  // Árboles, postes: Cilindro
  if (/tree|arbol|pole|post|lamp|farol/i.test(name)) {
    return 'cylinder';
  }
  
  // Rocas, piedras: Convex
  if (/rock|roca|stone|piedra|boulder/i.test(name)) {
    return 'convex';
  }
  
  // Terreno natural: Trimesh
  if (/terrain|ground|hill|colina|mountain/i.test(name)) {
    return 'trimesh';
  }
  
  // Objetos alargados: Cilindro
  const aspectRatio = Math.max(size.x, size.z) / size.y;
  if (aspectRatio < 0.3) { // Muy alto y delgado
    return 'cylinder';
  }
  
  // Objetos esféricos: Esfera
  const avgSize = (size.x + size.y + size.z) / 3;
  const variance = Math.abs(size.x - avgSize) + Math.abs(size.y - avgSize) + Math.abs(size.z - avgSize);
  if (variance < avgSize * 0.3) { // Casi esférico
    return 'sphere';
  }
  
  // Por defecto: Box
  return 'box';
}
```

---

### Mejora 3: Colliders LOD (Level of Detail)

**Objetivo**: Usar colliders más simples para objetos lejanos.

```typescript
interface ColliderLOD {
  distance: number;
  type: 'box' | 'cylinder' | 'sphere' | 'convex' | 'trimesh';
}

const COLLIDER_LOD_LEVELS: ColliderLOD[] = [
  { distance: 10, type: 'convex' },   // Cerca: Preciso
  { distance: 50, type: 'cylinder' }, // Medio: Simplificado
  { distance: 100, type: 'box' },     // Lejos: Muy simple
];

function getColliderForDistance(mesh: THREE.Mesh, playerPos: THREE.Vector3): string {
  const meshPos = new THREE.Vector3();
  mesh.getWorldPosition(meshPos);
  const distance = meshPos.distanceTo(playerPos);
  
  for (const lod of COLLIDER_LOD_LEVELS) {
    if (distance < lod.distance) {
      return lod.type;
    }
  }
  
  return 'box'; // Muy lejos: Box simple
}
```

**Beneficio**:
- ✅ Mejor rendimiento (menos cálculos lejos)
- ✅ Precisión donde importa (cerca del jugador)
- ✅ Escalable para mundos grandes

---

### Mejora 4: Simplificación de Trimesh

**Objetivo**: Reducir vértices de Trimesh para mejor rendimiento.

```typescript
function simplifyTrimesh(vertices: number[], indices: number[], targetReduction: number = 0.5): { vertices: number[], indices: number[] } {
  // Implementar algoritmo de simplificación
  // Opciones:
  // 1. Decimation (reducir triángulos)
  // 2. Clustering (agrupar vértices cercanos)
  // 3. Edge collapse (colapsar aristas cortas)
  
  // Por ahora: Implementación básica
  // TODO: Usar librería de simplificación (simplify-js, meshoptimizer)
  
  return { vertices, indices };
}
```

---

### Mejora 5: Colliders por Capas de Detalle

**Objetivo**: Diferentes niveles de precisión según importancia.

```typescript
enum CollisionPrecision {
  LOW = 'low',       // Box simple
  MEDIUM = 'medium', // Cylinder/Sphere
  HIGH = 'high',     // Convex
  ULTRA = 'ultra',   // Trimesh
}

const PRECISION_BY_TYPE: Record<string, CollisionPrecision> = {
  // Críticos (jugador interactúa mucho)
  'building': CollisionPrecision.HIGH,
  'vehicle': CollisionPrecision.HIGH,
  'door': CollisionPrecision.ULTRA,
  
  // Importantes (interacción frecuente)
  'tree': CollisionPrecision.MEDIUM,
  'rock': CollisionPrecision.MEDIUM,
  'furniture': CollisionPrecision.MEDIUM,
  
  // Decorativos (poca interacción)
  'grass': CollisionPrecision.LOW,
  'small_prop': CollisionPrecision.LOW,
  
  // Terreno (siempre preciso)
  'terrain': CollisionPrecision.ULTRA,
};
```

---

## 📋 Plan de Implementación

### Fase 10.1: Colliders Inteligentes (2-3 horas)
- [ ] Crear función `getOptimalColliderType()`
- [ ] Implementar detección de árboles → Cilindro + Esfera
- [ ] Implementar detección de rocas → Convex
- [ ] Implementar detección de postes → Cilindro
- [ ] Testing con objetos del mundo

### Fase 10.2: Sistema de Precisión (1-2 horas)
- [ ] Crear enum `CollisionPrecision`
- [ ] Mapear tipos de objetos a niveles de precisión
- [ ] Aplicar precisión según tipo
- [ ] Testing de rendimiento

### Fase 10.3: Optimización Avanzada (2-3 horas)
- [ ] Implementar LOD para colliders
- [ ] Simplificación de Trimesh
- [ ] Cache de colliders generados
- [ ] Profiling y optimización

### Fase 10.4: Colliders Compuestos (2-3 horas)
- [ ] Sistema para múltiples shapes por objeto
- [ ] Árboles con tronco + copa
- [ ] Edificios con múltiples boxes
- [ ] Vehículos con shapes precisas

---

## 🎯 Prioridades

### Alta Prioridad (Hacer Ahora)
1. **Árboles con Cilindro + Esfera** 🌳
   - Impacto: Alto (muchos árboles en el mundo)
   - Dificultad: Baja
   - Tiempo: 30 minutos

2. **Rocas con Convex** 🪨
   - Impacto: Medio (mejora realismo)
   - Dificultad: Baja
   - Tiempo: 20 minutos

3. **Postes con Cilindro** 🚦
   - Impacto: Medio (mejor navegación)
   - Dificultad: Baja
   - Tiempo: 15 minutos

### Media Prioridad (Después)
4. **Sistema de Precisión**
   - Impacto: Alto (organización)
   - Dificultad: Media
   - Tiempo: 1 hora

5. **Detección Inteligente**
   - Impacto: Alto (automatización)
   - Dificultad: Media
   - Tiempo: 1 hora

### Baja Prioridad (Futuro)
6. **LOD para Colliders**
   - Impacto: Medio (rendimiento)
   - Dificultad: Alta
   - Tiempo: 2 horas

7. **Simplificación de Trimesh**
   - Impacto: Medio (rendimiento)
   - Dificultad: Alta
   - Tiempo: 2 horas

---

## 💡 Recomendación

**Empezar con**: Mejora 1 (Colliders Compuestos) - Alta Prioridad

**Orden sugerido**:
1. Árboles (30 min) ← **EMPEZAR AQUÍ**
2. Rocas (20 min)
3. Postes (15 min)
4. Testing (15 min)
5. Commit y documentar

**Total**: ~1.5 horas para mejoras visibles

---

## 📚 Referencias

- **Sketchbook ConvexCollider.md**: Implementación de Convex
- **Sketchbook TrimeshCollider.md**: Implementación de Trimesh
- **Sketchbook BoxCollider.md**: Implementación de Box
- **Sketchbook Vehicle.md**: Colliders compuestos (líneas 399-417)
- **Cannon.js Docs**: Cylinder, Sphere, ConvexPolyhedron

---

**Creado por**: AI Assistant  
**Fecha**: 10 de noviembre de 2025  
**Estado**: Listo para implementar

