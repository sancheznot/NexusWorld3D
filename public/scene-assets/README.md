# Assets de escena redistribuibles

`demo-doorway.gltf` es un modelo original mínimo de NexusWorld3D, distribuido bajo la licencia MIT del repositorio. No contiene recursos de terceros: tres instancias de un cubo forman dos pilares y un dintel, con material plano y geometría embebida.

El hueco central mide 4 × 4 unidades. Sus tres colliders predeterminados están declarados en `content/manifest.json`; `content/scenes/models.v0_1.json` permite probar el recorrido completo.

## Subir desde el administrador

En el editor de escenas, usa el selector de archivos GLB. La subida requiere sesión de administrador y registra el modelo en el catálogo sin modificar el manifiesto ni reconstruir la aplicación. Después selecciona **Añadir modelo** y configura sus cajas de colisión: inicialmente es decorativo y atravesable.

Se aceptan GLB 2.0 estáticos autocontenidos de hasta 16 MiB, con texturas PNG/JPEG embebidas. No se admiten archivos externos, extensiones, animaciones, skins ni morph targets. Los archivos subidos son **públicos por URL**, aunque la escena no esté publicada. El servidor de juego conserva los archivos en `NEXUS_SCENE_PERSIST_DIR/model-assets-v1` (por defecto `content/scenes/persisted/model-assets-v1`); este directorio necesita almacenamiento persistente y copias de seguridad. No hay borrado ni cuota total de almacenamiento en este bloque.

## Registrar un modelo incluido en el repositorio

Para registrar otro modelo manualmente:

1. Coloca un `.glb` o `.gltf` y sus dependencias en `public/scene-assets/`. Usa nombres alfanuméricos, guiones o guiones bajos.
2. Añade un registro a `modelAssets` del manifiesto: `id`, `name`, `url` y, opcionalmente, `colliders` con `size` y `offset` locales. Sin colliders, el modelo será atravesable.
3. Ejecuta `npm run check:phase1`, reconstruye y despliega cliente y servidor con el mismo manifiesto. El selector del editor mostrará el registro.

El registro manual usa archivos del mismo origen bajo `/scene-assets/`; las subidas usan URLs inmutables bajo `/api/public/scene-models/`. No se aceptan URLs arbitrarias ni subidas temporales S3. Se soporta carga estática glTF/GLB; estos flujos no configuran decodificadores Draco/KTX2 ni reproducción de animaciones. Los modelos se cargan por instancia, sin caché GPU compartida ni instancing: la optimización masiva pertenece a una fase posterior.

Las cajas de colisión son estáticas, alineadas con los ejes locales y siguen rotación/escala de la entidad raíz. No son colliders de malla exacta, cuerpos dinámicos ni detección autoritativa en servidor.
