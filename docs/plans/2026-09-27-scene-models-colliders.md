# Fase 3 — modelos registrados y colliders compuestos

## Alcance autorizado

Implementar elegir un asset, colocarlo, configurar colliders, guardar/publicar y ejecutar en editor/Play/juego. La revisión visual está aplazada por el usuario; no se necesitan assets privados para avanzar.

## Diseño

- Catálogo `modelAssets` en el manifiesto compartido, resolución por ID estable y archivos locales públicos controlados. Evita persistir URLs temporales o aceptar direcciones arbitrarias desde mensajes. Este incremento no conecta las subidas S3 del editor legacy; registrar nuevos archivos todavía requiere modificar el manifiesto y desplegarlo en ambos procesos.
- Componente `nexus:model` raíz con assetId, mapa y hasta 32 cajas de colisión locales editables. Se eligen cajas compuestas frente a una caja envolvente (bloquearía puertas) o una malla exacta (más coste/complejidad). No admite jerarquías físicas ni rotación independiente de cada caja; la entidad completa sí rota y escala.
- Validación compartida de transformaciones y dimensiones efectivas; servidor rechaza IDs no declarados. CLI valida archivos declarados y semántica de escenas. Publicación conserva los colliders del documento, no los recalcula al cargar el modelo.
- Un componente visual compartido en editor, Play y runtime carga cada modelo independientemente. Permite liberar materiales, geometrías, texturas, skeletons e ImageBitmaps sin invalidar otras instancias ni cachés globales. Una carga que termina después de desmontar se libera sin actualizar React. Hay indicador de carga/error; los colliders declarados permanecen aun si falla el visual. No se promete abortar transferencias ya iniciadas ni ausencia de fugas del propio loader ante archivos corruptos.
- Inspector conserva diseño industrial existente: asset, lista de cajas, tamaño/desplazamiento, añadir/quitar, contornos cian al seleccionar; transformaciones, duplicación/borrado y undo/redo comunes. Modelos estáticos: sin reproducción de animaciones, Draco/KTX2, importación libre, instancing ni caché GPU compartida.

## Evidencia

- Fixture original MIT: puerta glTF con tres meshes y tres colliders; sin assets privados ni servicios externos.
- Parser GLTFLoader real verifica que centros y dimensiones de los tres meshes coinciden con sus colliders.
- Simulación a 30/144 FPS permite atravesar el hueco y bloquea los pilares; rotación/escala/desplazamiento y 20 ciclos de instalación/limpieza comprobados.
- Rechazo de paths inseguros, IDs ajenos, componentes incompatibles y dimensiones fuera de rango; liberación deduplicada y carga tardía tras desmontaje.
- Borrador/publicación/restauración y WebSockets/reinicio incluyen modelos con colliders. No equivale a revisar su render en dos navegadores.
- Cierre del bloque: **96/96 pruebas**, **2/2 integraciones**, `check:phase1`/TypeScript y build de producción en copia aislada correctos. Lint global: **0 errores / 82 advertencias** existentes; `git diff --check` correcto. El auxiliar Node de ProgressEvent implementa los campos requeridos; no se omite la comprobación de tipos para ejecutar el test GLTFLoader.

## Pendientes

Importación/registro totalmente desde web, jerarquías completas, otros tipos de collider, animaciones y decodificadores, y carga/optimización a escala. Esta implementación completa el recorrido de modelos **registrados y estáticos** con cajas compuestas; no cierra por sí sola la fase 3 ni certifica seguridad física del servidor.
