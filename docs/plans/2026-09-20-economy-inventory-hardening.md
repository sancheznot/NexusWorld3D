# Primera reparación: economía e inventario autoritativos

Implementa la primera parte de la auditoría `REPO_AUDIT_2026-09-20.md`.

## Decisión

Los clientes solicitan operaciones; el servidor determina cantidades concedidas, precios y snapshots. Rechazar explícitamente los mensajes legacy que adjudican estado evita mantener dos vías de escritura. Los trabajos, tiendas, drops y recursos siguen utilizando las APIs internas existentes.

No basta con validar que un objeto exista en el catálogo: eso no demuestra que el jugador lo haya ganado. Tampoco sirve limitar el importe de un mensaje público de pago: seguiría permitiendo pagos repetidos sin trabajo.

## Cambios

- `inventory:update`, `inventory:add-item`, `inventory:update-gold`, `economy:job-pay` y `economy:purchase` responden con error sin mutar estado.
- Se eliminan las implementaciones privadas de sustitución/creación de inventario y oro que ya no deben invocarse desde red.
- Retirar objetos exige cantidad entera positiva y disponible; se rechazan payloads vacíos e identificadores inválidos.
- Depósitos, retiradas y transferencias rechazan importes no finitos, negativos, cero, no numéricos o fuera de los límites. Una transferencia requiere destinatario conectado porque la economía actual identifica saldos por sesión.
- Recompensas y cobros internos usan importes exactos, sin aplicar el mínimo/máximo de transferencias bancarias. Un coste cero es válido; un crédito cero no crea dinero; importes inválidos no modifican el saldo.
- Conversión a unidades menores corregida: `1.23 -> 123`. Los payloads de saldo siempre son unidades mayores. El cliente ya no adivina unidades según el tamaño del saldo ni redondea a enteros.
- Protocolo aumentado a 2 para exigir despliegue coordinado de cliente y servidor. Los nombres legacy se conservan para rechazo explícito, no para autorizar escrituras.
- `npm test` ejecuta pruebas locales con `node:test` a través de `tsx`, sin servicios externos; CI las ejecuta después de `check:phase1`.

## Verificación

Las primeras diez pruebas se ejecutaron antes de las reparaciones: nueve fallaban. La suite final tiene doce pruebas y todas pasan, incluidos precios fuera de los límites bancarios y transferencias a otro cliente simulado. `npm run check:phase1` y `git diff --check` pasan. El lint de los archivos nuevos y de economía modificados pasa; el módulo de inventario conserva sus dieciocho errores preexistentes de `no-explicit-any`, sin añadir nuevos.

## Datos y límites pendientes

No se han migrado saldos persistidos ni modificado bases de datos. Wallet/banco son Maps de la sesión; su escala corregida se aplica al nuevo runtime. El oro persistido dentro del inventario es una representación separada: no debe dividirse automáticamente sin revisar su procedencia.

Este bloque NO cierra toda la seguridad multijugador: quedan identidad autenticada del WebSocket, validación de progreso de trabajos y distancias de acciones, autoridad de movimiento, persistencia unificada y validación completa del resto de mensajes. Las físicas, editor y separación del framework siguen pendientes según la auditoría.
