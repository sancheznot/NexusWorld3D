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

## Continuación autorizada — 2026-09-23

- Reproducida colisión de nombres: cinco worldIds distintos producían solo dos rutas. Las escrituras usan ahora SHA-256 del ID completo en un subdirectorio versionado. Los archivos legacy se conservan y se leen únicamente cuando falta el actual y su worldId coincide exactamente; un archivo actual corrupto no resucita datos legacy.
- Temporales de escritura únicos, creación exclusiva y limpieza al fallar. No se cambian permisos ni se borran escenas anteriores.
- **72 pruebas locales**. Nueva integración con dos clientes WebSocket reales: publicación por el cliente autorizado, mismo documento recibido por autor y visitante, salida y carga desde disco en una sala con ID nuevo. Usa directorio temporal y no accede a DB/Redis reales.
- Esta evidencia reemplaza el pendiente de recepción de escena por dos clientes, pero no prueba un reinicio de proceso completo, publicación versionada ni gameplay visual con dos usuarios. Continúan pendientes los demás tramos.

## Reinicio completo y aislamiento de mundo — 2026-09-26

- La integración anterior ahora lanza un proceso de servidor independiente con entorno permitido explícitamente, puertos efímeros en loopback y almacenamiento temporal. Dos clientes WebSocket reciben la publicación; el servidor cierra naturalmente, arranca otro PID y el cliente reconectado recibe la misma escena. No hereda credenciales ni DB/Redis del usuario. Este resultado sustituye la limitación histórica sobre reinicio de proceso, pero no demuestra recuperación ante corte eléctrico abrupto ni gameplay visual.
- Reproducido y reparado: una sala autenticada aceptaba publicar una escena con worldId ajeno. Apply ahora la rechaza antes de persistir/difundir. La carga desde disco se hace tras vincular la sala al mundo verificado, no al crearla con un worldId global. `NEXUS_SCENE_PERSIST_WORLD_ID` deja de aplicarse; las pruebas verifican que dos mundos firmados cargan cada uno su escena.
- Compatibilidad de archivos: lectura legacy exacta conservada; escrituras nuevas aisladas por SHA-256. No se han migrado ni borrado datos reales.
- Verificación del bloque: **74/74 pruebas**, **2/2 integraciones** (SQL/Auth.js y escenas/WebSocket/reinicio), `check:phase1`/TypeScript correctos, lint global **0 errores / 82 advertencias** y `git diff --check` correcto. Sin validación visual ni nuevo benchmark de rendimiento.
- Pendientes de fase 3: publicación versionada (borrador/publicado), Play/Stop, modelos importados/colliders, jerarquías, spawn editable y flujo completo de autoría. Las validaciones visuales siguen aplazadas por el usuario.
