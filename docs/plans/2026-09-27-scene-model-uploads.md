# Registro web de modelos estáticos — 2026-09-27

## Alcance implementado

El administrador puede subir un GLB, seleccionarlo del catálogo y añadirlo a una escena sin editar Git ni reconstruir cliente/servidor. El catálogo combina los modelos del manifiesto con los subidos. Las instancias usan el mismo inspector, transformaciones, colliders, historial, borrador/publicación y loader de Play/runtime existentes. Una subida no añade automáticamente una entidad ni publica una escena; los modelos nuevos no tienen colliders hasta que el autor los configure.

## Persistencia y acceso

- Next exige sesión admin para listar/subir y rechaza un Origin presente de otro origen. El proceso de juego recibe la petición mediante el canal interno autenticado existente; no se necesita filesystem compartido con Next.
- Almacenamiento en `NEXUS_SCENE_PERSIST_DIR/model-assets-v1`, o `content/scenes/persisted/model-assets-v1` por defecto. Cada directorio contiene `model.glb` y `asset.json`; escritura temporal exclusiva y rename antes de registrar el modelo.
- Identificador `upload-<sha256>`: archivos idénticos se reutilizan, incluso con subidas concurrentes. La primera inscripción conserva su nombre. La descarga verifica el hash y usa una URL inmutable.
- Los binarios son públicos por URL, incluso antes de publicar la escena; no hay listado público del catálogo. La interfaz lo advierte. No subir material privado ni sin derechos de distribución.
- Se eligió almacenamiento duradero del servidor de juego, no URLs temporales del flujo S3 anterior. Requiere volumen persistente y backup junto con las escenas. No incluye réplica entre servidores, fsync ante corte eléctrico, borrado, recolección de huérfanos ni cuota total de disco. Monitorizar capacidad antes de abrirlo a muchos administradores.

## Formato limitado y protección de recursos

GLB 2.0 estático autocontenido, máximo 16 MiB. Lectura acotada también sin Content-Length. Validación de cabecera/chunks, buffer views/accessors, índices, geometría finita, árboles de nodos y presupuestos de complejidad. Texturas embebidas PNG/JPEG hasta 4096 por lado, con presupuesto agregado de píxeles.

Se rechazan referencias URI, extensiones (incluidos Draco/KTX2), animaciones, skins, morph targets y accesores sparse. No es un validador completo de la especificación glTF ni un decodificador de imágenes: un archivo con datos de imagen/material malformados todavía puede fallar al cargar; el visor muestra el error. No se ejecuta renderizado del archivo en el servidor. Las colisiones siguen siendo cajas estáticas configuradas por el autor, no mallas físicas automáticas ni anticheat autoritativo.

## Evidencia

- 101 pruebas unitarias: validación, límites, autenticación HTTP, almacenamiento/dedupe concurrente, descarga pública y catálogo/subida React.
- 2 integraciones aisladas: SQL/Auth.js y publicación WebSocket con dos clientes/reinicio completo. La escena de esta última referencia un modelo subido conservado en disco.
- TypeScript, check:phase1 y build de producción en copia aislada correctos. Revisión visual aplazada por el usuario; no se certifica visualmente la subida ni el render con modelos de terceros.

Este bloque cierra el registro web del subconjunto estático soportado, no toda la fase 3. Siguen pendientes jerarquías, ejecución de otros componentes y experiencia pública de acceso a nuevos mundos. Fases 4–6 permanecen abiertas.
