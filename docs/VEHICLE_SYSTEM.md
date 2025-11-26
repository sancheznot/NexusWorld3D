# Sistema de Vehículos (Cannon.js)

Este documento describe la implementación actual basada en Cannon.js usando RaycastVehicle.

## Descripción General

- ✅ Física de vehículo con `cannon-es` RaycastVehicle
- ✅ Entrada/salida (F) con ocultación del jugador
- ✅ Cámara que sigue al vehículo automáticamente
- ✅ Detección de proximidad para entrar (según `window._veh_pos/_veh_spawn`)
- ✅ Controles WASD/Flechas (incluye reversa real)

## Arquitectura

### 1) `CannonCar.tsx`
- Crea/elimina el RaycastVehicle a partir del spawn publicado por `CityModel`.
- Lee input (WASD) y llama `physics.updateRaycastVehicle(id, { throttle, brake, steer })`.
- Publica la posición del chasis a `window._veh_pos` y sincroniza el modelo visual.

### 2) `CannonStepper.tsx`
- Step global de Cannon en cada frame: `physics.update(delta)`.
- Evita depender de `PlayerV2` para mantener la simulación viva al conducir.

### 3) `cannonPhysics.ts`
- Wrapper del mundo y utilidades: jugador, colliders de ciudad, RaycastVehicle.
- Métodos clave del vehículo:
  - `createRaycastVehicle(spawn, id, yaw)`
  - `updateRaycastVehicle(id, input)` (steering atenuado por velocidad, reversa con S)
  - `stopVehicle(id)`
  - `setPlayerCollisionEnabled(enabled)`

### 4) Integración en `GameCanvas.tsx`
- Monta `CannonStepper` y `CannonCar` cuando hay spawn.
- Gestiona `isDriving`, oculta jugador, desactiva/activa colisión del jugador al entrar/salir.

### 5) `ThirdPersonCamera.tsx`
- Si `window._isDriving` es true, sigue al vehículo (`window._veh_pos`) y ajusta distancia/altura/suavidad.

## Flujo

```
CityModel → publica window._veh_spawn
GameCanvas → detecta spawn → renderiza CannonCar y CannonStepper
CannonCar → crea RaycastVehicle → publica window._veh_pos
ThirdPersonCamera → sigue al jugador o al vehículo según window._isDriving
```

## Controles

- W/↑: acelerar
- S/↓: frenar si avanzas; al casi detenerse, reversa
- A/← y D/→: girar (menos giro a alta velocidad)
- F: entrar/salir

## Ajustes útiles (`cannonPhysics.ts`)

- Steering: `maxSteer`, atenuación por `forwardSpeed`.
- Motor/freno: `engineForceBase`, `brakeForce`.
- Ruedas: `suspensionStiffness`, `suspensionRestLength`, `frictionSlip`, etc.

## Migración desde Rapier

- `ArcadeCar.tsx` ha sido eliminado. Este documento sustituye a la guía de Rapier.
- Si ves referencias a Rapier/ArcadeCar en notas antiguas, considéralas obsoletas.

## Troubleshooting

- El vehículo no se mueve: verifica que `CannonStepper` está montado y que `driving` es true.
- No entra reversa: confirma que casi estás detenido; S aplicará fuerza negativa.
- El jugador choca dentro del coche: confirma que `setPlayerCollisionEnabled(false)` se llama al entrar.

---

Última actualización: Octubre 2025

