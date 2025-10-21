## Physics colliders (UCX + Hills)

English

Naming and behavior
- UCX_* (or contains "collision"): Box colliders. Very fast. Extra-large shapes are automatically subdivided.
- Hill_*, HIL_*, Rock_*, Cliff_*, Slope_*: Precise terrain/rocks colliders.
  - Robust Trimesh: builds from mesh.matrixWorld (world vertices) and filters degenerate triangles.
  - Special case: Hill_03.001 uses Convex Hull for stability (no holes). Split into chunks for higher fidelity if needed.

Player contact
- Player body: vertical cylinder + small foot sphere. The sphere improves contact with Trimesh.

Tips (Blender)
- Apply transforms (Ctrl+A). Keep normals consistent. Prefer low/medium poly for colliders.
- For complex hills: split into several chunks (Hill_03.001_A/B/C) to get multiple convex hulls.

Spanish

Reglas de nombres y comportamiento
- UCX_* (o incluye "collision"): colliders de caja. Muy rápidos. Los demasiado grandes se subdividen automáticamente.
- Hill_*, HIL_*, Rock_*, Cliff_*, Slope_*: colisiones precisas para terreno/rocas.
  - Trimesh robusto: se construye con vértices en mundo (matrixWorld) y filtra triángulos degenerados.
  - Caso especial: Hill_03.001 usa Hull convexo para máxima estabilidad (sin huecos). Divide en varios trozos si quieres más fidelidad.

Contacto con el jugador
- El jugador es un cilindro + una esfera en el "pie" para mejorar el contacto con Trimesh.

Consejos (Blender)
- Aplica transformaciones (Ctrl+A). Normales coherentes. Usa malla de baja/media para colliders.
- Para colinas complejas: divide en varios sub-mesh (Hill_03.001_A/B/C) y obtendrás múltiples hulls.


