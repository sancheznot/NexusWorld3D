# 🚗 Cambios del Sistema de Vehículos (Cannon.js)

Este documento actualiza el estado del sistema de vehículos tras migrar a Cannon.js y descontinuar Rapier/`ArcadeCar`.

## Estado actual

- Física: Cannon.js (`cannon-es`) con RaycastVehicle.
- Componentes clave:
  - `src/components/vehicles/CannonCar.tsx`
  - `src/components/physics/CannonStepper.tsx`
  - `src/lib/three/cannonPhysics.ts`
  - `src/components/game/GameCanvas.tsx`
  - `src/components/world/ThirdPersonCamera.tsx`
  - `src/components/world/CityModel.tsx`
- Eliminado: `src/components/vehicles/ArcadeCar.tsx` (Rapier) y referencias.

## Cambios principales

- Step global de física: `CannonStepper` asegura que el mundo de Cannon se actualice cada frame (incluso cuando el `PlayerV2` está oculto al conducir).
- Vehículo raycast: uso de `createRaycastVehicle` / `updateRaycastVehicle` con 4 ruedas, suspensión y frenado.
- Controles mejorados:
  - W/↑ acelera; S/↓ frena si avanzas y entra en reversa al detenerse.
  - Dirección con atenuación por velocidad (gira más a baja velocidad, menos a alta).
- Seguridad UX: al entrar se desactiva la colisión del jugador; al salir se reactiva y se aplica frenado fuerte.

## Notas de migración

- Documentación de Rapier/`ArcadeCar` quedó obsoleta. Ver `/docs/VEHICLE_SYSTEM.md` (actualizado a Cannon).
- Ciudad publica `window._veh_spawn` y `CannonCar` publica `window._veh_pos` para cámara y proximidad.

## Troubleshooting breve

- El coche no se mueve: confirmar que `CannonStepper` está montado y que `driving=true`.
- No hay reversa: verificar cambios en `updateRaycastVehicle` (usa fuerza negativa cuando estás parado).
- Choque del player dentro del coche: confirmar `setPlayerCollisionEnabled(false)` al entrar.

## Historial

- 2025-10-27: Migración completa a Cannon.js. Eliminado `ArcadeCar`. Añadido reverse real y steering por velocidad.

