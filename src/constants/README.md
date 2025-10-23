# 📁 Constantes del Juego

Esta carpeta contiene todas las constantes y configuraciones del juego, organizadas por sistema.

## 📋 **Estructura**

```
src/constants/
├── index.ts          # Exportaciones centralizadas
├── game.ts          # Constantes del juego general
├── physics.ts       # Constantes de física y colliders
├── inventory.ts     # Constantes del sistema de inventario
└── README.md        # Este archivo
```

## 🎯 **Archivos de Constantes**

### **`game.ts`**
- Configuración de moneda (HBC)
- Triggers y interacciones
- Gameplay (stamina, hambre, salud)
- Cámara y controles
- Posición de spawn del jugador

### **`physics.ts`**
- Patrones de meshes para colliders
- Configuración de física
- Tipos de colliders
- Configuración de FPS

### **`inventory.ts`**
- Slots y peso del inventario
- Sistema de oro
- Configuración de items
- Rarezas y precios
- UI y animaciones

## 🔧 **Uso**

### **Importación Individual**
```typescript
import { INVENTORY_SLOTS, GAME_CONFIG } from '@/constants';
```

### **Importación Específica**
```typescript
import { INVENTORY_SLOTS } from '@/constants/inventory';
import { GAME_CONFIG } from '@/constants/game';
```

## 📝 **Convenciones**

1. **Nombres en MAYÚSCULAS**: Todas las constantes en UPPER_CASE
2. **Agrupación**: Constantes relacionadas en objetos
3. **Tipado**: Uso de `as const` para inferencia de tipos
4. **Documentación**: Comentarios explicativos para cada constante

## 🚀 **Ventajas**

- **Centralización**: Todas las constantes en un lugar
- **Tipado**: TypeScript infiere tipos automáticamente
- **Mantenibilidad**: Fácil modificar valores
- **Organización**: Separación por sistemas
- **Reutilización**: Importación desde cualquier parte

## 📊 **Ejemplos de Uso**

### **Configurar Inventario**
```typescript
// Cambiar slots por nivel
INVENTORY_SLOTS.SLOTS_PER_LEVEL = 3;

// Cambiar peso máximo
INVENTORY_WEIGHT.ABSOLUTE_MAX_WEIGHT = 1000;
```

### **Configurar Física**
```typescript
// Cambiar gravedad
PHYSICS_CONFIG.GRAVITY = -20;

// Cambiar FPS objetivo
PHYSICS_CONFIG.TARGET_FPS = 144;
```

### **Configurar Juego**
```typescript
// Cambiar oro inicial
GAME_CONFIG.currency.startingBalance = 1000;

// Cambiar drenaje de stamina
GAME_CONFIG.gameplay.stamina.runDrainPerSecond = 5;
```
