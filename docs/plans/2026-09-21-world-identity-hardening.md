# Segunda reparación: identidad de cuentas en el mundo

## Implementado

- Next.js emite tickets de conexión firmados con HMAC SHA-256 desde la sesión Auth.js. Los datos de cuenta y nombre visible proceden del servidor, no del cuerpo del cliente.
- El ticket dura 60 segundos y está vinculado al tipo de sala. Se comprueban firma, propósito, campos y fechas. Un ticket presente pero inválido se rechaza; no se convierte en invitado silenciosamente.
- El cliente solicita un ticket nuevo al conectar a una sala de mundo. El lobby conserva por ahora su flujo anterior.
- `NexusWorldRoom.onAuth` establece una identidad inmutable. `player:join` ya no puede cambiar nombre ni mundo.
- Los invitados reciben UUID y nombre generados por servidor. Pueden jugar sin base de datos ni configuración de login, pero no cargan ni guardan perfiles persistentes de cuentas.
- Perfiles, snapshots Redis, inventarios y propiedad de viviendas usan una clave derivada de cuenta y mundo. El nombre visible ya no determina propiedad. La identidad completa y el ticket no se añaden a los broadcasts de jugadores.
- Se rechaza una segunda sesión de la misma cuenta/mundo dentro del mismo proceso. El bloqueo se libera al salir o destruir la sala; el rechazo de una segunda sesión no libera el bloqueo de la primera.
- Se añade la migración `005_player_identity_profile.sql`, que crea una tabla nueva sin alterar ni copiar los perfiles antiguos.
- Protocolo actualizado a 3: cliente y servidor deben desplegarse juntos.

## Configuración y datos existentes

Next.js y Colyseus deben compartir `NEXUS_GAME_AUTH_SECRET` (mínimo 32 caracteres) o el mismo `AUTH_SECRET`/`NEXTAUTH_SECRET`. Nunca usar prefijo `NEXT_PUBLIC_` para el secreto. La autenticación web sigue necesitando su configuración habitual. Configurar `AUTH_URL` o `NEXT_PUBLIC_APP_URL` con el origen público correcto cuando exista proxy.

La migración está preparada, **no ejecutada durante este trabajo**. El mecanismo de migraciones del proyecto la aplicará en el arranque configurado o mediante `npm run db:migrate`.

Los perfiles de la tabla antigua `player_profile` no tienen una asociación verificable con cuentas. Se preservan y no se reclaman automáticamente por coincidencia de nombre. En el flujo nuevo, las cuentas empiezan con un perfil nuevo hasta que se haga una migración de propiedad revisada. El progreso de invitados es temporal. No se han borrado ni transformado datos existentes.

## Verificación local

- 23 pruebas pasan: las 12 previas de economía/inventario y 11 de identidad, tickets, límites de sesión y conexión de invitados.
- Las pruebas incluyen firma alterada, caducidad, sala incorrecta, separación por cuenta/mundo, persistencia estable tras renombrar y bloqueo del mensaje legacy que cambiaba identidad.
- Se prueba el `onJoin` completo de invitado con dependencias simuladas: no toca los métodos de persistencia de cuentas.
- TypeScript y validaciones del proyecto se ejecutan con `npm run check:phase1`; lint dirigido a los archivos nuevos y de identidad; `git diff --check`.

## Pendiente de integración y alcance

No se ha validado un login OAuth real en navegador ni aplicado la migración contra MariaDB. No hay despliegue ni push. Antes de producción corresponde comprobar login → ticket → conexión → guardado → reconexión con cuenta real y la migración en una base de pruebas.

El bloqueo de sesiones es local al proceso; múltiples servidores necesitan un lock/lease compartido. El ticket es bearer durante su vigencia, no una prueba de dispositivo ni un token de un solo uso. El lobby de chat continúa fuera de esta reparación. El aislamiento de salas por mundo, la autoridad de movimiento y los fallos de física siguen pendientes de la auditoría.
