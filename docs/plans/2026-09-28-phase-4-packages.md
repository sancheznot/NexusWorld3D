# Fase 4 — extracción incremental y compatible

Orden aprobado: paquetes consumibles fuera del repositorio, después runtime y plugins opcionales, manteniendo compatible el juego actual. Se descarta una reescritura completa y no se publica en npm automáticamente.

## Bloque 1: artefactos y consumidor externo

- Compilar los cuatro paquetes actuales a CommonJS y declaraciones TypeScript, sin aliases de aplicación. La compilación de dependencias internas utiliza las declaraciones ya emitidas del paquete precedente.
- Mantener los exports fuente del workspace para no alterar desarrollo/Next; generar manifiestos de distribución separados con exports JS/tipos, dependencias internas fijadas y licencia.
- Empaquetar únicamente JS, declaraciones, manifiesto y licencia. `private: true` impide publicar accidentalmente; no impide instalar el archivo local.
- Instalar los cuatro `.tgz` en un proyecto temporal fuera del repositorio. Sin symlinks al workspace, NODE_PATH, loaders TS ni tsconfig raíz. Verificar ESM, CommonJS, subpaths, schemas, protocolo, persistencia e interfaces de extensión; typecheck Node16/NodeNext.
- CI añade esta prueba. No necesita la base de datos; npm descarga dependencias/peers del registro. No ejecuta scripts de instalación.

Comandos: `npm run build:packages` genera una carpeta única en `dist/framework/build-*` y actualiza `dist/framework/latest.json`; `npm run check:consumer` reconstruye, instala y verifica. Las compilaciones anteriores no se borran. El consumidor temporal se elimina solo tras éxito; en fallo se conserva su ruta para diagnosticar.

## Bloques pendientes

1. Extraer runtime de escenas por interfaces, sin importar la app ni mapas concretos.
2. Definir ciclo de vida de plugins (id/version/dependencias, registro y dispose), incorporando los registros existentes.
3. Separar composición de demo/juego y probar una demo real usando solo los artefactos distribuidos.

El smoke externo del bloque 1 NO demuestra aún un juego independiente completo. Fase 4 permanece abierta hasta cumplir ese criterio. Fases 5 y 6 no se adelantan ni se dan por cerradas.

## Bloque 2: runtime de escena y ciclo de vida

Implementado en `engine-client`: `createSceneRuntime` resuelve jerarquías, cajas estáticas de primitivas/modelos y spawn para un mapa. `mountSceneRuntime` recibe un `ScenePhysicsAdapter`, no Cannon/React ni constantes de juego. El adaptador conserva las máscaras actuales. Play y la capa pública usan esta ruta; no hay segundo intérprete de colliders. El montaje revierte cuerpos previos si falla y el desmontaje es idempotente, en orden inverso, intentando todas las limpiezas aunque una falle. El adaptador debe limpiar su propia asignación parcial si lanza antes de devolver cleanup.

Implementado en `engine-server`: `installRuntimePlugins` con id, versión opcional compatible y dependencias por ID dentro del lote. Valida duplicados, dependencias ausentes y ciclos antes de ejecutar setup. Instala dependencias primero, revierte instalaciones completas ante fallo y libera en orden inverso. Los wrappers de sala anteriores mantienen compatibilidad y devuelven cleanup; la sala lo conserva. Los plugins actuales de recursos y cubo demo ya desregistran handlers y limpian cooldowns.

Límites explícitos: no carga código remoto, no resuelve rangos semver ni dependencias entre lotes, no ofrece hot reload, no sustituye los registros globales existentes por registros por mundo. Render/modelos, interacción/recompensas, el controlador físico completo y la composición del juego siguen parcialmente en la aplicación. Este bloque extrae interpretación de colliders/spawn y vida útil, no declara extraído todo el motor.

Evidencia del bloque 2: **126 pruebas**, `check:phase1`, consumidor externo (incluye montaje/desmontaje de runtime y plugins), integración WebSocket real y build de producción pasan. Lint: cero errores, 82 advertencias previas. La validación visual continúa aplazada. No se modificaron datos productivos ni se publicó en npm.

## Evidencia del bloque 1

`check:consumer` pasa: cuatro tarballs instalados en un directorio temporal, ejecución Node ESM/CommonJS y compilación del consumidor con Node16/NodeNext. `check:phase1` y las 117 pruebas de regresión pasan; lint conserva 82 advertencias previas, cero errores. La instalación externa avisa de una dependencia transitiva obsoleta (`uuid@8`); no se modificaron dependencias del juego ni se certifica una auditoría de seguridad por este smoke. No se desplegó ni publicó ningún paquete en un registro.
