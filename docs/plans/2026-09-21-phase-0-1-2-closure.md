# Cierre verificable de fases 0, 1 y 2

Este documento registra evidencias de cierre, no sustituye pendientes por marcas de completado.

## Estado actualizado — continuación del 22 de septiembre

Esta sección sustituye los contadores y pendientes históricos de abajo. **No se declara el cierre completo de 0–2.**

- **64/64 pruebas locales**, `check:phase1` (incluye TypeScript), lint global **0 errores / 82 advertencias**, integración SQL/Auth.js/WebSocket y `git diff --check`: correctos.
- Instalación limpia repetida: `npm ci --no-audit --no-fund`, 796 paquetes, sin `.env.local` ni assets privados. Build de producción correcto en esa copia; los peers de Auth/Nodemailer y Leva/React siguen generando advertencias.
- Demo: cuatro assets boot verificados con `--tier=demo --strict`; ya no necesita los sky GLB ausentes ni precarga ciudad/interior/vehículo. El modo completo conserva el tier `sky` y sus requisitos.
- CI exige ahora lint global además de pruebas, assets, build e integración. No se ha ejecutado el workflow remoto.

### Integridad reparada y comprobada

- Tala/minería usan exclusivamente la pose finita del servidor, distancia 3D y mismo mapa. Las regresiones cubren la pose falsificada, otro mapa, altura y coordenadas inválidas, además del caso válido.
- Movimiento con presupuesto temporal acumulado: el spam no regenera tolerancia; saltos fuera del presupuesto reciben corrección. Portales comprobados por ID, origen, alcance, estado y destino registrado; el cliente espera confirmación y no elige coordenadas de llegada.
- Matchmaking filtrado por mundo; la sala rechaza identidades de mundos distintos y opciones que contradicen el ticket. Una regresión comprueba ambos rechazos.
- Progreso de trabajos ya no acepta cantidades del cliente. Los recursos pueden acreditarlo mediante `recordProgress`; rutas comprueban alcance y espera, y pagan una sola vez. **Los trabajos no basados en rutas necesitan que su recurso real invoque ese método: el antiguo botón de progreso no acredita recompensas.**
- Monedero, banco y límites diarios se guardan en el perfil y se restauran: depósito, salida, SQL y reconexión comprobados con una cuenta autenticada real en la base desechable.
- Snapshots congelados antes de esperar y cola de escrituras por cuenta: una escritura antigua no termina sobrescribiendo una más reciente; los errores no bloquean toda la cola.
- Comandos de inventario rechazan payloads malformados; chat limita tamaño, frecuencia y canal, y toma el nombre del servidor. El ataque legacy que retransmitía daño del cliente queda explícitamente rechazado: **no es un sistema de combate implementado**.

### Estabilidad reparada y comprobada

- 20 ciclos de montaje/desmontaje React comprueban que desaparecen el mundo, cuerpos, referencias y recursos de meshes del debugger. Son pruebas de objetos y eventos `dispose`, no medición de memoria GPU.
- Suscripciones de mundo/reloj sobreviven a los cambios de sala; las del room anterior se retiran y no se duplican. Conexiones simultáneas comparten la operación; desconectar invalida un join pendiente. Los handlers de `useSocket` y cámaras se liberan simétricamente.
- Timeout de teleport cancelado al salir o reemplazar un cambio de mapa; jugador marcado offline también en el estado sincronizado.
- **Nueva regresión de pared fallaba:** Cannon emite `preStep` después de resolver contactos y nuestro controlador sobrescribía la velocidad resuelta. Los controles ahora se aplican antes de cada `world.step(dt)` mediante un acumulador acotado. Pasan pared sólida corriendo y caída de 50 m a 30/60/144 FPS, además de vehículos, culling y timing anteriores.

### Qué falta para cerrar sin reservas

1. **Fase 0 / 2 — navegador:** lobby, creador y HUD de partida accesibles en la copia limpia, pero inspecciones de render agotan el tiempo del navegador integrado. No se ha aislado el origen ni completado un recorrido visual repetido con métricas heap/GPU. No atribuirlo a Cannon sin evidencia. Tampoco hay benchmark de conducción en el mapa completo.
2. **Fase 1 — autoridad restante:** el presupuesto de movimiento es un límite amplio compartido con vehículos (50 m/s horizontal), no simulación de colisiones servidor ni prueba de velocidad a pie. Persistencia al salir/moverse no constituye transacciones durables contra caídas entre dos cuentas; transferencias multiusuario no son atómicas en SQL. Revisar los demás recursos de gameplay antes de afirmar seguridad global.
3. **Fase 2 — cobertura restante:** contactos sobre rampas/terreno real, conducción visual, pérdida de foco y perfil prolongado de memoria/coste. Las paredes y caídas automatizadas cubren casos concretos, no toda la geometría.

No hay commit, push, despliegue ni cambios en la base de datos original.

## Entorno local aislado

Autorizado por el usuario. No usa `.env.local` ni la base de datos existente en 3307.

```bash
docker compose -p nexus-phase-validation -f compose.validation.yml up -d --wait
NEXUS_RUN_ISOLATED_DB_TESTS=1 npm run test:integration
docker compose -p nexus-phase-validation -f compose.validation.yml down
```

MariaDB 11.4 escucha solo en `127.0.0.1:13307`. La base `nexus_validation` y sus credenciales son exclusivas para pruebas. Los datos viven en tmpfs: parar el contenedor los descarta. No montar datos reales. El test exige un opt-in y fija el destino local; no carga dotenv ni toma la URL de producción.

## Evidencias obtenidas

### Fase 0

- Copia aislada de archivos versionados y cambios no ignorados en `/tmp/nexus-phase0-zuUbex`, sin `.env.local`, `.git` ni `node_modules` originales.
- Instalación inicial con scripts desactivados y segunda instalación normal `npm ci --no-audit --no-fund`: ambas correctas (793 paquetes). Persisten advertencias peer de Auth/Nodemailer y Leva/React.
- En esa copia: `check:phase1`, las 37 pruebas existentes al copiar, comprobación de assets y build de producción correctos.
- Cuatro modelos boot presentes. Tres GLB de construcción opcionales ausentes con fallbacks; no se certifica que todo el contenido de ciudad esté redistribuido.
- CI ampliado con assets, build e integración MariaDB aislada. No ejecutado aún en GitHub; las ejecuciones descritas son locales.
- Pendiente: corregir deuda global de lint y completar regresiones de los restantes casos A05/A08. El build no valida lint global porque el proyecto lo omite explícitamente.

### Fase 1

- Pickup del mundo: regresión real reproducía entrega remota. Ahora exige payload válido, mismo mapa y distancia 3D máxima de 3 m (radio cliente 1.2 m más margen). Recogida válida no se repite. Esta defensa depende de la pose aceptada, no prueba autoridad de movimiento.
- Movimiento: payloads nulos, incompletos, coordenadas no finitas o mayores de 1e6 y flags de tipo incorrecto se rechazan antes de mutar/guardar. Se copian vectores y no se retransmiten campos arbitrarios. Falta validación de velocidad/portales/colisiones y política autoritativa completa.
- Las seis migraciones se aplicaron en MariaDB desechable; repetirlas no aplica nada nuevo.
- Cuenta real en el adaptador: guardar/cargar perfil, renombrado conservando identidad y separación por cuenta/mundo comprobados contra SQL.
- Carrera de magic links reproducida: 15 de 16 consumidores paralelos aceptaban el mismo token. Reparada comprobando que el DELETE atómico afecte una fila; solo ese consumidor obtiene el token.
- Auth.js real: CSRF → solicitud de enlace → callback → cookie de sesión → ID estable → ticket firmado. Transporte email sustituido solo en el test por captura en memoria; no se simulan adaptador SQL ni callbacks de sesión. WebSocket con guardado y reconexión validado el 22 de septiembre (ver seguimiento). Esto no equivale a OAuth Discord ni a validación visual en navegador.
- Pendiente: matchmaking por mundo, movimiento/mapas autoritativos, demás comandos de gameplay, persistencia económica unificada y escritura concurrente.

### Fase 2

- Los intervalos de limpieza de sala, la salida diferida y los respawns de ítems ahora usan el reloj de Colyseus. `onDispose` cancela los temporizadores del reloj. Regresión reprodujo el intervalo global no gestionado y verifica cancelación e idempotencia.
- Las evidencias anteriores de Cannon, vehículos, máscaras y culling se conservan en `2026-09-21-physics-stability.md`.
- Pendiente: localizar timeout del segundo montaje, conducción visual en mapa real, contactos extremos y perfil de memoria/GPU. No se afirma ausencia de fugas por haber limpiado intervalos.

Las tres fases siguen abiertas mientras existan estos pendientes. No hay despliegue, push ni modificación de la base de datos original.

## Seguimiento 2026-09-22

- Cerrado el recorrido real de red: Auth.js email con transporte capturado en memoria → cuenta SQL → ticket → conexión WebSocket Colyseus en loopback y puerto efímero → movimiento → salida y guardado SQL → nueva conexión con la misma cuenta → snapshot que restaura la posición. No depende del navegador ni llama a servicios externos.
- El harness carga la misma entrada CommonJS de Colyseus que usa la sala bajo tsx. Mezclar instancias ESM/CJS causaba una comparación de prototipos incorrecta en onAuth; se corrigió en el test, sin relajar autenticación de producción.
- La integración pasaba las aserciones pero dejaba el proceso vivo. Reproducido en TimeEvents: dispose antes del siguiente minuto no cancelaba el timeout inicial, que luego creaba un intervalo huérfano. Ahora se cancela también ese timeout. Dos regresiones cubren destrucción antes y después de comenzar los broadcasts e idempotencia.
- Tras reparar TimeEvents, la integración finaliza por sí sola (exit 0, aproximadamente 2.4 s en esta ejecución). Se terminaron los dos procesos de prueba antiguos que habían quedado vivos. CI limita esta prueba a 60 s para que otro handle huérfano no quede esperando todo el job.
- Resultado actual: 43 pruebas locales y una integración extensa con SQL/red pasan. Sigue pendiente cerrar lint global, autoridad de movimiento/mapas y el montaje repetido 3D con medición de memoria. La integración de red no demuestra estabilidad del segundo montaje de React/WebGL.
- Continuación: tres regresiones adicionales reprodujeron broadcasts de respawn de árboles/rocas y sincronización RPG después de destruir la sala. Sus timeouts ahora pertenecen al reloj de Colyseus. Dos casos positivos comprueban además que los respawns sí ocurren en una sala viva; cinco pruebas nuevas en total.
- Verificación tras esos cambios: 48/48 pruebas locales, integración SQL/Auth.js/WebSocket con salida natural del proceso, TypeScript y lint de los módulos/pruebas modificados correctos. El lint global sigue sin estar cerrado.
- Hallazgo pendiente en tala/minería: `clientPlayerPos` puede sustituir la posición del servidor incluso con discrepancias grandes. Todavía no se ha reparado ni probado como explotación; requiere regresión específica y validación de alcance independiente del cliente. No considerar seguros todos los comandos de recolección por haber endurecido `items:collect`.
