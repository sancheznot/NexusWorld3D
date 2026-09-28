# Fase 3 — cierre de implementación del flujo editor → juego

## Criterio y alcance

El criterio del audit es un mundo creado desde cero, jugado por dos clientes y conservado tras reiniciar. Este bloque completa el código del flujo de autoría 3D mínimo: escenas canónicas, componentes soportados, assets/colliders, jerarquías, borradores/versiones, Play local y entrada pública multijugador. La revisión visual sigue **pendiente por decisión del usuario**; no se declara aceptación visual ni cierre de las otras fases.

## Decisiones de integración

Se reutiliza la sala de juego existente, filtrada por `worldId`, en vez de abrir otro servidor o usar el antiguo `WorldData` como segundo runtime. Publicar contenido y permitir entrada pública son acciones independientes. El catálogo se guarda en el proceso de juego, junto con la escena; Next utiliza el canal interno autenticado. Los mundos antiguos/default conservan su portal.

El conjunto público soporta `nexus:group`, `nexus:box`, `nexus:model`, `nexus:resourceNode`, `nexus:triggerSphere` y `nexus:portal`, más spawn. El código rechaza publicación/acceso público a escenas con componentes de plugins sin ejecutor, entidades vacías o mapas fuera del exterior. Esto no implementa un lenguaje de scripts ni el sistema de plugins empaquetado de fase 4.

## Qué se terminó

- Catálogo `/worlds`, enlace desde el lobby, selección/enlace directo por `worldId` y pantalla de entrada con errores recuperables. Mundo creado usa suelo neutro y escena propia, sin ciudad, portales ni capas de gameplay heredadas visibles.
- Panel de acceso admin: nombre, descripción, habilitar público y ocultar. Requiere una escena publicada válida. Los borradores y la publicación por sí solos no conceden acceso. Ocultar bloquea **nuevas entradas**, no expulsa conexiones existentes.
- Identidad: tickets de cuenta ligados al mundo elegido; invitados admitidos únicamente en mundos autorizados/default. El servidor vuelve a comprobar acceso aunque el cliente omita el endpoint de tickets. Un mundo público carga su publicación aunque el flag legacy de carga automática esté apagado. Corrupción o assets no registrados impiden admitir visitantes.
- Cliente de red distingue roomName **y** worldId al reutilizar conexiones/promesas. Las salas de mundos distintos no se mezclan. Perfil/inventario de cuenta conserva su aislamiento por identidad+mundo.
- Recursos: selector de nodos registrados, etiqueta, posición, radio y jerarquía. Un nodeId por escena, recompensas del registro de servidor (no cantidades arbitrarias del cliente). Solo recursos incluidos están disponibles en mundos de autoría. Alcance 3D y cooldown del servidor; las colisiones de movimiento siguen siendo cliente.
- Zonas: aviso etiquetado al pulsar E; portales: destino/rotación editables dentro del mismo mapa. Destino resuelto por servidor, con alcance y cooldown; sincronización de pose al usarlo. Los grupos afectan origen/radio, no el destino mundial. En solapamientos el cliente elige una interacción más cercana por pulsación.
- Un componente visual común interpreta cajas/modelos/interacciones para editor, Play y juego. El renderer ya no sustituye componentes no soportados por cubos en el juego. El editor conserva marcadores seleccionables.
- Play prueba portales, zonas y recursos con inventario efímero, sin modificar la cuenta ni abrir sockets. Stop libera física, listeners e inventario. Sigue siendo una prueba local, no un servidor multijugador embebido.
- Importación JSON canónica y conversión explícita de `WorldData` antiguo. Solo modelos con URL exacta registrada; si `hasCollision` no tiene colliders conocidos se rechaza en vez de inventarlos. Advierte que no convierte skybox, gravedad, iluminación, metadata ni lógica antigua. No sobrescribe el archivo de origen; importar es deshacible y no publica.

## Flujo manual para revisar después

1. En Escenas v0.1, crear mundo con ID propio de 1–64 caracteres alfanuméricos/guiones/guiones bajos (no el default).
2. Añadir cajas/modelos, grupos, recursos/zonas/portales y spawn. También se puede abrir `content/scenes/playable.v0_1.json` como ejemplo.
3. Probar con Play: WASD/flechas, salto, E y Stop. Inventario de prueba se descarta.
4. Guardar borrador, publicar versión y habilitar acceso público en el panel separado.
5. Abrir el enlace `/worlds?worldId=...` en dos navegadores. Cambios publicados afectan nuevas salas; Apply/merge en vivo son explícitos.
6. Reiniciar servidor con el mismo volumen y volver a entrar. Ocultar el mundo y verificar rechazo de nuevas entradas.

## Operación y compatibilidad

- Volumen persistente y backup de `NEXUS_SCENE_PERSIST_DIR` necesarios. Metadatos públicos: `by-world-id-v1/world-access/<worldId>.json`. No hay almacenamiento distribuido, fsync garantizado, cuotas totales ni eliminación automática.
- Para Next y servidor separados, configurar URL/secreto del monitor; para cuentas, secreto de tickets compartido. No se imprimen ni se incluyen en rutas públicas.
- Cada recurso requiere ahora un trigger explícito; no se permiten duplicados de nodeId. Escenas antiguas que dependían de combinaciones ambiguas se rechazan: no se migran archivos reales silenciosamente.
- Portal mínimo es intra-mapa y activado por E; zonas son avisos, no scripts arbitrarios. Los recursos son plantillas registradas, no un editor de economía.
- Física de objetos: cuerpos estáticos con cajas simples/compuestas; el jugador usa el sistema existente. Cuerpos dinámicos sincronizados, colliders de malla arbitraria, animaciones de assets y optimización masiva no se certifican en este MVP.
- Conversión legacy exige revisar los ajustes no migrados; no hay conversión universal de contenidos o URLs externas.

## Evidencia

Suite local: **117 pruebas**. Dos integraciones aisladas: SQL/Auth.js y proceso WebSocket real con dos clientes, publicación/reinicio, portal, recolección, separación entre mundos y ocultación. Pruebas HTTP incluyen sesión admin, Origin, catálogo público, ticket de invitado, carga con flag legacy apagado y rechazo de escena corrupta/no soportada. Pruebas React cubren controles de acceso, errores, enlace público e inspector; no sustituyen una revisión en navegador.

TypeScript/check:phase1 y build de producción pasan. Lint: cero errores y 82 advertencias previas. No se usó la base de datos original ni se hizo un despliegue. Una regresión WebSocket comprueba además que los mundos de autoría sin spawn explícito usan el mismo punto inicial que Play, conservando el fallback del mundo original.

Estado: **implementación del alcance MVP de fase 3 terminada; aceptación visual aplazada**. Fase 4 (paquetes/plugins), fase 5 (plantillas 2D/2.5D/3D) y fase 6 (rendimiento medido) siguen abiertas. Esto no convierte esas fases en terminadas ni certifica física autoritativa anticheat.
