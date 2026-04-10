# Assets in the public framework repo / Assets en el repo público del framework

**EN.** This repository is intended to ship as an **open-source framework**. Binary assets (GLB, textures, audio) carry **license risk** if their origin or terms are unclear.

**ES.** Este repositorio está pensado como **framework open-source**. Los assets binarios (GLB, texturas, audio) implican **riesgo legal** si no se conoce su origen o licencia.

---

## Allowed / Permitido

**EN.**

- **Your own work** you have full rights to distribute under the repo license (MIT).
- **Explicitly licensed permissive content** (e.g. **CC0**, **CC-BY** with attribution documented next to the asset or in a `README` in the same folder).
- **Procedural or tiny placeholders** (solid colors, simple primitives) used only to run demos and tests.

**ES.**

- **Obra propia** que puedas distribuir bajo la licencia del repo (MIT).
- Contenido con **licencia permisiva clara** (p. ej. **CC0**, **CC-BY** con atribución documentada junto al archivo o en `README` en la carpeta).
- **Placeholders** mínimos o procedimentales para demos y tests.

---

## Not allowed without clearance / No permitido sin aclarar

**EN.**

- Commercial packs, “free” marketplace downloads, or ripped game assets **without** a license file and provenance.
- Brand-specific art for a **private commercial game** in the **public** tree (keep those in a private fork or CDN).

**ES.**

- Packs comerciales, descargas dudosas de marketplaces o assets “extraídos” **sin** archivo de licencia y trazabilidad.
- Arte de marca de un **juego comercial privado** en el árbol **público** (mantenerlo en fork privado o CDN).

---

## Practical checklist / Checklist práctico

**EN.** Before adding a file under `public/` (especially `public/models/`):

1. Can you **name the source** (URL, author, license)?
2. Is the license **compatible** with MIT distribution?
3. If required, did you add **attribution** (file header, `README`, or `NOTICE`)?

**ES.** Antes de añadir algo en `public/` (sobre todo `public/models/`):

1. ¿Puedes **citar la fuente** (URL, autor, licencia)?
2. ¿La licencia es **compatible** con distribución MIT?
3. Si aplica, ¿añadiste **atribución**?

---

## Related / Ver también

- `docs/ADDING_CONTENT.md` §5 — convención `pieceId` ↔ GLB.
- `npm run validate-build-assets` — comprobar que existan GLBs referenciados (no valida licencia).
