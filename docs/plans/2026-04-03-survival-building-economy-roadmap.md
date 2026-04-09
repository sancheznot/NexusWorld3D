# Survival, construcción y economía — roadmap por fases  
# Survival, building & economy — phased roadmap

**Versión:** 1.8  
**Fecha:** 2026-04-03 · **Actualizado:** 2026-04-03 (Fase 8 — puesto de productos jugador)  
**Estado:** plan de producto / guía de implementación incremental  

**Estrategia acordada / Agreed strategy:** priorizar **sistemas en código** (construcción, economía, validación servidor, convenciones de datos). El **layout de ciudad en Blender** y las **coords finales** de lotes, carteles y nodos de recursos llegan **después**: entonces se **ajustan constantes** (bounds, triggers) sin reescribir el core.

---

## 1. Resumen ejecutivo / Executive summary

**ES.** El juego apunta a una **combinación de fantasías** (ver §2): espíritu **ARK** (supervivencia, recolección, base propia), **Farmville** (granja, timers, rutina en tu lote) y **GTA** (ciudad, circulación, economía urbana). El jugador empieza con poco, gana materiales y dinero, **compra un lote**, construye y mejora, y a medio plazo **produce y vende**. Este documento ordena el trabajo en **fases jugables** con **checklists explícitas**; prioriza **autoridad del servidor** y **persistencia**. **No** lista cada subsistema al detalle: cada fase tiene criterios comprobables; lo demás se define al implementar.

**EN.** Same blend as §2. This doc uses **playable phases** with **explicit checkboxes**, **server authority**, and **persistence**. **Not** an exhaustive spec of every subsystem—each phase has testable criteria; details emerge during implementation.

---

## 2. North star: ARK × Farmville × GTA / Creative compass

**ES — Qué significa (no es copiar juegos).** Tres referencias para **hablar el mismo idioma** en diseño y priorización. No se replican marcas, mapas ni sistemas completos; se extraen **fantasías de jugador**.

| ADN | Qué aporta al proyecto | Qué **no** promete esta etiqueta |
|-----|-------------------------|----------------------------------|
| **ARK** | Mundo abierto, **recolectar → craftear → construir**, base que **persiste**, sensación de “estoy sobreviviendo y creciendo” | Domesticación masiva, bosses, biomas enormes el día 1 |
| **Farmville** | **Lote como hogar productivo**: cultivos/animales con **tiempo**, cosechas, vender, rutina satisfactoria sin exigir PvP constante | Social Facebook clásico, energía por microtransacción |
| **GTA** | **Ciudad viva**: moverse, trabajos, tiendas, **dinero** como eje; más tarde negocios y “vida urbana” | Narrativa criminal obligatoria, mapa real |

**EN — What this means (not cloning).** Three **player fantasies** for alignment. Not IPs or full feature parity.

| DNA | What it brings | What it does **not** promise on day one |
|-----|----------------|----------------------------------------|
| **ARK-like** | Open space, **gather → craft → build**, **persistent** base, survival growth | Mass taming, bosses, huge biomes |
| **Farmville-like** | **Plot as productive home**: crops/animals on **timers**, harvest, sell, cozy routine | Legacy social/energy models |
| **GTA-like** | **Living city**: mobility, jobs, shops, **money** as glue; later businesses | Mandatory crime story, real-world map |

**Cómo encaja con las fases / Phase mapping (alto nivel)**

| Fase | ARK | Farmville | GTA |
|------|-----|-----------|-----|
| 1–2 | Materiales, crafting, **base en lote**, **tiers** | Lote como **espacio tuyo** | Compra de lote, **atajos** con dinero |
| 3 | **Piezas colocables** (paredes, suelos…) | — | — |
| 4 | — | — | **Comprar / ver lote** desde el mundo (cartel + UI) |
| 5 | Lote **sucio → limpiar** → recursos | Hogar que **evoluciona** | — |
| 6 | **Canteras / aserraderos** (nodos de mapa) | — | Economía **bruto vs procesado** |
| 7 | — | **Cultivos y animales** | Venta |
| 8 | — | Negocio propio | **Locales**, competencia NPC |

---

## 3. Visión de jugabilidad / Gameplay vision

| Pilar | ES | EN |
|--------|----|----|
| Progresión | De casi nada a hogar estable en un lote propio | From almost nothing to a stable home on owned land |
| Construcción | Hoy: kit + cabaña + tiers; luego: **piezas modulares** y catálogo por convención de assets | Today: kit + cabin + tiers; later: **modular pieces** + asset naming convention |
| Economía | Dinero del juego para lotes, atajos, tienda | In-game money for plots, shortcuts, shops |
| Ciudad | Coexistir con NPCs / locales (fases tardías) | Coexist with NPCs / venues (later phases) |
| Negocios | Tu granja/negocio vende a sistema o jugadores (muy tarde) | Your farm/business sells to systems or players (late) |

---

## 4. Base técnica ya existente / Current foundations

- Inventario **autoritativo** en servidor (Colyseus), sincronizado con cliente.  
- Materiales iniciales (ej. troncos, tela) y **crafting mínimo** compartido (`src/constants/crafting.ts` + servidor).  
- Economía con wallet (`economy:wallet`) alineada con UI cuando se sincroniza bien.  
- Tienda básica (`ShopEvents`) y recogida de ítems en mundo.  
- Tala de árboles y feedback de ítems.  

**Implicación / Implication:** nuevas recetas, ítems y construcción deben **reutilizar** estos patrones (mensajes Colyseus, validación servidor, persistencia de perfil/mundo).

---

## 5. Principios de diseño / Design principles

1. **Servidor manda / Server is source of truth** — construir, cobrar, consumir inventario: todo validado en sala o servicio backend.  
2. **Persistir o no prometer / Persist or don’t promise** — lo colocado en el mundo debe guardarse (BD/Redis/estado de sala) o es solo prototipo local.  
3. **YAGNI** — una cabaña fea pero **jugable** vale más que cinco biomas sin sistema de parcela.  
4. **Ciudad después / City art later** — triggers, bounds y GLB de ciudad se **calibran** cuando exista el mesh; el código asume **datos configurables** (`constants`, JSON), no coords mágicas irreversibles.  
5. **Props por convención / Props by convention** — nuevos GLB de construcción deben poder añadirse **casi sin código**: carpeta acordada + `pieceId` alineado al nombre del archivo (ver Fase 3).  
6. **Recetas compartidas / Shared recipes** — mismo catálogo cliente+servidor (como crafting actual).  
7. **Fases cerradas / Closed phases** — cada fase debe poder jugarse y probarse sin depender de la siguiente.  

---

## 6. Fases / Phases

> **Leyenda / Legend:** `[x]` hecho · `[ ]` pendiente. Las fases **3–6** son el “gran salto” de construcción y mundo; el detalle de cada mecánica se acota en PRs, no en este doc.

---

### Fase 1 — Lote + primera estructura (kit cabaña)  
### Phase 1 — Plot + first structure (cabin kit)

**Objetivo / Goal**

- **ES:** Materiales / crafting / **compra de lote** / **colocación** validada en servidor y **persistente**.  
- **EN:** Materials, crafting, **plot purchase**, **placement** server-validated and **persistent**.

**Criterios de éxito / Success criteria**

- [x] Comprar (o asignar en dev) un lote y que **sobreviva** al reconectar.  
- [x] No poder construir **fuera** del lote (servidor rechaza).  
- [x] Crafting consume inventario y el resultado coherente con el servidor.  
- [x] Una estructura visible y **persistente** (perfil / `housing_json`).  

**Implementado (2026-04):** `housing_json`, `HousingEvents`, lote `exterior_lot_a1` (`src/constants/housingPlots.ts`), kit `placeable_cabin_kit`, NPC **Maestro de obras**, `HousingLayer`, pausa. Dev: `HOUSING_DEV=1`.

**Nota UX / UX note:** hoy la compra es sobre todo desde **pausa**; la compra **in-world** (cartel) es **Fase 4**.

---

### Fase 2 — Progresión de vivienda (madera → piedra, dinero)  
### Phase 2 — Housing progression (wood → stone, money)

**Objetivo / Goal**

- **ES:** **Tiers** en la misma plantilla; coste en materiales o **atajo** en créditos.  
- **EN:** **Tiers** on same template; materials or **credit** shortcut.

**Criterios de éxito**

- [x] Al menos **2 tiers** jugables (madera → piedra).  
- [x] Atajo de dinero **opcional** (no obligatorio).  

**Implementado (2026-04):** `housingTiers.ts`, `housing:upgrade`, `tier`/`hp`, UI pausa, sync y persistencia vía mismas estructuras en `housing_json`.

---

### Fase 3 — Construcción modular + convención rápida de props (GLB)  
### Phase 3 — Modular building + fast prop pipeline (GLB)

**Objetivo / Goal**

- **ES:** Poder colocar **varias piezas** (paredes, suelos, etc.) **dentro del lote**, con **servidor** como fuente de verdad y datos persistidos. **Sin** depender de Blender para iterar: añadir `wall_wood.glb`, `floor_stone.glb`, etc. en una **carpeta acordada** y que el cliente resuelva **modelo = `pieceId`** (mismo nombre base que el archivo).  
- **EN:** **Multiple placeables** inside the plot, **server-authoritative**, persisted. **Drop-in GLBs**: e.g. `public/models/build/wall_wood.glb` ↔ `pieceId: "wall_wood"` so art can ship **without** code changes per asset (optional small manifest for snap/size/collider if needed later).

**Alcance MVP (a definir en implementación) / MVP scope**

- Catálogo mínimo de **tipos** de pieza (muro, suelo, …) + reglas simples (grid o libre acotado).  
- Mensajes Colyseus + validación (dueño, bounds del lote, colisiones básicas si aplica).  
- Renderer: **resolver URL** por convención (`pieceId` → ruta fija + `.glb`).  
- Migración / evolución de `housing_json` o tabla dedicada cuando el volumen de piezas lo exija.

**Criterios de éxito**

- [x] Colocar **≥2 tipos** de pieza distintos en el mismo lote y verlos tras **reconectar**.  
- [x] Servidor **rechaza** piezas fuera de bounds / sin permiso.  
- [x] Añadir un GLB nuevo **solo** con nombre alineado a `pieceId` (y entrada mínima en catálogo si hace falta categoría/coste) **sin** reescribir el pipeline entero.  

**Implementado — paso 1–5 (2026-04):** `pieces[]`, `buildPieces.ts`, `housing:placePiece` / `removePiece`, `BuildPiecesLayer`, `public/models/build/`, pausa. **Snap** + **colisión OBB XZ** (`buildObbOverlapXZThreeJs`, alineada a `makeRotationY` de Three.js) pieza–pieza y pieza–cabaña con `rotY`. **Vista previa** + **E** + **directo**; **preview se limpia** al cambiar `currentMap`. **Pieza nueva:** `wall_stone` (2× piedra). **Pendiente:** más props, tuning de footprint vs GLB real.

---

### Fase 4 — Lote en el mundo (cartel / modal)  
### Phase 4 — In-world plot flow (sign + modal)

**Objetivo / Goal**

- **ES:** Comprar o **inspeccionar** lote desde el mapa (proximidad a cartel / trigger), **modal** con precio e info; coords del trigger se **configuran** cuando exista la ciudad en Blender.  
- **EN:** **Buy or preview** plot from world interaction; **modal** with price; trigger positions are **data-driven** for when city art lands.

**Criterios de éxito**

- [x] Trigger configurable (posición + `plotId`) → abre UI.  
- [x] Comprar / error de saldo sin pasar obligatoriamente por pausa.  
- [x] (Opcional) Resaltar bounds del lote en cliente para orientación.  

**Implementado (2026-04):** `src/constants/housingPlotTriggers.ts` + `HousingPlotTriggerLayer` (`TriggerZone` con **captura** de tecla E para no chocar con construcción/recogida), `HousingPlotModal` (precio, saldo, compra `purchaseHousingPlot`, estados ya tienes lote / otro lote), `HousingPlotBoundsLayer` (línea verde en suelo del lote poseído). Trigger placeholder A1 en `(45.5, 0.6, -11)`.

---

### Fase 5 — Lote “sucio” y limpieza  
### Phase 5 — “Dirty” plot and clearing

**Objetivo / Goal**

- **ES:** Estado inicial del lote con **obstáculos/recursos** (piedras, árboles, chatarra…); limpiar da **materiales** y actualiza estado persistido.  
- **EN:** Initial plot **clutter**; clearing yields **materials** and persists new state.

**Criterios de éxito**

- [x] Estado de lote distinto **antes/después** de limpiar, persistido.  
- [x] Al menos **una** interacción de limpieza integrada con inventario/economía existentes.  

**Implementado (2026-04):** `src/constants/housingPlotDebris.ts` (plantilla por `plotId`, IDs estables), `clearedDebrisIds` en guardado vivienda + `clearedPlotDebrisIds` en `housing:sync` (unión en mapa para multijugador), mensaje `housing:clearDebris` (`nearest` / `debrisId`), `PlotDebrisLayer`, pausa → “Limpiar escombro cercano”, `housingClient.clearNearestPlotDebris`.

---

### Fase 6 — Nodos de recurso en mapa (cantera, aserradero, …)  
### Phase 6 — World resource nodes (quarry, sawmill, …)

**Objetivo / Goal**

- **ES:** Zonas o puntos en el mapa donde obtener **bruto** (piedra, troncos…) o comprar **procesado**; refuerza el loop “farmear vs comprar con dinero ganado”.  
- **EN:** Map nodes for **raw** vs **processed** materials; supports **earn then buy** loops.

**Criterios de éxito**

- [x] Al menos **un** nodo de recolección y **un** punto de venta/compra relacionado con construcción.  
- [x] Posiciones **configurables** (constantes / datos) para cuando el layout final exista.  

**Implementado (2026-04):** `src/constants/worldResourceNodes.ts` (cantera piedra + montón madera en `exterior`), `world:harvest-node` / `world:harvest-node-result` en `server/modules/WorldResourceNodeEvents.ts`, `WorldResourceNodesLayer` + `worldResourceClient.harvestWorldResourceNode`, toasts en `ItemGainHud` y avisos de error en `WorldResourceHarvestFeedback`. **Compra construcción:** `builders_yard` + NPC `npc_builder` (ya existentes); se añadió **troncos** al corralón para el loop “recolectar vs comprar”.

---

### Fase 7 — Granja y animales  
### Phase 7 — Farm and livestock

**Objetivo / Goal**

- **ES:** Cultivos con tiempo **y/o** animales productivos; vender o craftear.  
- **EN:** Timed crops and/or productive animals.

**Criterios de éxito**

- [x] Loop **producir → vender o usar** sin exploits obvios.  
- [x] Persistencia tras logout.  

**Implementado (2026-04):** `farmSlots` en `housing_json` + `housing:sync`; `src/constants/farmPlots.ts` (3 bancales en `exterior_lot_a1`, cultivo `crop_lettuce`, 90s servidor); `farm:interact` en `HousingEvents`; ítems `seed_lettuce`, `food_lettuce`, `food_salad`; semillas en tienda general; receta **Ensalada** (`salad_from_lettuce`); `FarmPlotsLayer` + `FarmFeedback` + toasts en `ItemGainHud` al cosechar; XP `RPG_XP_FARM_HARVEST`. **Animales** quedan para iteración posterior.

---

### Fase 8 — Ciudad y negocios  
### Phase 8 — City depth and businesses

**Objetivo / Goal**

- **ES:** Negocio propio (stock, precios), competencia con NPCs, alquiler/impuestos suaves.  
- **EN:** Player venues, NPC competition, light rent/tax.

**Criterios de éxito**

- [x] MVP: **un** tipo de negocio jugable antes de generalizar.  

**Implementado (2026-04):** **Puesto de productos** en lote A1 (`playerStall` en `housing_json`): consumibles (tipo `consumable`, bloqueo `coin_gold`), hasta 6 anuncios, precio configurable, **impuesto 8%** sobre el bruto (sink), créditos **pendientes** si el vendedor está offline y cobro al reconectar (`flushStallPendingForClient`). Mensajes `stall:addListing` / `stall:removeListing` / `stall:buy`; `produceStall` en `housing:sync`; `PlayerStallTriggerLayer` + `PlayerStallModal` + `StallFeedback`. Competencia con tiendas NPC existentes (mismo loop “farmear / craftear vs comprar”).

**Nota / Note:** Más tipos de negocio y layout ciudad siguen en iteraciones posteriores.

---

## 7. Variantes del primer hito (histórico) / First-milestone variants (historical)

*Opción **A** aplicada en implementación Fase 1.* Para acotar un arranque alternativo retrospectivo:

| Opción | ES | EN |
|--------|----|----|
| **A (recomendada)** | Parcela comprable + una cabaña solo en ese lote | Purchasable plot + one cabin only on that plot |
| **B** | Solo materiales + crafting **sin** parcela (prototipo de recetas) | Materials + crafting only, no plot yet |
| **C** | Parcela **gratis** de prueba + construcción (sin economía de lote) | Free dev plot + building, no plot economy |

**Recomendación del plan:** **A** para que construcción y economía de lote nazcan juntas.

---

## 8. Riesgos y mitigaciones / Risks and mitigations

| Riesgo | Mitigación |
|--------|------------|
| Desync inventario / mundo | Validar siempre en servidor; mensajes de error claros al cliente |
| Pérdida de construcciones | Persistencia explícita + migraciones; backups en dev |
| Scope creep | Cerrar checklist de fase antes de abrir la siguiente |
| Balance roto | Valores en `constants` versionados; tuning posterior |

---

## 9. Checklist maestro / Master checklist

- [x] **Fase 1** — Lote + kit cabaña + persistencia  
- [x] **Fase 2** — Tiers cabaña + atajo económico  
- [x] **Fase 3** — Piezas modulares + **convención GLB** (MVP paso 1; ver §6.3 para refinamiento)  
- [x] **Fase 4** — Cartel / modal de lote en mundo  
- [x] **Fase 5** — Lote sucio + limpieza  
- [x] **Fase 6** — Nodos de recurso en mapa  
- [x] **Fase 7** — Granja / animales  
- [x] **Fase 8** — Negocios / ciudad profunda  

---

## 10. Siguiente acción inmediata / Immediate next step

1. **Iteración economía / ciudad:** más lotes con puesto, alquiler de local, o venta a NPC con precio dinámico.  
2. **Granja+:** animales productivos o más cultivos / tiempos balanceados.  
3. **Ampliar catálogo** construcción: más `pieceId` + GLB en `public/models/build/`.  

---

## 11. Referencias internas / Internal references

- `src/constants/crafting.ts` — recetas  
- `src/constants/items.ts` — catálogo  
- `src/constants/housingPlots.ts` — lotes y bounds (coords a calibrar con ciudad)  
- `src/constants/housingPlotTriggers.ts` — triggers in-world para modal de lote  
- `src/constants/housingPlotDebris.ts` — plantilla de escombros por lote (Fase 5)  
- `src/constants/worldResourceNodes.ts` — nodos de recolección en mapa (Fase 6)  
- `src/constants/farmPlots.ts` — huerto en parcela (Fase 7)  
- `src/constants/buildPieces.ts` — piezas modulares + costes + convención GLB  
- `src/constants/housingTiers.ts` — costes de mejora de cabaña  
- `src/components/world/BuildPiecesLayer.tsx` — render piezas + carga GLB opcional  
- `src/components/world/PlotDebrisLayer.tsx` — escombros de plantilla en parcela  
- `src/components/world/WorldResourceNodesLayer.tsx` — cantera / restos de obra (Fase 6)  
- `src/components/world/FarmPlotsLayer.tsx` — bancales del huerto (Fase 7)  
- `src/constants/playerStall.ts` — puesto de productos en parcela (Fase 8)  
- `src/components/ui/PlayerStallModal.tsx` — UI compra / surtido (Fase 8)  
- `server/modules/HousingEvents.ts` — vivienda Colyseus  
- `resources/inventory/server/InventoryEvents.ts` — inventario servidor  
- `server/modules/ShopEvents.ts` — tienda  
- `docs/INVENTORY_CONFIG.md` — contexto de inventario  

---

*Documento vivo: al cerrar una fase, marcar checkboxes en §6 y §9 y subir **Versión** (patch) en cabecera.*
