# Fase 3: grupos y transformaciones coherentes

## Decisión aprobada

El usuario eligió grupos con escala uniforme y colisiones coherentes. Alternativas: permitir matrices arbitrarias exigiría representar cizallamiento en los colliders; mantener solo entidades raíz impediría agrupar construcciones. Se implementa el subconjunto TRS exacto con grupos uniformes y hojas con escala por eje.

## Contrato

- `nexus:group`, sin props ni otros componentes en la misma entidad. No tiene malla visible en juego ni cuerpo físico; el editor muestra un marcador wireframe seleccionable.
- Padres exclusivamente grupos; hijos soportados: grupos, cajas y modelos. Los recursos, triggers y componentes personalizados deben permanecer en raíz hasta que sus ejecutores soporten coordenadas locales. Las jerarquías genéricas anteriormente aceptadas pero interpretadas incorrectamente se rechazan explícitamente; no se migran documentos persistidos de forma silenciosa.
- Posición, quaternion y escala serializados son locales. Resolución compartida e iterativa, independiente del orden del array, sin dependencia Three/Cannon en el paquete de schema. Render y físicas reciben la misma pose mundial. Los grupos no filtran mapas; cada caja/modelo conserva su mapId.
- Escala de grupo uniforme positiva. Límites locales y mundiales: posición ±1e6, escala 0.01–1000, dimensiones/offset de colliders hasta 1000. Profundidad máxima 64 contando la raíz. Ciclos, padres inexistentes, duplicados y transformaciones acumuladas fuera de rango se rechazan antes de guardar/aplicar.
- Cambiar de padre conserva la pose mundial y la de los descendientes; si la conversión excede límites locales, se rechaza sin modificar el borrador. Los campos del inspector son locales al padre.

## Editor e historial

Crear grupo, elegir padre o raíz, editar posición/rotación/escala uniforme, duplicar subárbol con IDs nuevos y borrar subárbol con confirmación que muestra el número de entidades. Duplicar conserva la pose exacta (la copia se solapa hasta moverla). Cada operación es una entrada del historial existente, incluido recuperar selección y descendientes al deshacer. Guardar/publicar siguen siendo acciones explícitas.

El diseño mantiene el panel oscuro existente, usa selectores etiquetados y errores visibles. Las guías React motivan un índice de hijos y poses mundiales memoizadas al cambiar entidades, sin recomputación de jerarquía en cada frame. No se añaden dependencias, gizmos, drag-and-drop ni edición colaborativa.

## Verificación y límites

Pruebas contra multiplicación independiente de matrices Three, reparentado con rotación/escala, duplicado/borrado/undo, límites/ciclos/profundidad, collider de modelo con offset transformado y pared bajo grupo rotado a 30/144 FPS. El test React comprueba que render y cuerpo se desplazan juntos al reemplazar la escena y se limpian al salir/cambiar mapa. La integración WebSocket/reinicio conserva jerarquías y modelos subidos.

Fixture `content/scenes/groups.v0_1.json` para la revisión visual aplazada. No se ha certificado rendimiento GPU, interacción visual ni stress multijugador. Las colisiones siguen siendo cliente. El resto de componentes y acceso público a nuevos mundos siguen pendientes de fase 3; fases 4–6 no se cierran aquí.
