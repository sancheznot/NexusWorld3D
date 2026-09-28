# Fase 3 — primer incremento editor → juego

**Estado actualizado 2026-09-28:** implementación del flujo MVP de fase 3 completada; revisión visual aplazada. El cierre, la evidencia y los límites actuales están en [2026-09-28-phase-3-closure.md](./2026-09-28-phase-3-closure.md). Las secciones siguientes conservan el historial y sus pendientes históricos; no deben leerse como el estado actual.

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

## Borradores, publicación y Play local — 2026-09-26

- Biblioteca administrada por el proceso de juego, accesible desde Next mediante sesión admin y secreto interno; no requiere filesystem compartido entre ambos servidores. Cada mundo conserva su borrador, documento publicado e instantáneas por hash. Guardar/publicar/restaurar exige la revisión esperada; un conflicto devuelve 409 y conserva los datos. El panel permite recargar la biblioteca sin descartar cambios locales y confirma las sustituciones explícitas.
- Publicar escribe el documento que cargarán las **nuevas salas** con `NEXUS_SCENE_LOAD_PERSISTED=1`; no actualiza salas existentes. Apply/merge en vivo sigue separado y puede cambiar ese documento si su persistencia está habilitada. La biblioteca persiste por una acción admin explícita, independientemente del interruptor de persistencia automática de apply. No hay coordinación multi-proceso ni historial de auditoría de cada clic: versiones con contenido idéntico comparten hash; se muestran las 100 instantáneas más recientes por fecha de creación.
- Administrador: abrir una escena vacía por worldId, recuperar borrador/publicación por ese mismo ID, crear/duplicar/eliminar cajas sin hijos, editar sus propiedades y publicar sin crear archivos manualmente. Los mundos no se enumeran automáticamente; se recuperan por identificador. Crear una escena no configura por sí solo identidad/tickets ni el acceso público a un nuevo mundo.
- Play/Stop local bajo demanda: snapshot del borrador, Cannon independiente, suelo/jugador/cajas del mapa exterior, WASD/flechas, carrera y salto; Escape o Stop liberan cuerpos y listeners. No utiliza el singleton físico del juego ni abre conexiones. Es una previsualización limitada a cajas, no ejecución completa de todos los componentes ni Play multijugador. El diseño mantiene el panel existente y la carga diferida evita añadir el sandbox al arranque del administrador.
- Automatización añadida: separación borrador/publicación, restauración, lectura duradera, rechazo de documentos ajenos y revisiones obsoletas, autenticación/conflictos HTTP y 20 ciclos Play/Stop sin cuerpos retenidos. Suite total: **78 pruebas**. La revisión visual permanece aplazada, no certificada.
- **La fase 3 continúa abierta**: modelos/asset IDs y colliders importados, jerarquías coherentes, spawn configurable, undo/redo, ejecución completa del documento y experiencia pública de acceso a mundos. Fases 4–6 no se consideran terminadas por este incremento.
- Verificación final del incremento: **78/78 pruebas**, integración WebSocket/reinicio **1/1**, `check:phase1` y TypeScript correctos, lint **0 errores / 82 advertencias** preexistentes, build de producción correcto en copia aislada sin `.env.local`, y `git diff --check` sin problemas. No se repitió la integración SQL en este bloque ni se hizo validación visual.

## Historial de edición y transformaciones — 2026-09-26

- Diseño: historial local acotado de snapshots inmutables frente a un sistema de comandos inversos. Los snapshots permiten cubrir las operaciones existentes y cargas de documentos sin mantener inversas específicas por componente; límite de 50 cambios para acotar memoria. No añade eventos de red ni persistencia propia. Guardar/publicar continúa siendo explícito.
- Deshacer/rehacer conserva documento y selección, recupera cajas eliminadas y cubre creación, duplicación, propiedades, reset y carga de borrador/publicación/sala. Seleccionar no añade entradas; una edición nueva tras deshacer elimina la rama de rehacer; documentos iguales no consumen historial. Un cambio del documento fuente reinicia ambas pilas para no mezclar sesiones.
- Botones con estado deshabilitado y atajos acotados al editor enfocado: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z y Ctrl+Y. No interceptan el deshacer nativo de campos editables ni el modo Play. El historial desaparece al cerrar el editor y no revierte una publicación ni cambios en salas activas.
- Inspector de cajas raíz: posición, rotación XYZ en grados y escala. Los grados se convierten a quaternions normalizados compartidos por visual y collider; la representación Euler puede cambiar de forma equivalente cerca de gimbal lock. No se añaden gizmos ni soporte nuevo de jerarquías.
- Campos numéricos: texto provisional hasta Enter/blur; Escape cancela; valores vacíos, no finitos o fuera de rango conservan el valor previo y muestran aviso. Tamaño y escala respetan conjuntamente el límite de dimensión final de 1000. El cambio confirmado produce una única entrada, no una por tecla.
- Pruebas: reducer (selección, borrado, ramas, límite, carga/reset), hook React con acciones agrupadas, componente numérico (confirmación, rechazo, cancelación, actualización tras undo), equivalencia de rotaciones y rechazo de transformaciones inválidas. Suite: **86/86**. Validación visual sigue aplazada.
- Pendientes de fase 3 tras este bloque: modelos/asset IDs y colliders importados, jerarquías coherentes, spawn configurable, ejecución completa del documento y acceso público a nuevos mundos. El undo/redo local ya está implementado; no implica historial colaborativo ni cierre completo de la fase.
- Cierre técnico del bloque: `check:phase1`, TypeScript, build de producción en copia aislada y `git diff --check` correctos; lint global **0 errores / 82 advertencias** existentes. Sin cambios de protocolo, DB o dependencias; no se repitieron integraciones de red/SQL en este incremento exclusivamente de editor.

## Spawn configurable — 2026-09-27

- Escena v0.1 extendida de forma opcional con `spawn: { mapId: 'exterior', position: [x,y,z], yaw }`. Coordenadas finitas y acotadas; Y es el centro del cuerpo y su mínimo es 1.05; yaw en radianes entre −2π y 2π. Las escenas sin spawn mantienen sus valores anteriores. No se admiten mapas sin soporte ni se modifica el protocolo de mensajes.
- Editor: activar/desactivar, XYZ y orientación en grados, marcador verde con dirección, integración con undo/redo, guardado/publicación y exportación existentes. Colocar el spawn dentro de geometría sigue siendo responsabilidad del autor: no hay búsqueda automática de superficie libre ni garantía de spawn sin solapamientos.
- Play local usa posición/orientación y adapta cámara/controles a esa orientación. Servidor: usa el spawn como valor inicial de nuevos jugadores; snapshots y perfiles SQL existentes tienen prioridad. Publicar no mueve a jugadores conectados; las salas existentes conservan su documento hasta aplicar un cambio explícito.
- Inicialización física del cliente desde la pose actual del store, incluida su altura/orientación, para conservar poses recibidas antes de montar el canvas. Se verifica durante 20 montajes StrictMode y limpiezas; no se sustituye la hidratación/corrección de servidor existente.
- Pruebas: validación y compatibilidad del schema, pose de Play, undo/redo de spawn y montaje físico tardío. Integración de dos clientes/reinicio ampliada: nuevo jugador recibe exactamente la posición y orientación publicadas. Integración SQL/Auth.js ampliada: el perfil guardado conserva su posición aunque la escena tenga otro spawn.
- Suite local **89/89**, integraciones **2/2** en entorno aislado, TypeScript/check:phase1 y lint sin errores (82 advertencias existentes). Validación visual sigue aplazada. Pendientes de fase 3: assets/modelos y colliders importados, jerarquías coherentes, ejecución completa del documento y experiencia pública de acceso a mundos. Fases 4–6 siguen abiertas.
- El test SQL ahora reproduce la carga del manifiesto del arranque real y exige recibir la escena por WebSocket antes de comprobar la prioridad del perfil: sin ello podía pasar sin haber cargado el spawn. Build de producción aislado y `git diff --check` correctos. No se alteró la base de datos original ni se desplegaron servidores.

## Modelos estáticos registrados + colliders — 2026-09-27

Implementado el recorrido por asset ID: selector → instancia transformable → cajas de colisión editables → borrador/publicación → Play/runtime, con loader común y limpieza por instancia. Fixture glTF de puerta redistribuible: apertura transitable y pilares sólidos verificados a 30/144 FPS. Detalles y límites en `2026-09-27-scene-models-colliders.md`.

Verificación: **96 pruebas**, **2 integraciones**, TypeScript/check:phase1, build aislado y lint sin errores. Revisión visual aplazada. Quedan **registro/subida completamente desde web**, jerarquías, ejecución de otros componentes y acceso público a mundos; mallas físicas exactas, animaciones y optimización masiva no forman parte de este bloque. No marcar fase 3 completa.

## Subida y registro web de GLB — 2026-09-27

Completado el registro desde el administrador para GLB estáticos autocontenidos de hasta 16 MiB. Catálogo duradero por hash, autenticación admin/interna, descarga pública inmutable, deduplicación y límites de complejidad. No requiere editar el manifiesto ni reconstruir. Los modelos nuevos son atravesables hasta configurar sus colliders; subir no publica la escena. Detalles operativos y límites en `2026-09-27-scene-model-uploads.md`.

Verificación: **101 pruebas**, **2 integraciones**, TypeScript/check:phase1 y build aislado correctos. Revisión visual sigue aplazada. El pendiente histórico de registro web queda cubierto para este formato limitado; jerarquías, otros componentes y acceso público a nuevos mundos mantienen abierta la fase 3. No se cierran fases 4–6.

## Jerarquías de grupos con colisiones coherentes — 2026-09-27

Implementado el alcance elegido por el usuario: grupos anidados con escala uniforme, cajas/modelos con escala por eje, transformaciones locales y resolución mundial compartida entre editor/Play/runtime/físicas. Editor: crear grupo, cambiar padre conservando pose mundial, duplicar/borrar subárbol y deshacer/rehacer. Límites acumulados, ciclos y profundidad se validan antes de aceptar la escena. Los grupos no generan colisiones ni geometría de juego.

Verificación: **108 pruebas**, **2 integraciones aisladas**, TypeScript/check:phase1, build de producción aislado y lint sin errores (82 advertencias preexistentes). Las integraciones incluyen jerarquías y modelos subidos tras reinicio completo. Detalles y compatibilidad en `2026-09-27-scene-hierarchy-design.md`. No se ejecutó revisión visual ni benchmark GPU.

Pendientes de fase 3: ejecución/autoría del resto de componentes y acceso público a nuevos mundos. Recursos/triggers/componentes personalizados no se pueden anidar todavía; las mallas deformadas, físicas de malla y cuerpos dinámicos quedan fuera de este bloque. Fases 4–6 siguen abiertas.
