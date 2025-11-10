# 📚 Sketchbook Reference Guide

Esta es tu **chuleta** (guía de referencia) del proyecto **Sketchbook** de swift502. Aquí encontrarás todo el código organizado por categorías para que puedas implementar física de personajes y vehículos de alta calidad en tu proyecto.

> **Repositorio original**: https://github.com/swift502/Sketchbook  
> **Discourse**: https://discourse.threejs.org/t/vehicle-physics-with-cannon-js/11769

---

## 🎯 ¿Por qué Sketchbook?

Sketchbook es uno de los mejores ejemplos de física de personajes y vehículos con **Three.js + Cannon.js**. Incluye:

- ✅ **Física de personaje realista** con inclinación al moverse
- ✅ **Sistema de estados** completo (idle, walk, run, jump, fall)
- ✅ **Física de vehículos** con RaycastVehicle
- ✅ **Control de cámara** suave y profesional
- ✅ **Interacción con vehículos** (entrar/salir, conducir)

---

## 📁 Estructura de Archivos

### 🎮 **Character** - Sistema de Personajes

#### Archivos Principales
- **`Character.md`** - Clase principal del personaje (989 líneas) ⭐ **MUY IMPORTANTE**
- **`GroundImpactData.md`** - Datos de impacto con el suelo
- **`VehicleEntryInstance.md`** - Instancia para entrar a vehículos

#### Character AI - Inteligencia Artificial
- **`FollowPath.md`** - Seguir un camino de nodos
- **`FollowTarget.md`** - Seguir un objetivo
- **`RandomBehaviour.md`** - Comportamiento aleatorio

#### Character States - Estados del Personaje ⭐ **CRÍTICO PARA FÍSICA**

**Estados Base:**
- **`CharacterStateBase.md`** - Clase base de todos los estados
- **`_stateLibrary.md`** - Librería de estados disponibles

**Estados de Movimiento:**
- `Idle.md` - Quieto
- `IdleRotateLeft.md` - Rotar a la izquierda
- `IdleRotateRight.md` - Rotar a la derecha
- `Walk.md` - Caminar
- `Sprint.md` - Correr
- `StartWalkBase.md` - Base para iniciar caminata
- `StartWalkForward.md` - Iniciar caminata hacia adelante
- `StartWalkLeft.md` - Iniciar caminata a la izquierda
- `StartWalkRight.md` - Iniciar caminata a la derecha
- `StartWalkBackLeft.md` - Iniciar caminata atrás-izquierda
- `StartWalkBackRight.md` - Iniciar caminata atrás-derecha
- `EndWalk.md` - Terminar caminata

**Estados Aéreos:**
- `JumpIdle.md` - Salto desde quieto
- `JumpRunning.md` - Salto corriendo
- `Falling.md` - Cayendo
- `DropIdle.md` - Caída desde quieto
- `DropRolling.md` - Caída con rodada
- `DropRunning.md` - Caída corriendo

**Estados de Vehículo:**
- `Driving.md` - Conduciendo
- `Sitting.md` - Sentado en vehículo
- `EnteringVehicle.md` - Entrando al vehículo
- `ExitingVehicle.md` - Saliendo del vehículo
- `ExitingAirplane.md` - Saliendo de avión
- `ExitingStateBase.md` - Base para estados de salida
- `OpenVehicleDoor.md` - Abrir puerta del vehículo
- `CloseVehicleDoorInside.md` - Cerrar puerta desde adentro
- `CloseVehicleDoorOutside.md` - Cerrar puerta desde afuera
- `SwitchingSeats.md` - Cambiar de asiento

---

### 🧠 **Core** - Sistema Central

- **`CameraOperator.md`** - Operador de cámara (seguimiento suave)
- **`ClosestObjectFinder.md`** - Encontrar objetos cercanos
- **`FunctionLibrary.md`** - Funciones utilitarias (vectores, matemáticas) ⭐
- **`InfoStack.md`** - Sistema de mensajes en pantalla
- **`InfoStackMessage.md`** - Mensaje individual
- **`InputManager.md`** - Manejo de inputs (teclado/mouse) ⭐
- **`KeyBinding.md`** - Vinculación de teclas
- **`LoadingManager.md`** - Gestor de carga de assets
- **`LoadingTrackerEntry.md`** - Entrada de tracking de carga
- **`UIManager.md`** - Gestor de UI

---

### ⚙️ **Cannon.js** - Física

- **`CannonDebugRenderer.md`** - Renderizador de debug para física
- **`cannon.js.md`** - Librería completa de Cannon.js
- **`cannon.d.ts.md`** - Definiciones de TypeScript para Cannon.js

---

### 🛠️ **Utils** - Utilidades

- **`three-to-cannon.md`** - Convertir geometrías de Three.js a Cannon.js ⭐
- **`THREE.quickhull.md`** - Algoritmo QuickHull para convex hulls
- **`Detector.md`** - Detector de capacidades WebGL
- **`Stats.md`** - Monitor de FPS y performance
- **`dat.gui.md`** - Librería de UI para debug

---

### 🎨 **Shaders** - Shaders Personalizados

- **`SkyShader.md`** - Shader de cielo (Preetham Sky Model)
- **`WaterShader.md`** - Shader de agua con olas

---

### 🔧 **Tools** - Herramientas

- **`blender-path-generator.md`** - Script de Blender para generar caminos de IA

### 🔌 **Interfaces** - Contratos de TypeScript

- **`ICharacterAI.md`** - Interfaz para IA de personajes
- **`ICharacterState.md`** - Interfaz para estados de personaje
- **`ICollider.md`** - Interfaz para colliders
- **`IControllable.md`** - Interfaz para objetos controlables
- **`IInputReceiver.md`** - Interfaz para recibir inputs
- **`ISpawnPoint.md`** - Interfaz para puntos de spawn
- **`IUpdatable.md`** - Interfaz para objetos actualizables
- **`IWorldEntity.md`** - Interfaz para entidades del mundo

---

### 📋 **Enums** - Enumeraciones

- **`CollisionGroups.md`** - Grupos de colisión
- **`EntityType.md`** - Tipos de entidades
- **`SeatType.md`** - Tipos de asientos
- **`Side.md`** - Lados (izquierda/derecha)
- **`Space.md`** - Espacios (local/global)

---

### ⚡ **Physics** - Física y Colliders

- **`BoxCollider.md`** - Collider de caja
- **`CapsuleCollider.md`** - Collider de cápsula (usado para personajes) ⭐
- **`ConvexCollider.md`** - Collider convexo
- **`SphereCollider.md`** - Collider esférico
- **`TrimeshCollider.md`** - Collider de malla triangular

---

### 🚗 **Vehicles** - Sistema de Vehículos

#### Archivos Principales
- **`Vehicle.md`** - Clase base abstracta de vehículos ⭐
- **`Car.md`** - Vehículo tipo carro
- **`Airplane.md`** - Vehículo tipo avión
- **`Helicopter.md`** - Vehículo tipo helicóptero

#### Componentes
- **`VehicleSeat.md`** - Asiento de vehículo
- **`VehicleDoor.md`** - Puerta de vehículo
- **`Wheel.md`** - Rueda de vehículo

---

### 🌍 **World** - Sistema de Mundo

- **`World.md`** - Clase principal del mundo (621 líneas) ⭐ **MUY IMPORTANTE**
- **`Scenario.md`** - Escenario/nivel
- **`Sky.md`** - Sistema de cielo
- **`Ocean.md`** - Sistema de océano
- **`Path.md`** - Camino para IA
- **`PathNode.md`** - Nodo de camino
- **`CharacterSpawnPoint.md`** - Punto de spawn de personajes
- **`VehicleSpawnPoint.md`** - Punto de spawn de vehículos

---

## 🚀 Archivos Clave para Implementar

### 1️⃣ **Física del Personaje**
```
📄 Character.md (clase principal)
📄 CharacterStateBase.md (base de estados)
📄 Idle.md, Walk.md, Sprint.md (estados de movimiento)
📄 JumpIdle.md, Falling.md (estados aéreos)
📄 FunctionLibrary.md (funciones matemáticas)
```

### 2️⃣ **Física del Vehículo**
```
📄 Driving.md (estado de conducción)
📄 EnteringVehicle.md, ExitingVehicle.md (entrar/salir)
📄 three-to-cannon.md (conversión de geometrías)
```

### 3️⃣ **Sistema de Cámara**
```
📄 CameraOperator.md (operador de cámara)
📄 InputManager.md (manejo de inputs)
```

---

## 💡 Conceptos Clave de Sketchbook

### 🎭 Sistema de Estados (State Machine)
Sketchbook usa un **patrón de máquina de estados** donde cada acción del personaje es un estado:
- Cada estado hereda de `CharacterStateBase`
- Los estados controlan animaciones, física y transiciones
- Ejemplo: `Idle` → `Walk` → `Sprint` → `JumpRunning` → `Falling` → `DropRolling`

### 🎯 Inclinación del Personaje (Character Tilt)
El personaje se inclina al moverse usando:
- `tiltContainer` - Contenedor para inclinación
- `VectorSpringSimulator` - Simulación de resorte para movimiento suave
- Rotación del torso basada en velocidad

### 🚗 RaycastVehicle
Sketchbook usa `CANNON.RaycastVehicle` para física de vehículos:
- Suspensión realista
- Fricción de ruedas
- Control de dirección y aceleración

### 📐 Conversión Three.js ↔ Cannon.js
Usa `three-to-cannon.js` para convertir geometrías:
- `Type.BOX` - Caja
- `Type.SPHERE` - Esfera
- `Type.HULL` - Convex Hull
- `Type.MESH` - Trimesh

---

## 📖 Cómo Usar Esta Guía

1. **Lee primero** `Character.md` para entender la estructura general
2. **Revisa** los estados en `character-state/` para ver cómo funcionan
3. **Estudia** `FunctionLibrary.md` para funciones matemáticas útiles
4. **Implementa** paso a paso en tu proyecto `hotel-humboldt`

---

## 🎓 Próximos Pasos

1. ✅ Organizar archivos (COMPLETADO)
2. 🔄 Revisar `Character.md` y entender la estructura
3. 🔄 Implementar sistema de estados básico
4. 🔄 Agregar inclinación del personaje
5. 🔄 Mejorar física del vehículo

---

**¡Ahora tienes toda la chuleta de Sketchbook organizada y lista para usar! 🎉**

