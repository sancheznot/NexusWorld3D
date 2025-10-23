# Configuración del Sistema de Inventario

## 📋 **Archivo de Configuración**

Todas las constantes del sistema de inventario están centralizadas en:
```
src/constants/inventory.ts
```

**Nota**: También existe `src/config/inventory.config.ts` como respaldo, pero las constantes activas están en `constants/`.

## 🎯 **Configuraciones Principales**

### **Slots de Inventario**
```typescript
INVENTORY_SLOTS = {
  MIN_SLOTS: 10,           // Slots base (nivel 1)
  MAX_SLOTS: 20,           // Slots por defecto
  SLOTS_PER_LEVEL: 2,      // Slots adicionales por nivel
  ABSOLUTE_MAX_SLOTS: 50,  // Límite máximo absoluto
}
```

**Fórmula de cálculo:**
- Nivel 1: 10 slots
- Nivel 2: 12 slots (10 + 2)
- Nivel 3: 14 slots (10 + 4)
- Nivel 10: 28 slots (10 + 18)
- Máximo: 50 slots

### **Sistema de Peso**
```typescript
INVENTORY_WEIGHT = {
  MIN_WEIGHT: 50,          // Peso base (nivel 1)
  MAX_WEIGHT: 100,         // Peso por defecto
  WEIGHT_PER_LEVEL: 25,    // Peso adicional por nivel
  ABSOLUTE_MAX_WEIGHT: 500, // Límite máximo absoluto
}
```

**Fórmula de cálculo:**
- Nivel 1: 50 kg
- Nivel 2: 75 kg (50 + 25)
- Nivel 3: 100 kg (50 + 50)
- Nivel 10: 275 kg (50 + 225)
- Máximo: 500 kg

### **Sistema de Oro**
```typescript
INVENTORY_GOLD = {
  STARTING_GOLD: 100,      // Oro inicial
  MAX_GOLD_PER_LEVEL: 1000, // Oro máximo por nivel
  ABSOLUTE_MAX_GOLD: 999999, // Límite máximo absoluto
}
```

## 🔧 **Cómo Modificar las Constantes**

### **1. Cambiar Slots por Nivel**
```typescript
// En constants/inventory.ts
SLOTS_PER_LEVEL: 3,  // Cambiar de 2 a 3 slots por nivel
```

### **2. Cambiar Peso por Nivel**
```typescript
// En constants/inventory.ts
WEIGHT_PER_LEVEL: 50,  // Cambiar de 25 a 50 kg por nivel
```

### **3. Cambiar Límites Máximos**
```typescript
// En constants/inventory.ts
ABSOLUTE_MAX_SLOTS: 100,    // Aumentar slots máximos
ABSOLUTE_MAX_WEIGHT: 1000,  // Aumentar peso máximo
```

## 📊 **Configuraciones Adicionales**

### **Items**
- `MAX_STACK_SIZE`: Cantidad máxima de items del mismo tipo
- `BASE_DURABILITY`: Durabilidad base de items
- `MAX_DURABILITY`: Durabilidad máxima

### **Rarezas**
- `ITEM_RARITY_WEIGHTS`: Probabilidades de aparición por rareza
- `SHOP_PRICES`: Multiplicadores de precio por rareza

### **UI**
- `GRID_COLUMNS`: Columnas de la grilla del inventario
- `GRID_ROWS`: Filas de la grilla del inventario
- `ITEM_SIZE`: Tamaño de los items en píxeles

### **Debug**
- `ENABLE_LOGS`: Habilitar logs de debug
- `LOG_LEVEL`: Nivel de logging
- `ENABLE_PERFORMANCE_MONITORING`: Monitoreo de rendimiento

## 🎮 **Uso en el Juego**

### **Actualizar Nivel del Jugador**
```typescript
// En el servicio de inventario
inventoryService.updatePlayerLevel(5); // Nivel 5
// Automáticamente calcula: 18 slots, 175 kg
```

### **Verificar Espacio**
```typescript
// El servicio verifica automáticamente:
// - Espacio en slots
// - Espacio en peso
// - Límites máximos
```

### **Mostrar en UI**
```typescript
// En InventoryUI.tsx
<span>📦 {inventory.usedSlots}/{inventory.maxSlots} slots</span>
<span>⚖️ {inventory.currentWeight}/{inventory.maxWeight} kg</span>
```

## 🚀 **Ventajas del Sistema**

1. **Centralizado**: Todas las constantes en un solo archivo
2. **Escalable**: Fácil modificar valores sin tocar código
3. **Documentado**: Cada constante tiene su propósito claro
4. **Flexible**: Soporte para diferentes niveles de jugador
5. **Mantenible**: Cambios rápidos desde la configuración

## 📝 **Ejemplos de Configuración**

### **Inventario Más Generoso**
```typescript
MIN_SLOTS: 20,
SLOTS_PER_LEVEL: 5,
MIN_WEIGHT: 100,
WEIGHT_PER_LEVEL: 50,
```

### **Inventario Más Restrictivo**
```typescript
MIN_SLOTS: 5,
SLOTS_PER_LEVEL: 1,
MIN_WEIGHT: 25,
WEIGHT_PER_LEVEL: 10,
```

### **Inventario Equilibrado**
```typescript
MIN_SLOTS: 15,
SLOTS_PER_LEVEL: 3,
MIN_WEIGHT: 75,
WEIGHT_PER_LEVEL: 30,
```
