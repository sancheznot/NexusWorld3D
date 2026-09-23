# Física: tiempo, vehículos y ciclo de vida — 2026-09-21

## Corrección posterior: orden del solver (22 de septiembre)

La implementación histórica de controles en `preStep` descrita abajo fue reemplazada. Cannon-es 0.20 resuelve contactos **antes** de emitir ese evento: sobrescribir velocidad allí anulaba la respuesta de la pared. Una regresión corriendo contra una pared falló a 30 FPS y ahora pasa a 30/60/144 FPS.

`CannonPhysics.update` mantiene un acumulador acotado y, por cada paso fijo, aplica controles y luego llama a `world.step(dt)`. La suspensión de RaycastVehicle conserva su callback nativo; no se duplica. Se preservan el límite de delta y el máximo de subpasos. No se añadió interpolación de render.

También pasan caída desde 50 m a 30/60/144 FPS y todas las pruebas anteriores de vehículos: 16 pruebas de física, dentro de una suite de 64. Una prueba adicional de React realiza 20 montajes/desmontajes y comprueba liberación de cuerpos, referencias y recursos registrados del debugger. Esto no certifica memoria GPU ni conducción visual: véase el estado actualizado en `2026-09-21-phase-0-1-2-closure.md`.

## Reparado

- Separados paso fijo (1/90 s), límite de frame (100 ms) y máximo de subpasos (10). Antes, limitar cada frame a 1/90 s ralentizaba la simulación a 30/60 FPS.
- Movimiento y controles de vehículos se conservan como entrada y se aplican en cada `preStep`, usando el paso fijo. Al parar un vehículo se elimina el acelerador pendiente; al desmontar el jugador local se limpia su entrada.
- Eliminada la actualización adicional de RaycastVehicle: Cannon ya ejecuta su callback por subpaso al registrar el vehículo.
- Dispose idempotente: desregistra callbacks, elimina todos los cuerpos sin mutar la colección iterada y libera referencias de vehículos y controles.
- El hook compartido registra y libera todos sus consumidores, también los observadores y quienes reutilizan la instancia. Los observadores montados primero reciben la instancia cuando se crea. Se mantiene el alcance existente de un único canvas de juego activo, no aislamiento entre varios canvas.
- El debugger se actualiza una vez desde CannonStepper; su escena auxiliar y los recursos de meshes registrados se liberan al desmontar el último consumidor.

## Evidencia local

- Las cuatro regresiones iniciales fallaban antes de las reparaciones.
- `npm test`: 29/29, incluidas seis pruebas de física: desplazamiento de cuerpo libre a 30/60/90/120/144 FPS, eliminación completa, actualización única de vehículos, deltas inválidos, controles por subpaso y limitación de pausas/dispose.
- `npm run check:phase1`: correcto, incluido TypeScript y validadores de contenido, escenas y límites del framework.
- `git diff --check`: correcto.
- Lint dirigido: dos errores preexistentes de `no-explicit-any` en lectura de suspensión de CannonCar y cannonPhysics; confirmados en HEAD. No se declara limpio el lint global.

## Pendiente antes de cerrar la fase 2

- Prueba de navegador: entrar/salir del mundo repetidamente, React StrictMode, conducción, suspensión, saltos, cambios de pestaña y memoria. El ciclo de vida del hook se revisó en código, no mediante una prueba de montaje React.
- Comparar conducción y suspensión reales a varios FPS; ya hay comparación automatizada del jugador sobre suelo plano, pero no demuestra equivalencia completa de contactos/suspensión.
- Validar máscaras y culling en los mapas reales, además de las regresiones automatizadas indicadas abajo.
- Medir coste por subpaso y suavidad visual: corregir tiempo simulado no constituye un benchmark ni añade interpolación de render.

No se hizo despliegue, commit, push ni migración de base de datos.

## Continuación: máscaras y culling

- Reproducido: `isGrounded()` devolvía true con el jugador en un mundo vacío, al intersectar su propia cápsula. El rayo ahora usa `Characters` y la máscara existente `GroundRaycast` (solo Default), omite caras traseras y respeta `collisionResponse`. No se cambia la política existente para saltar sobre vehículos.
- Reproducido: un collider con origen lejano, offset y rotación desaparecía aunque su borde alcanzara al jugador. El culling ahora mide distancia horizontal a la AABB mundial actualizada. Se eliminan excepciones por nombres de carreteras/terrenos; se conserva la histéresis de 120/150 m. Es una aproximación conservadora: una AABB grande puede mantener más geometría activa, pero no se descarta por un centro lejano.
- Reproducido: teletransportarse a una plataforma previamente desactivada no la reactivaba inmediatamente. `teleportPlayer` actualiza el estado espacial y ejecuta culling antes del siguiente paso.
- Cinco pruebas adicionales cubren máscara/autodetección/triggers, teletransporte, saltos y desplazamiento del jugador sobre suelo plano a 30/60/90/120/144 FPS (dispersión inferior a 0.15 m tras 2 s), límites con offsets/rotación e histéresis sin excepciones por nombre.
- Las tres regresiones iniciales y la del teletransporte fallaron antes de sus correcciones. Resultado final: `npm test` 34/34; `npm run check:phase1`, lint de las pruebas y `git diff --check` correctos.
- La fase 2 sigue abierta: faltan pruebas de navegador, montaje/desmontaje, conducción y perfiles de coste/memoria. No se afirma una mejora medida de FPS.

## Continuación: vehículo real y primera prueba de navegador

- Nueva regresión usa `createRaycastVehicle` real sobre un plano: 2 s de asentamiento y 3 s acelerando a 30/60/90/120/144 FPS. Comprueba desplazamiento positivo, dispersión menor de 0.5 m, altura del chasis entre 0 y 2 m y quaternion finito. Incluye retirar el vehículo y continuar simulando. No cubre aún giros, rampas ni obstáculos.
- Nueva prueba de 20 ciclos de creación/eliminación con el mismo identificador: queda solo el suelo, desaparece el cuerpo del mapa y no se vuelve a ejecutar `updateVehicle` de instancias retiradas.
- `npm test`: 36/36; `check:phase1`, lint de las pruebas y `git diff --check`: correctos.
- Navegador local en `/game`, demo ligera, invitado, Redis en memoria y migraciones desactivadas: entrada, creación de personaje, renderizado, salto (HUD Y=2), aterrizaje (Y=1), pausa y salida al portal comprobados. Registros de Cannon muestran inicializar → dispose → inicializar en StrictMode y dispose al abandonar el juego.
- Segunda entrada: lobby y creador accesibles; tras confirmar creación aparece HUD con partida activa pero la inspección posterior agota tiempos de espera del navegador. No se da por validado el segundo mundo ni se atribuye el timeout a física sin más evidencia.
- Avisos del entorno: Auth.js devuelve MissingSecret porque esta prueba aislada no tiene secreto de sesión; el acceso invitado sí funcionó. La demo no publica spawn de coche, por lo que conducción visual no se probó. No se alteraron credenciales ni archivos de entorno para ocultar esos avisos.
- Cerrados la pestaña temporal y los procesos de prueba iniciados en esta sesión. No hay medición de heap/GPU ni prueba prolongada de cambios de mundo; la fase 2 permanece abierta por esos puntos y la conducción visual en mapa completo.

## Reanudación: giro, frenado y timeout reproducido

- Nueva prueba a 30/60/144 FPS: asentamiento, aceleración, giro y freno de mano. Comprueba cambio de orientación, velocidad inicial mayor de 1 m/s, reducción de velocidad superior al 50 % en 2 s y altura finita positiva. No prueba todavía dirección izquierda/derecha exacta, freno de servicio ni rampas.
- Suite actual: 37/37; `check:phase1`, lint de las pruebas y `git diff --check` correctos. En este tramo no se modificó comportamiento de producción.
- Se repitió el recorrido en una pestaña nueva: invitado → personaje → posición estable X46/Y1/Z-25 → pausa → enlace al portal → enlace a `/game` → invitado → crear personaje. La segunda creación volvió a terminar en timeout de Runtime.evaluate; una posterior lectura de logs también agotó el tiempo y reinició la sesión de control.
- El fallo sigue sin localizarse: no hay evidencia suficiente para llamarlo fuga de Cannon, fallo React o defecto exclusivo del navegador integrado. No se obtuvieron muestras de heap/GPU. Próxima comprobación: repetir el mismo recorrido con DevTools en un navegador externo, capturando consola y rendimiento antes y después del segundo montaje; evitar seguir repitiendo la misma prueba integrada sin nueva instrumentación.
