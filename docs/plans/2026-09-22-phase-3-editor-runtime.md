# Fase 3 — primer incremento editor → juego

## Dirección

El usuario autorizó continuar con las demás fases y dejar la validación visual para después. No se marcan las fases 0–2 como cerradas por esa decisión. Seguimos el formato canónico v0.1 y los endpoints protegidos existentes; no añadimos un editor alternativo ni adelantamos la extracción modular de fase 4.

## Implementado

- `nexus:box` en content-schema: una caja raíz con tamaño, color, mapa y colisión estática opcional. Límites explícitos, sin escalas degeneradas ni jerarquías físicas implícitas.
- Botón «Añadir caja sólida» e inspector de tamaño/color/colisión en Scene View; conserva edición de posición, exportación, apply y merge existentes.
- Editor y juego usan el mismo tamaño/color. El juego instala cuerpos Cannon estáticos con la misma transformación; los retira al reemplazar escena, cambiar mapa o desmontar.
- Se rechazan ciclos de padres, transforms no finitos y quaternions no unitarios antes de consumir una escena.
- Los snapshots recibidos temprano se conservan para replay; al abandonar una sala se borra la escena y su buffer, evitando trasladar colliders a otra sala.
- Apply/merge no emiten éxito ni modifican la escena activa si falla una escritura de persistencia habilitada. Cargar un archivo cuyo worldId no coincide con el solicitado devuelve null.
- Ejemplo redistribuible sin GLB: `content/scenes/boxes.v0_1.json` (pared y plataforma).

## Pruebas automatizadas

- Rechazo de datos/ciclos inválidos.
- 20 instalaciones y retiradas sin crecimiento de cuerpos; filtro por mapa y `solid=false`.
- Guardado en directorio temporal y carga validada; reconstrucción de pared en dos runtimes independientes a 30 y 144 FPS, sin atravesarla al correr.
- Persistencia fallida conserva escena anterior sin broadcast, tanto en apply como merge; merge nulo falla sin excepción.
- Replay del snapshot y limpieza al desconectar.

Las dos simulaciones independientes **no son** una prueba de dos navegadores/WebSockets ni un reinicio completo del proceso de servidor. No se certifica el criterio total de cierre de fase 3 con ellas.

## Siguientes tramos, todavía pendientes

1. Publicación versionada por mundo, draft vs publicado y Play/Stop real; prueba de red con dos clientes y reinicio completo.
2. Modelos/asset IDs, loader y colliders importados; jerarquías y transformaciones de componentes aplicadas coherentemente.
3. Spawn configurable de escena y recursos mínimos para un mundo creado desde cero; creación/borrado y undo/redo coherentes del editor.
4. Validación visual aplazada por el usuario. Fase 4 (paquetes/plugins), 5 (plantillas por dimensión) y 6 (escala medida) aún no se dan por implementadas.

La persistencia actual es JSON local, no publicación distribuida: no certifica coordinación entre procesos ni fsync frente a corte de energía. La colisión añadida es cliente, no anticheat servidor.

## Punto de guardado — 2026-09-23

Por petición del usuario se cierra este bloque para commit local, sin abrir nuevos frentes. Suite: **70/70**, `check:phase1` y TypeScript correctos; lint global **0 errores / 82 advertencias**. La prueba React del layer comprueba reemplazo de documento, cambio de mapa y limpieza al salir. Validaciones visuales aplazadas expresamente; no marcar la fase 3 completa ni iniciar 4–6 desde este punto de guardado sin retomar los pendientes anteriores.
