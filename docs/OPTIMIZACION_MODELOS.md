# Optimización de Modelos 3D

## Problema Encontrado

### Error de Memoria y Carga
- **hotel_humboldt_model.glb**: 103MB → Causaba `Array buffer allocation failed`
- **Green_Dome_Structure.glb**: 30MB → Causaba `Failed to fetch`
- **Modelos de personajes**: 22MB cada uno (men), 19MB cada uno (women)
  - `men_Idle.glb`: 22MB
  - `men_Walking.glb`: 22MB
  - `men_Running.glb`: 22MB
  - `women_Idle.glb`: 19MB
  - `women_Running.glb`: 19MB
  - `women_Walking.glb`: 19MB
  - **Total**: ~123MB de modelos de personajes
  - **Problema**: `useGLTF.preload()` intentaba cargar TODOS simultáneamente

### Solución Implementada

1. **Hotel Humboldt**: Optimizado de 103MB a 414KB ✅
2. **Green Dome**: Optimizado de 30MB a 1.8MB ✅
3. **Modelos de Personajes**: 
   - ❌ Removido `useGLTF.preload()` masivo (causaba sobrecarga)
   - ✅ Agregado `Suspense` para carga bajo demanda
   - ✅ Implementado DRACOLoader para soporte de compresión
   - ✅ Precarga inteligente (solo modelo idle + walking/running en background)
   - ⚠️ Modelos aún grandes (22MB/19MB) - Necesitan compresión Draco

4. **Sistema de Carga**:
   - ✅ DRACOLoader configurado en todos los componentes GLB
   - ✅ Decoder CDN: `https://www.gstatic.com/draco/versioned/decoders/1.5.6/`
   - ✅ Carga automática con fallback a geometrías simples

## Cómo Optimizar Modelos GLB

### 1. Usar Blender para Reducir Polígonos

```bash
# Abrir el modelo en Blender
blender modelo.glb

# En Blender:
# 1. Seleccionar el objeto
# 2. Modifier Properties → Add Modifier → Decimate
# 3. Ratio: 0.5 (reduce 50% de polígonos)
# 4. File → Export → glTF 2.0 (.glb)
```

### 2. Comprimir con gltf-pipeline

```bash
# Instalar gltf-pipeline
npm install -g gltf-pipeline

# Comprimir con Draco
gltf-pipeline -i input.glb -o output.glb -d

# Opciones adicionales:
# -d: Draco compression (reduce hasta 90%)
# --draco.compressionLevel 10: Máxima compresión
```

### 3. Optimizar Texturas

```bash
# Reducir resolución de texturas
# En Blender:
# 1. UV Editing
# 2. Reducir resolución de imágenes (2048 → 1024 → 512)
# 3. Usar atlas de texturas para combinar múltiples texturas
```

### 4. Usar glTF-Transform

```bash
# Instalar glTF-Transform
npm install -g @gltf-transform/cli

# Optimizar automáticamente
gltf-transform optimize input.glb output.glb

# Comprimir con Draco
gltf-transform draco input.glb output.glb
```

## Límites Recomendados

- **Modelos de personajes**: < 500KB
- **Edificios pequeños**: < 1MB
- **Edificios grandes**: < 5MB
- **Terreno**: < 100KB por tile

## Estrategias para Modelos Grandes

### 1. Level of Detail (LOD)
```typescript
// Cargar diferentes versiones según distancia
const distance = camera.position.distanceTo(object.position);
if (distance < 10) {
  // Modelo de alta calidad
} else if (distance < 50) {
  // Modelo de media calidad
} else {
  // Modelo de baja calidad o placeholder
}
```

### 2. Lazy Loading
```typescript
// Cargar solo cuando sea necesario
const { scene } = useGLTF('/models/large-model.glb', true);
```

### 3. Streaming
```typescript
// Dividir modelo en partes
<Suspense fallback={<Placeholder />}>
  <HotelExterior />
</Suspense>
<Suspense fallback={null}>
  <HotelInterior />
</Suspense>
```

## Estado Actual del Proyecto

### Modelos Optimizados ✅
- `hotel_humboldt_model.glb`: 414KB (optimizado)
- `Green_Dome_Structure.glb`: 1.8MB (optimizado de 30MB)
- Terreno: 16KB por tile
- **DRACOLoader**: Implementado en todos los componentes

### Pendientes de Optimización ⚠️
- **Modelos de personajes**: 22MB (men), 19MB (women) cada uno
  - `men_Idle.glb`: 22MB → Comprimir a ~2MB
  - `men_Walking.glb`: 22MB → Comprimir a ~2MB
  - `men_Running.glb`: 22MB → Comprimir a ~2MB
  - `women_Idle.glb`: 19MB → Comprimir a ~2MB
  - `women_Walking.glb`: 19MB → Comprimir a ~2MB
  - `women_Running.glb`: 19MB → Comprimir a ~2MB
- Algunos modelos de ambiente: ~270KB → Podrían reducirse a ~50KB

## Comandos Útiles

```bash
# Ver tamaño de todos los modelos
find public/models -name "*.glb" -exec ls -lh {} \;

# Encontrar modelos grandes (>1MB)
find public/models -name "*.glb" -size +1M -exec ls -lh {} \;

# Comprimir todos los modelos grandes
for file in $(find public/models -name "*.glb" -size +1M); do
  gltf-pipeline -i "$file" -o "${file%.glb}_optimized.glb" -d
done
```

## Referencias

- [glTF Pipeline](https://github.com/CesiumGS/gltf-pipeline)
- [glTF Transform](https://gltf-transform.donmccurdy.com/)
- [Draco Compression](https://google.github.io/draco/)
- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)

