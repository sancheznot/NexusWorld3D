# Assets de escena redistribuibles

`demo-doorway.gltf` es un modelo original mínimo de NexusWorld3D, distribuido bajo la licencia MIT del repositorio. No contiene recursos de terceros: tres instancias de un cubo forman dos pilares y un dintel, con material plano y geometría embebida.

El hueco central mide 4 × 4 unidades. Sus tres colliders predeterminados están declarados en `content/manifest.json`; `content/scenes/models.v0_1.json` permite probar el recorrido completo.

Para registrar otro modelo:

1. Coloca un `.glb` o `.gltf` y sus dependencias en `public/scene-assets/`. Usa nombres alfanuméricos, guiones o guiones bajos.
2. Añade un registro a `modelAssets` del manifiesto: `id`, `name`, `url` y, opcionalmente, `colliders` con `size` y `offset` locales. Sin colliders, el modelo será atravesable.
3. Ejecuta `npm run check:phase1`, reconstruye y despliega cliente y servidor con el mismo manifiesto. El selector del editor mostrará el registro.

Solo archivos del mismo origen bajo `/scene-assets/`; no URLs arbitrarias ni subidas temporales S3. Se soporta carga estática glTF/GLB estándar; este flujo no configura decodificadores Draco/KTX2 ni reproducción de animaciones. Los modelos se cargan por instancia, sin caché GPU compartida ni instancing: la optimización masiva pertenece a una fase posterior.

Las cajas de colisión son estáticas, alineadas con los ejes locales y siguen rotación/escala de la entidad raíz. No son colliders de malla exacta, cuerpos dinámicos ni detección autoritativa en servidor.
