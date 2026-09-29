# Fase 4 — extracción incremental y compatible

Orden aprobado: paquetes consumibles fuera del repositorio, después runtime y plugins opcionales, manteniendo compatible el juego actual. Se descarta una reescritura completa y no se publica en npm automáticamente.

## Bloque 1: artefactos y consumidor externo

- Compilar los cuatro paquetes actuales a CommonJS y declaraciones TypeScript, sin aliases de aplicación. La compilación de dependencias internas utiliza las declaraciones ya emitidas del paquete precedente.
- Mantener los exports fuente del workspace para no alterar desarrollo/Next; generar manifiestos de distribución separados con exports JS/tipos, dependencias internas fijadas y licencia.
- Empaquetar únicamente JS, declaraciones, manifiesto y licencia. `private: true` impide publicar accidentalmente; no impide instalar el archivo local.
- Instalar los cuatro `.tgz` en un proyecto temporal fuera del repositorio. Sin symlinks al workspace, NODE_PATH, loaders TS ni tsconfig raíz. Verificar ESM, CommonJS, subpaths, schemas, protocolo, persistencia e interfaces de extensión; typecheck Node16/NodeNext.
- CI añade esta prueba. No necesita la base de datos; npm descarga dependencias/peers del registro. No ejecuta scripts de instalación.

Comandos: `npm run build:packages` genera una carpeta única en `dist/framework/build-*` y actualiza `dist/framework/latest.json`; `npm run check:consumer` reconstruye, instala y verifica. Las compilaciones anteriores no se borran. El consumidor temporal se elimina solo tras éxito; en fallo se conserva su ruta para diagnosticar.

## Estado actual

1. Completados: empaquetado, consumidor externo, ciclo de vida de plugins y registros de extensiones por sala.
2. Demo 3D independiente exportable y probada con dos clientes, sin aliases a la raíz. Validación visual aplazada.
3. Runtime extraído: jerarquías, colliders y spawn por interfaces. Pendientes: interpretación/render genérico de modelos y gameplay restante; el juego principal aún conserva adaptadores y módulos específicos.

El smoke del bloque 1 por sí solo no demostraba una demo: el bloque 3 añade esa prueba real. Fase 4 permanece abierta por la extracción restante. Fases 5 y 6 no se adelantan ni se dan por cerradas.

## Bloque 2: runtime de escena y ciclo de vida

Implementado en `engine-client`: `createSceneRuntime` resuelve jerarquías, cajas estáticas de primitivas/modelos y spawn para un mapa. `mountSceneRuntime` recibe un `ScenePhysicsAdapter`, no Cannon/React ni constantes de juego. El adaptador conserva las máscaras actuales. Play y la capa pública usan esta ruta; no hay segundo intérprete de colliders. El montaje revierte cuerpos previos si falla y el desmontaje es idempotente, en orden inverso, intentando todas las limpiezas aunque una falle. El adaptador debe limpiar su propia asignación parcial si lanza antes de devolver cleanup.

Implementado en `engine-server`: `installRuntimePlugins` con id, versión opcional compatible y dependencias por ID dentro del lote. Valida duplicados, dependencias ausentes y ciclos antes de ejecutar setup. Instala dependencias primero, revierte instalaciones completas ante fallo y libera en orden inverso. Los wrappers de sala anteriores mantienen compatibilidad y devuelven cleanup; la sala lo conserva. Los plugins actuales de recursos y cubo demo ya desregistran handlers y limpian cooldowns.

Límites explícitos: no carga código remoto, no resuelve rangos semver ni dependencias entre lotes, no ofrece hot reload, no sustituye los registros globales existentes por registros por mundo. Render/modelos, interacción/recompensas, el controlador físico completo y la composición del juego siguen parcialmente en la aplicación. Este bloque extrae interpretación de colliders/spawn y vida útil, no declara extraído todo el motor.

Evidencia del bloque 2: **126 pruebas**, `check:phase1`, consumidor externo (incluye montaje/desmontaje de runtime y plugins), integración WebSocket real y build de producción pasan. Lint: cero errores, 82 advertencias previas. La validación visual continúa aplazada. No se modificaron datos productivos ni se publicó en npm.

## Evidencia del bloque 1

`check:consumer` pasa: cuatro tarballs instalados en un directorio temporal, ejecución Node ESM/CommonJS y compilación del consumidor con Node16/NodeNext. `check:phase1` y las 117 pruebas de regresión pasan; lint conserva 82 advertencias previas, cero errores. La instalación externa avisa de una dependencia transitiva obsoleta (`uuid@8`); no se modificaron dependencias del juego ni se certifica una auditoría de seguridad por este smoke. No se desplegó ni publicó ningún paquete en un registro.

## Bloque 3: demo 3D multijugador independiente

`apps/demo/standalone` es una aplicación pequeña de Node/Colyseus + cliente Three.js. `npm run export:demo -- <carpeta-nueva>` incluye los cuatro paquetes compilados en `vendor/` y dependencias relativas `file:`. La copia puede moverse a otra máquina e instalarse sin la raíz. El exportador nunca sobrescribe un directorio existente. Los antiguos scripts delegados se conservan como modo legacy, claramente separados.

La escena JSON canónica define suelo, cajas, transformaciones y spawn. El adaptador Cannon monta colliders mediante `mountSceneRuntime`; el servidor aplica inputs validados, simula física a paso fijo y distribuye snapshots a dos o más clientes. No acepta posiciones del cliente. El plugin de controles usa el ciclo de vida empaquetado. El navegador interpola, representa las entidades resueltas y libera render/listeners al salir. No hay dependencia de catálogos, mapas, React, Next, cuentas ni servicios privados.

`check:demo` exporta fuera del repo, instala sin scripts, compila el bundle y ejecuta tests de resolución de artefactos, física y dos WebSockets reales. CI ejecuta este gate. Tests de física: muro, salto, respawn y teardown; red: protocolo, snapshots compartidos, movimiento, rechazo de ejes/posición falsificados y salida. El servidor de prueba se cierra y la carpeta temporal se elimina tras éxito.

Alcance: ocho clientes locales como límite de ejemplo, no benchmark; cajas como único componente visual soportado por la demo; sin predicción/reconciliación, persistencia de jugadores, cuentas, soporte móvil ni exposición pública endurecida. El bind por defecto es loopback. La revisión visual se mantiene aplazada. El documento de escena persiste como archivo; el estado de jugadores no.

Se satisface la prueba de consumo de una demo fuera del workspace, pero no se declara terminada toda la extracción del juego: render/modelos genéricos, gameplay restante y aislamiento de los registros globales siguen como deuda de fase 4. Fases 5 y 6 continúan abiertas.

Evidencia del bloque 3: **127 pruebas de la raíz + 3 pruebas de la demo exportada**, build web independiente y `check:phase1` pasan. Lint mantiene cero errores y 82 advertencias previas. El bundle minificado de esta demo ronda 704 KiB antes de compresión; es un tamaño observado, no un presupuesto ni un benchmark de fase 6.

## Bloque 4: registros de extensiones por sala

Decisión incremental: factories con estado propio, funciones globales conservadas como plantillas legacy y snapshot explícito al construir cada sala. Se evita una tabla global indexada por worldId: la vida útil pertenece a la sala y su teardown, sin entradas de mundos olvidadas en otro singleton.

`createWorldRegistries()` comienza vacío. `inheritDefaults: true` copia las plantillas una vez, sin fallback vivo. Registros de nodos, efectos y herramientas permiten unregister con propiedad de cada entrada. Un cleanup viejo no elimina un registro nuevo; efectos duplicados tienen handles independientes. Posición/grants y metadatos se copian para que modificar argumentos o resultados no altere otra sala. Callbacks mantienen identidad; sus closures no se pueden copiar y deben crearse por mundo si contienen estado.

`NexusWorldRoom` inyecta su ámbito en inventario, router de herramientas, recolección y validación de escenas aplicada a la sala. Se limpia después de sus plugins. Los nodos builtin conservan precedencia por compatibilidad, como plantillas fijas; las consultas devuelven copias. Publicación/catálogo admin fuera de una sala siguen usando el catálogo de arranque: no se añadió un sistema de edición/sincronización de catálogos por mundo.

Este bloque resuelve el estado mutable de los registros de extensiones del runtime. La extracción de render/modelos genéricos y gameplay restante sigue pendiente; fase 4 no se marca cerrada ni se adelantan las fases 5/6.

Evidencia del bloque 4: **135 pruebas**, integración WebSocket real, consumidor externo, tres pruebas de demo exportada, `check:phase1` y build de producción pasan. Lint: cero errores y 82 advertencias previas. No se modificaron datos productivos ni se publicaron paquetes en npm.
