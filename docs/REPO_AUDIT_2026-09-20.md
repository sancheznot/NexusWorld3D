# Auditoría técnica de NexusWorld3D

Fecha local: 20 de septiembre de 2026. Revisión: `d6ecd33b9f0999ce103419a7fb07b166869c12da`, rama `main`.

Seguimiento: este documento describe el estado anterior a las reparaciones. La primera implementación de economía e inventario está registrada en `docs/plans/2026-09-20-economy-inventory-hardening.md`; no implica que el resto de hallazgos esté resuelto.

La segunda implementación, identidad verificada de cuentas y persistencia independiente del nombre, está registrada en `docs/plans/2026-09-21-world-identity-hardening.md`. Su integración con OAuth/MariaDB reales aún requiere validación.

## Dictamen

Existe una base considerable de juego 3D multijugador y herramientas de administración. La separación hacia un framework modular empezó, pero el motor ejecutable todavía vive principalmente en la aplicación y conoce reglas, mapas y contenido del juego. No está terminado el recorrido «crear un mundo arbitrario en el administrador → publicarlo → jugarlo con sus modelos, colisiones y comportamientos».

La prioridad es estabilizar autoridad del servidor, identidad, economía y tiempo de simulación; después conectar un formato de escena común al editor y al runtime. Extraer paquetes sin resolver ese recorrido produciría una separación de carpetas, no un motor reutilizable.

## Alcance y límites

- Inventario del repositorio: 476 archivos versionados. Revisión transversal de paquetes, cliente, servidor, recursos, editor, escenas, almacenamiento, autenticación, físicas, red, CI, Docker y publicación.
- Inspección detallada de los recorridos principales y reproducciones locales aisladas de errores. No equivale a inspección línea por línea de todos los assets y documentos históricos.
- No se ejecutaron ataques contra servicios, escrituras de juego, migraciones, despliegues ni publicaciones. No se leyeron valores de `.env.local`.
- No se midieron FPS/GPU en navegador, carga con 50 usuarios, latencia real, servidor desplegado ni persistencia contra MariaDB/Redis/S3. No se ejecutó el build de producción.
- Las referencias `origin/main` y `nexus/main` locales apuntan al mismo commit auditado. No se hizo fetch: esto no certifica el estado actual de GitHub ni sus permisos.
- Esta entrega es un diagnóstico y plan de reparaciones. El único cambio de esta auditoría es este documento; las reparaciones del runtime no están implementadas.

## Estado frente a la visión del producto

| Objetivo | Evidencia actual | Brecha principal |
|---|---|---|
| Framework público | Cuatro workspaces, protocolo versionado, esquemas, registros de extensiones, documentación y CI | Los paquetes siguen `private: true`; el runtime completo no está extraído ni se prueba desde un consumidor independiente |
| Core modular | Contratos de plugins, recursos de inventario/economía/jobs/tiempo y adaptadores de persistencia | `resources/types.ts` depende de `NexusWorldRoom` y clases concretas; composición y reglas específicas siguen mezcladas |
| Juego 3D | Three/R3F, Cannon, personajes, vehículos, mapas, portales, recolección, construcción | Corrección física, autoridad y ciclo de vida pendientes |
| 2.5D | `SideScrollCamera`, configuración `sideScroller` y rama de controles en `useAdvancedMovement` | Es una variante del runtime 3D; falta un contrato de plano/profundidad y herramientas de authoring específicas |
| 2D completo | No se identificó un subsistema completo en la ruta activa | Sprites/atlas, animación por frames, tilemaps, capas, colliders y editor 2D están pendientes |
| Editor web | Upload GLB, colocación/propiedades, varios editores, Scene View, inspección, apply/merge y persistencia de escenas | Dos formatos de mundo y representación parcial; no existe un intérprete general de componentes render/física/gameplay |
| Multijugador | Salas, lobby, snapshots, chat, protocolo, persistencia y mensajes de gameplay | Identidad verificable, autoridad sobre movimiento/economía, aislamiento por mundo e interpolación robusta |
| Rendimiento | SAP broadphase, sleep, culling estático, modelos comprimidos, opciones de renderer | No hay presupuesto medido ni pruebas de regresión; hay trabajo por frame y capturas costosas |

## Resultados de verificaciones

| Verificación | Resultado |
|---|---|
| `npm run check:phase1` | Pasa: manifiesto, escena de ejemplo, límites de paquetes, imports, lint de paquetes/servidor, cadenas OSS y TypeScript |
| ESLint global, mismo alcance que `npm run lint` | Falla: 81 errores y 83 advertencias en 353 archivos analizados |
| Archivos versionados `*.test.*` / `*.spec.*` | No encontrados; sí existen scripts de validación |
| `validate-build-assets` | Sale con éxito, pero faltan los tres GLB comprobados: wall_wood, wall_stone y floor_stone; se anuncian fallbacks |
| `validate-required-models`, nivel boot | Pasa: cuatro assets |
| `npm ci --dry-run --ignore-scripts --offline` | Inconcluso: `ENOTCACHED` para nodemailer y advertencias de peers. No demuestra que falle una instalación con red |
| Reproducción del stepping con Cannon instalado | Dependencia de velocidad respecto a FPS confirmada |
| Handler de pago, sala simulada | Crédito concedido a partir del importe enviado por cliente, sin trabajo verificado |
| Handler de retirar inventario, sala simulada | Cantidad 5 → 15 al solicitar retirar −10 |
| Conversión monetaria real | `toMajor(toMinor(1)) === 100`, debería ser 1 |
| Schema de escenas real | Acepta entidad como su propio padre y ciclos A→B→A |
| Patrón de dispose con Cannon instalado | Al retirar cuatro bodies mediante `forEach` sobre el array mutado, quedan dos |

## Hallazgos prioritarios

P0: cerrar antes de exponer gameplay persistente a clientes no confiables. P1: corrección fundamental del motor/producto. P2: mantenibilidad, optimización o endurecimiento posterior. Las prioridades no son una afirmación de explotación en producción.

### A01 · P0 · La identidad de juego no está ligada a una identidad autenticada

`server/rooms/NexusWorldRoom.ts:372` acepta `username` de las opciones del cliente. En `:530` carga el perfil persistente por ese nombre normalizado. En `:971` el mensaje de join permite cambiarlo otra vez y guardar. No existe un `onAuth` propio en la sala; la implementación instalada de Colyseus devuelve `true` por defecto.

Consecuencia: un cliente que elija el nombre de otra cuenta puede acceder a su perfil de juego y afectar su persistencia cuando el backend está configurado. El login de la web no resuelve por sí solo la autenticación del WebSocket.

Reparación: ticket de conexión firmado/verificable emitido desde la sesión web; identidad inmutable `accountId` en la sala; perfiles e inventarios por identificador estable y mundo. Invitados con identidad distinta generada por servidor. El nombre visible no debe ser clave de propiedad.

Aceptación: un cliente sin ticket o con nombre ajeno no obtiene ni sobrescribe el perfil ajeno; dos sesiones de la misma cuenta tienen una política explícita.

### A02 · P0 · El cliente puede adjudicarse dinero

`resources/economy/server/EconomyEvents.ts:243` registra `EconomyMessages.JobPay` y acredita la cantidad indicada sin comprobar trabajo, resultado ni autorización. Reproducido invocando el handler real con una sala simulada.

Reparación: retirar el comando público que acredita dinero; los sistemas de trabajos/recompensas deben invocar un servicio interno con resultado e identificador de operación verificables. Repetir una recompensa no debe duplicarla.

### A03 · P0 · El inventario acepta mutaciones que permiten fabricar o multiplicar objetos

`resources/inventory/server/InventoryEvents.ts:640` acepta sustituir el inventario con validación superficial (`:1017`). `handleAddItem` comprueba que el identificador exista, pero no que el jugador haya ganado ese objeto. `handleRemoveItem`, en `:714`, no exige una cantidad positiva: restar −10 incrementa la cantidad. Esta última ruta se reprodujo: 5→15.

Reparación: comandos de intención, catálogo y capacidad calculados por servidor, cantidades enteras positivas finitas y transacciones de inventario atómicas. No aceptar snapshots del cliente como verdad. Probar replays, duplicados, cantidades negativas, desbordes y inventario lleno.

### A04 · P1 · Conversión monetaria multiplicada por 100

`src/lib/utils/money.ts:25`: `currencyjs(majorAmount).multiply(100).intValue` multiplica por 100 antes de leer un valor que ya representa centésimas. Ejemplo real: 1→10000→100 al convertir ida/vuelta.

Reparación: una representación única en unidades menores, conversiones simétricas y pruebas para decimales. Antes de corregir datos persistidos, distinguir valores de wallet, oro de inventario y unidades guardadas: no aplicar una división masiva a ciegas.

### A05 · P1 · Movimiento y cambios de mapa confiados al cliente

`NexusWorldRoom.ts:1004` copia posición/rotación directamente; `:1067` acepta mapa destino y pose. Tipos TypeScript no validan payloads de red. No se comprueban distancia recorrida, colisión, portal ni finitud de coordenadas. `server/modules/ItemEvents.ts:134` recoge por `mapId/spawnId` sin comprobar distancia del jugador en ese handler.

Reparación inicial: schemas de mensajes, límites de frecuencia/tamaño, coordenadas finitas, reglas de mapa y distancias. Destino de portales calculado por servidor. Después, inputs numerados, simulación autoritativa, snapshots, predicción y reconciliación para el modo que lo necesite. Limitar velocidad por sí solo no impide atravesar paredes.

### A06 · P1 · La simulación corre más lenta bajo 90 FPS

`src/components/physics/CannonStepper.tsx:11` limita el delta a `maxDeltaTime`; `src/constants/game.ts:74` fija ese valor a `1/90`. `cannonPhysics.ts:425` vuelve a usarlo como paso fijo. Se pierde tiempo real antes de que Cannon pueda acumularlo. `PlayerV2.tsx:249` también limita el delta de movimiento.

Prueba aislada: cuerpo con velocidad constante de 9 unidades/s, sin gravedad ni damping, durante un segundo de frames:

| FPS | Tiempo simulado aproximado | Distancia |
|---|---|---|
| 30 | 0,333 s | 3 |
| 60 | 0,667 s | 6 |
| 90 | 1 s | 9 |
| 120 | 0,989 s | 8,9 |

Reparación: separar `fixedTimeStep`, límite de delta tras pausas y `maxSubSteps`; conservar el tiempo del frame normal; movimiento por subpaso e interpolación visual. La pequeña diferencia a 120 FPS en esta prueba proviene del acumulador/subpasos, no de un benchmark del juego.

Aceptación: misma trayectoria y salto, dentro de tolerancia, a 30/60/90/120/144 FPS; retorno de pestaña sin explosiones ni deuda de simulación ilimitada.

### A07 · P1 · Los vehículos actualizan suspensión/fuerzas dos veces

`cannonPhysics.ts:1048` llama `RaycastVehicle.addToWorld`, que en Cannon instalado registra `updateVehicle(world.dt)` en `preStep`. Además `cannonPhysics.ts:438` llama `updateVehicle(delta)` tras `world.step`.

Reparación: un único dueño de la actualización física por subpaso; separar las transformaciones visuales de ruedas. Validar suspensión, frenado, tracción y saltos antes/después. La doble ruta está confirmada en código; su efecto concreto al conducir requiere prueba interactiva.

### A08 · P1 · Vida útil de físicas y temporizadores incorrecta

`useCannonPhysics.ts` incrementa `initializationCount` antes de dos retornos que no registran cleanup. El debugger compartido también puede actualizarse desde múltiples consumidores. `cannonPhysics.ts:2538` elimina bodies mientras recorre el array original; reproducción con cuatro bodies deja dos. `NexusWorldRoom.ts:1442` crea un `setInterval` sin guardarlo ni cancelarlo en `onDispose`.

Reparación: propietario explícito por instancia de mundo, adquisición/liberación simétrica, un único debugger, retirada desde una copia o bucle seguro y temporizadores de sala con cleanup. Probar ciclos repetidos de entrar/salir/cambiar mapa y verificar que no crezcan listeners/bodies/timers.

### A09 · P1 · Dos formatos de mundo sin un runtime general común

El editor anterior persiste `WorldData.objects` en `src/core/worlds.ts`; el nuevo utiliza `SceneDocumentV0_1.entities`. La ruta activa de `GameCanvas` monta mapas concretos (`CityModel`, `HotelInterior`, `Supermarket`). No se encontró una ruta de carga general de esos `WorldData.objects` en el juego.

`SceneAuthoringPreviewLayer.tsx` representa entidades no-resource como cajas moradas, sin crear colliders ni interpretar componentes de render. Los resource nodes sí tienen tratamiento específico: no todo el authoring es meramente visual.

Reparación: formato canónico versionado y migración del anterior; mismo intérprete de escena para Play del editor y cliente de juego. Primer conjunto: transform, modelo/primitiva, collider, rigid body, spawn, trigger y portal. Publicar revisiones inmutables; editar un borrador no debe alterar inadvertidamente una partida.

Aceptación: crear un mundo vacío, colocar suelo y GLB, configurar collider/spawn, guardar, recargar y jugar con dos clientes sin modificar TSX.

### A10 · P1 · Jerarquía de escena aceptada pero incompleta

`packages/content-schema/src/sceneV0_1.ts` comprueba que el padre exista, pero admite autociclos y ciclos entre entidades (reproducido). El preview ignora `parentId` al aplicar transformaciones y dibuja una lista plana.

Reparación: validar grafo acíclico, profundidad máxima, límites de entidades/props, transformaciones finitas y política de escala/cuaterniones; componer transformaciones padre-hijo. Probar jerarquías rotadas/escaladas y documentos inválidos.

### A11 · P1 · Los mundos no están aislados durante matchmaking

`server/colyseus/registerRooms.ts` registra salas sin particionarlas por `worldId`. El join acepta `worldId` como dato del jugador; el envío de movimiento filtra por `mapId`, no por mundo. Dos joins al mismo tipo de sala pueden compartir estado aunque pidan mundos distintos.

Reparación: identidad de mundo por sala, selección/filtrado de matchmaking, comprobación de permisos y claves de persistencia por mundo/cuenta. Usar la API compatible con Colyseus 0.16 instalado, no copiar sin adaptación ejemplos de versiones nuevas.

### A12 · P1 · Escritura de mundos fuera del directorio previsto

`src/app/api/admin/worlds/[id]/route.ts:39` ignora el id de la URL y pasa el cuerpo completo a `saveWorld`. `src/core/worlds.ts` concatena `world.id` sin validar contención. Un administrador autenticado puede enviar identificadores con segmentos `../` y escribir un archivo JSON fuera de `worlds`, según permisos del proceso. No se ejecutó una escritura de prueba.

Reparación: schema en API, id consistente con URL, allowlist de identificadores, resolución y comprobación de contención, guardado atómico y propagación de errores. `createWorld` también debe comprobar el resultado de `saveWorld` antes de devolver éxito.

### A13 · P2 · Sesiones admin débiles y dependientes de proceso

`src/core/auth.ts:121` genera ids con timestamp y `Math.random`. El login no incorpora limitación de intentos y las sesiones residen en un Map del proceso. Las cookies sí incluyen HttpOnly/SameSite y Secure en producción.

Reparación: aleatoriedad criptográfica, limitación de intentos, revocación y almacén compartido cuando haya varias instancias. Preferiblemente integrar roles administrativos con la identidad estable de cuentas.

## Colisiones y rendimiento: mejoras justificadas

1. **Culling por volumen, no por nombre/centro.** `cannonPhysics.ts:471` decide activar estáticos por distancia a su centro y excepciones regex como road/hill. Un collider grande cuyo nombre no coincida puede desaparecer junto al jugador. Usar distancia a AABB y margen predictivo de velocidad; reactivar inmediatamente tras teleport. Para múltiples objetos dinámicos, considerar todas las zonas activas, no solo el jugador/coche seleccionado.
2. **Preparar colliders fuera de la carga de juego.** `createHeightfieldFromMesh` muestrea una grilla con raycasts en el hilo principal. Guardar colliders simplificados/bakeados al importar/publicar. Mantener UCX/manual como opción. Validar puente, túnel, techo y overhang: un heightfield no representa múltiples alturas por columna.
3. **Desacoplar React del tick.** `PlayerV2.tsx:221` hace setters y actualiza el store por frame; `GameCanvas.tsx:108` se suscribe al store completo. Mover pose transitoria a refs/buffers, usar selectores y publicar HUD a frecuencia menor o al cambiar. Es coherente con las [recomendaciones oficiales de R3F](https://r3f.docs.pmnd.rs/advanced/pitfalls).
4. **Optimizar red después de definir autoridad.** Actualmente se envía pose cada 100 ms y la sala actualiza estado Colyseus además de mensajes explícitos por jugador. Para 50 jugadores enviando a 10 Hz, el bucle explícito puede producir 24.500 entregas/s si comparten mapa; es un cálculo, no una medición. Introducir interés espacial, deltas, cadencia y un canal de estado bien definido; buffer temporal de interpolación remota.
5. **Evitar asignaciones y recomputaciones calientes.** Reutilizar vectores, matrices y raycasts; no clonar modelos en cada render de editores; compartir geometrías/materiales y agrupar instancias repetidas cuando las métricas lo justifiquen.
6. **Cámaras secundarias bajo presupuesto.** `LiveCameraCapture.tsx` renderiza la escena, lee GPU, invierte píxeles, crea canvas y codifica JPEG. Medir con panel abierto/cerrado; reutilizar buffers y desactivar capturas no visibles. No es razonable adjudicarles un porcentaje de coste sin profiling.
7. **Motor físico único por modo.** Hay dependencias Cannon y Rapier, pero el recorrido activo auditado usa Cannon. No asumir que tener Rapier instalado equivale a usarlo. Corregir primero stepping/ownership y comparar una escena de referencia antes de decidir una migración.
8. **Medir por escenarios.** Registrar frame CPU/GPU p50/p95/p99, tiempo de física, draw calls, triángulos, memoria, bytes de red y tiempo de carga en demo, ciudad, vehículos y editor. `public/models` ocupa 272 MB localmente, pero muchos archivos están ignorados: eso no es el tamaño de descarga de un jugador ni del repositorio público.

Pruebas de colisión propuestas: pared delgada a máxima velocidad, rampa/escalón, esquina, techo bajo, suelo móvil, puente con zona inferior, collider con escala/rotación de padre, cambio de mapa, teleport largo y coche contra trimesh. Comprobar tunneling y compatibilidad concreta de pares de shapes del backend antes de prometer «colisiones precisas».

## Persistencia, distribución y OSS

- Mantener los adaptadores Redis/Upstash/memoria y la persistencia atómica de escenas: son buenas bases ya implementadas.
- Consolidar identidad y esquema persistente. El perfil/inventario se guarda, pero wallet/banco de `EconomyEvents` viven en Maps por sesión y no aparecen en la ruta de snapshot inspeccionada. El oro de inventario y wallet son conceptos duplicados que deben unificarse o diferenciarse explícitamente.
- Añadir cola/versionado de escrituras por cuenta para evitar que un guardado viejo termine después de uno nuevo. Definir política entre múltiples sesiones y procesos.
- `apps/demo` delega a la raíz: no demuestra que un tercero pueda crear un juego consumiendo solo paquetes publicados.
- `scripts/commit-to-nexus*.sh` cambia la URL de `origin`, hace `git add .` y en la variante parametrizada publica. `.gitignore` no retira archivos ya versionados ni su historia. Usar remotos explícitos y una frontera real framework/juego; revisar licencias e historial antes de cualquier publicación. No se ha comprobado exposición de secretos ni infracción de licencias.
- Los diez archivos versionados bajo `public` incluyen los modelos/texturas base. Los checks OSS miran solo `packages`; no certifican la redistribución del árbol completo.
- `next.config.ts` ignora lint en build. CI ejecuta `check:phase1`, que omite lint de `src` y `resources`, build y pruebas funcionales. Ampliar el gate después de resolver el baseline.
- Verificar instalación limpia con red en checkout aislado: `node_modules` existente y aliases TS pueden ocultar problemas de distribución. Los paquetes exportan TS y no tienen pipeline autónomo de publicación.

## Arquitectura objetivo incremental

No hace falta una reescritura total ni convertir cada subsistema en un framework independiente.

| Capa | Responsabilidad y frontera |
|---|---|
| Core | Entidades, componentes, reloj, ciclo de vida y registro de sistemas; sin mapas, React, economía ni proveedores de datos |
| Scene/content | Documento versionado, validación, migraciones, assets y revisiones publicadas |
| Runtime cliente | Carga/descarga de escena, render, input, cámara, interpolación y adaptadores físicos |
| Runtime servidor | Identidad, mundos/salas, comandos validados, simulación y persistencia por interfaces |
| Editor web | Inspector generado desde definiciones de componentes, assets, jerarquía, comandos undo/redo y Play con el mismo runtime |
| Plugins opcionales | Inventario, economía, crafting, jobs, vehículos, NPCs, construcción y recursos |
| Juego privado/demo | Reglas, catálogos, mapas, branding y contenido; consumidores de los paquetes del motor |

Definir para cada plugin: id/version/dependencias, schemas, comandos/eventos, registro cliente/servidor/editor y `dispose`. Sustituir dependencias hacia clases concretas por interfaces pequeñas. Conservar los registros y contratos existentes donde encajen.

Para dimensiones: núcleo compartido y capacidades explícitas. 3D usa transform/collider/cámara 3D; 2.5D añade restricciones de plano/profundidad y cámara; 2D necesita sprites, atlas, tilemaps y controles propios. No basta con cambiar la cámara para afirmar soporte 2D completo.

## Orden de ejecución y criterios de cierre

| Fase | Trabajo | Criterio de salida |
|---|---|---|
| 0 · Base reproducible | Pruebas de regresión de A01–A08, instalación limpia, baseline lint y assets | Fallos reproducibles sin infraestructura productiva; consumidor/demo arranca documentadamente |
| 1 · Integridad multijugador | Identidad, economía/inventario, validación de mensajes, mapas y persistencia | No se puede otorgar dinero/objetos ni usar perfiles ajenos desde comandos de cliente |
| 2 · Física estable | Delta/subpasos, vehículos, cleanup, máscaras y culling | Trayectorias equivalentes entre FPS, contactos correctos y cero crecimiento tras ciclos de montaje |
| 3 · Editor a juego | Escena canónica, loader, componentes mínimos, assets/colliders, publish/play | Mundo creado desde cero y jugado por dos clientes, persistente tras reinicio |
| 4 · Modularidad real | Extraer runtime, interfaces y plugins; separar demo/juego | Nuevo proyecto funciona consumiendo artefactos empaquetados sin aliases a la raíz |
| 5 · Dimensiones | Plantillas 3D, 2.5D y 2D con capacidades reales | Tres demos pequeñas creadas con herramientas compartidas, sin modificar el core |
| 6 · Rendimiento y escala | Profiling, instancing, streaming, interés espacial, interpolación, carga | Presupuestos acordados en hardware y escenas definidos; carga de 10/25/50 jugadores medida |

El trabajo de red debe empezar en fase 1; la simulación autoritativa completa y predicción pueden avanzar con fase 2. No posponer integridad de datos hasta una futura optimización.

Las primeras features de alto valor son: Play/Stop real del editor, inspector de colliders, prefab reutilizable, undo/redo consistente, validación previa a publicar y ejemplos mínimos de cada modo. Un editor visual de lógica, marketplace, colaboración simultánea y mundos masivos vendrían después de demostrar el recorrido básico.

No se fijan plazos ni mejoras porcentuales sin medir. La meta inmediata más útil es: **crear un mundo pequeño desde el administrador, entrar con dos usuarios autenticados, colisionar de forma consistente a distintos FPS y conservar el estado tras reiniciar**.
