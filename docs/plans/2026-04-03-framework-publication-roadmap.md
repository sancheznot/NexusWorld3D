# Framework web 3D multijugador — publicación y extensibilidad  
# Web 3D multiplayer framework — open-source readiness & extensibility

**Versión:** 1.5  
**Fecha:** 2026-04-03  
**Propósito / Purpose:** Definir **qué falta montar** para que el repo pueda considerarse un **framework** en el que un **tercero** añada contenido (modelos, reglas, interacciones) **sin forkar medio motor**, y poder **publicar el núcleo en GitHub** mientras el juego concreto (Hotel Humboldt) vive en un repo **privado** que solo consume el framework.

### Progreso reciente / Recent progress (implementado en repo)

- [x] **Workspaces npm** + paquete **`@nexusworld3d/protocol`** (`packages/protocol`): `PROTOCOL_VERSION`, `WorldMessages`, `HousingMessages`, `InventoryMessages`, `PlayerMessages`, `RpgMessages`, etc.
- [x] **Cliente y servidor** migrados a esas constantes en los puntos críticos (sala mundo, inventario, tala/mina/nodos, housing client, feedback UI).
- [x] **Plugins de sala:** `NexusRoomPlugin`, `attachNexusRoomPlugins`, plugin piloto **`core:world-resource-nodes`** (`server/room/nexusRoomPlugins.ts`).
- [x] **Demo mode:** `NEXT_PUBLIC_FRAMEWORK_DEMO=1` + `FrameworkDemoGround` (sin `city.glb` ni capas pesadas en exterior).
- [x] **Docs:** `docs/GETTING_STARTED.md`, `ARCHITECTURE.md`, `ADDING_CONTENT.md`; **`apps/demo/README.md`** explica el demo; **`npm run validate-content`** (JSON + ids ⊆ `ITEMS_CATALOG`).
- [x] Handshake **`protocolVersion`**: opción de join `protocolVersion` (ver `JOIN_OPTION_PROTOCOL_VERSION_KEY` en `@nexusworld3d/protocol`); `NexusWorldRoom` rechaza join si no coincide con `PROTOCOL_VERSION`.
- [x] **`content/manifest.json`** + `npm run validate-content` (validación estructural v1, no stub).
- [x] **Primera capa `engine-*`:** `@nexusworld3d/engine-server` (`NexusRoomPlugin`, `attachNexusRoomPlugins`); `@nexusworld3d/engine-client` (`withWorldProtocolJoinOptions`). La sala y plugins concretos siguen en `server/` + `src/`.
- [x] **Loader runtime:** `server/content/loadContentManifest.ts` — hidrata y valida el manifest al arranque; `getContentManifest`, `isDeclaredManifestItemId`.
- [ ] Pendiente: mover más subsistemas al motor; usar manifest en reglas de juego (craft/spawn); más plugins demo.

---

## Resumen por fases / Phases at a glance

**ES.** Sí está pensado por **fases de ejecución** (1 → 2 → 3). La **§3** no son fases secuenciales: son **bloques temáticos** (todo lo que hay que cubrir); el **orden** está en la **§4** y aquí abajo.

**EN.** Yes: there is a **sequential execution plan** (phases 1 → 2 → 3). **§3** is **thematic workstreams**, not step order; **§4** (and the table below) is the **timeline**.

| Fase | ES | EN | Entrega principal / Main deliverable |
|------|----|----|----------------------------------------|
| **1** | Separar motor y juego sin romper producción | Split engine vs game safely | Paquete `protocol`, API `registerRoomPlugin` + **un** plugin piloto, `apps/demo` que arranque sin Hotel |
| **2** | Contenido data-driven + contratos duros | Data-driven content + hard contracts | Manifest de contenido + CLI `validate-content`; tipos/mensajes unificados (`WorldMessages`, `protocolVersion`) donde aplique |
| **3** | Listo para GitHub público | Public GitHub readiness | Demo documentada, LICENSE, higiene secretos, repo público; juego privado consume el motor por paquete o monorepo |

**Paralelo a 1–3 / Parallel with 1–3 (según prioridad / as needed):** §3.5 auth abstracta, §3.6 persistencia abstracta, §3.7 assets/convenciones, §3.9 docs — no bloquean la Fase 1 pero deben existir **antes** de llamar “v1 framework” a terceros; la **§6** es el cierre formal.

---

## 1. Decisión de producto / Product decision

**ES.** El código actual mezcla **motor + juego** (constantemente útil, pero no “framework puro”). El objetivo es **congelar la fantasía del juego** en el repo privado y **extraer** al repo público solo lo reutilizable, con **contratos claros** y **datos de ejemplo mínimos**.

**EN.** Today the repo mixes **engine + game**. The goal is to **freeze game fantasy** in a private repo and **publish** a public repo with only reusable core, **clear contracts**, and **minimal sample data**.

**Resultado esperado / Expected shape**

| Repo público “framework” | Repo privado “tu juego” |
|--------------------------|-------------------------|
| Paquetes `engine`, `protocol`, `content-schema` | Paquete o carpeta `game` / `hotel-humboldt` |
| Sala genérica + extensiones registrables | `NexusWorldRoom` o equivalente solo compone plugins |
| Demo mínima (personaje, sala, 1 mapa vacío o sample) | Mapas, GLB de ciudad, NPCs, narrativa, economía temática |
| Documentación “cómo extender” | Contenido propietario, balances, arte |

---

## 2. Definición de “listo como framework” / Definition of “framework-ready”

Un tercero debe poder, **leyendo solo la documentación del framework** (y sin conocer Hotel Humboldt):

1. **Arrancar** cliente + servidor de demo en local.
2. **Añadir un ítem** solo con **datos** (catálogo + validación).
3. **Añadir un objeto en mundo** (modelo + trigger o interacción) con **un punto de extensión documentado** (servidor valida, cliente muestra).
4. **Registrar un mensaje de sala** nuevo con **tipo/esquema compartido** entre cliente y servidor.
5. Entender **dónde termina el motor** y **dónde empieza su juego** (límites de carpetas/paquetes).

Hasta que eso no sea cierto, el proyecto sigue siendo **“juego con código reutilizable”**, no **“framework + juego aparte”**.

---

## 3. Líneas de trabajo obligatorias / Required workstreams

### 3.1 Partición monorepo / Monorepo split

**ES.** Mover a paquetes con fronteras explícitas (nombres orientativos):

**EN.** Explicit package boundaries (names indicative):

| Paquete | Responsabilidad |
|---------|-----------------|
| `@repo/protocol` o `packages/protocol` | Tipos TS + nombres de mensajes Colyseus + versionado (`protocolVersion`) |
| `@repo/engine-server` | Sala base, registro de handlers, validación de jugador genérica, hooks de persistencia **interfaces** |
| `@repo/engine-client` | Canvas R3F base, input, cámara, puente Colyseus genérico (sin textos de Hotel) |
| `@repo/content-schema` | JSON Schema / Zod para manifest de contenido |
| `apps/demo` o `apps/starter` | Next minimal + sala demo |
| *(privado)* `packages/game-humboldt` | Constantes del juego, NPCs, mapas, copy |

**Entregables / Deliverables**

- [x] `npm` **workspaces** (`packages/*`) + dependencia `workspace:*` en la app raíz.
- [x] Paquete **`@nexusworld3d/protocol`** (mensajes + versión).
- [x] Paquetes **`@nexusworld3d/engine-server`** / **`@nexusworld3d/engine-client`** (capa mínima; extracción completa de sala/subsistemas pendiente).
- [ ] Ningún import desde `engine` hacia assets o nombres de Hotel.

---

### 3.2 Manifest de contenido / Content manifest

**ES.** Un solo **origen de verdad** para lo que hoy está repartido en `ITEMS_CATALOG`, recetas, spawns, árboles/rocas, piezas, tiendas, etc.: un **archivo o carpeta versionada** (JSON/YAML) + **validación en build**.

**EN.** Single source of truth for catalog-like data, validated at build time.

**Incluye / Includes**

- [x] Esquema v1 en **`content/manifest.json`**: `items[]`, `recipes[]`, `worldSpawns[]`, `shops[]`, `buildingPieces[]` (extensible).
- [x] Script **`npm run validate-content`** (validación real: JSON, `schemaVersion`, ids únicos).
- [x] Loader en servidor que **hidrate** el manifest en memoria al iniciar (validación + cache); extender a recetas/spawns cuando existan en JSON.

**Beneficio / Benefit:** el tercero “solo” edita datos; no abre diez archivos TS.

---

### 3.3 API de extensiones / Extension API

**ES.** Sustituir el patrón “copiar `TreeChopEvents` / `RockMineEvents`” por **registro**:

**EN.** Replace copy-paste event modules with registration.

**Ejemplos de interfaces / Example interfaces**

- [ ] `registerWorldTool({ id, clientRaycastFilter, serverOnUse, durabilityKey })`
- [ ] `registerResourceNode({ type, grants, cooldown, distanceCheck })`
- [ ] `registerRoomPlugin({ name, attach(room, ctx) })` donde `ctx` expone `inventory`, `getPlayerPosition`, `broadcast`, etc.
- [ ] `registerItemEffect({ itemId, onConsume })` (servidor)

**Entregables / Deliverables**

- [x] Guía **`docs/ADDING_CONTENT.md`** + plugin piloto documentado (`createWorldResourceNodesPlugin`).
- [ ] Demo pública con plugin “cubo que da ítem” (opcional; hoy el piloto es recolección de nodos).

---

### 3.4 Protocolo cliente–servidor / Client–server protocol

**ES.** Hoy los strings `"world:tree-chop"` están dispersos. El framework debe centralizar:

**EN.** Centralize message names and payloads.

- [x] Constantes de mensajes en **`@nexusworld3d/protocol`** (`WorldMessages`, etc.); tipos de payload aún dispersos (mejora incremental).
- [x] Campo `protocolVersion` en **opciones de join** a la sala mundo; servidor rechaza con error claro si falta o no coincide.
- [x] Convención documentada: prefijos **`core:`** / **`game:`** (plugins + mensajes) en comentarios de `packages/protocol/src/messages.ts`.

---

### 3.5 Identidad, auth y sesiones / Identity & sessions

**ES.** Para un repo público usable, hace falta una **historia mínima** (aunque sea dev):

**EN.** Minimum credible story for third parties:

- [ ] Modo **dev**: sesión anónima o token falso documentado.
- [ ] Interfaz `AuthProvider` intercambiable (su juego privado conecta Supabase/Auth0/etc.).
- [ ] Sin credenciales reales en el repo público (solo `.env.example`).

---

### 3.6 Persistencia abstracta / Persistence abstraction

**ES.** El motor no debe asumir Redis/MariaDB concretos de un solo juego.

**EN.** Engine should not hardcode one game’s DB layout.

- [ ] Interfaces: `PlayerStore`, `WorldStateStore`, `SessionStore`.
- [ ] Implementaciones de ejemplo en demo (en memoria o SQLite); el juego privado implementa las reales.

---

### 3.7 Assets y convenciones / Assets & conventions

**ES.** Documentar y, si es posible, automatizar:

**EN.** Document and automate where possible:

- [ ] Árbol de carpetas `public/models/...` o CDN + reglas de `pieceId` ↔ archivo.
- [ ] Script que valide que cada `pieceId` del manifest tiene GLB.
- [ ] Política de licencias de assets en repo **público** (solo CC0 / propios / placeholders).

---

### 3.8 Demo pública / Public demo

**ES.** El framework sin juego debe **verse y jugarse** 5 minutos:

**EN.** A 5-minute runnable demo without the full game:

- [x] Mapa plano vía **`NEXT_PUBLIC_FRAMEWORK_DEMO=1`** + personaje + sala Colyseus (misma app; ver `docs/GETTING_STARTED.md`).
- [ ] Inventario mínimo aislado solo para demo pública (sin DB completa).
- [x] Instrucciones en **`docs/GETTING_STARTED.md`** (`npm install`, `npm run dev`).

---

### 3.9 Documentación / Documentation

**ES.** Mínimo viable para terceros:

**EN.** Minimum viable docs:

- [ ] `README.md` raíz orientado a framework (hoy describe el monorepo completo).
- [x] `docs/GETTING_STARTED.md`.
- [x] `docs/ARCHITECTURE.md` (diagrama cliente ↔ Colyseus ↔ persistencia).
- [x] `docs/ADDING_CONTENT.md` (plugin + mensajes; manifest en Fase 2).
- [ ] `docs/DEPLOYMENT.md` (opcional v1: Docker compose demo).
- [ ] `LICENSE` explícito (MIT / Apache-2.0, etc.).

---

### 3.10 Higiene para GitHub público / Open-source hygiene

- [ ] Eliminar secretos, URLs internas, nombres de producción del juego en código del núcleo.
- [ ] `.env.example` completo; `.gitignore` correcto.
- [ ] `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md` (opcional pero recomendable).
- [ ] Issue templates: “bug del motor” vs “pregunta de mi juego” (orientar a que el juego vaya al repo privado).

---

## 4. Orden sugerido de ejecución / Suggested execution order

*(Misma numeración que el resumen: **Fase 1 / 2 / 3**.)*

**Fase 1 — Separar sin romper (~1–2 semanas de enfoque)**  
1. Extraer `protocol` (tipos + constantes de mensajes).  
2. Introducir `registerRoomPlugin` y migrar **un** sistema (el más pequeño) como prueba.  
3. Añadir `apps/demo` que arranque sin mapa de Hotel.

**Fase 2 — Contenido y contratos (~2–4 semanas)**  
4. Manifest + validador + migrar catálogo de ítems de la demo.  
5. Documentar “añadir ítem + spawn”.  
6. Centralizar mensajes/payloads y `protocolVersion` (ver §3.4) en la medida que el monorepo lo permita sin bloquear el punto 4.

**Fase 3 — Publicación (~1 semana)**  
7. LICENSE, README, limpieza de secretos, repo público.  
8. Repo privado: submódulo o `npm` package `@tu-org/engine` desde GitHub Packages o registry privado.

*(Los tiempos son orientativos; dependen de equipo y de cuánto código acople hoy con Hotel.)*

---

## 5. Qué **no** entra en el framework público / Out of scope for public framework

**ES.** Para no diluir el producto:

**EN.** To keep the public repo focused:

- Narrativa, quests, diálogos, marca, UI temática completa del Hotel.
- Mapa ciudad GLB pesado y arte propietario.
- Balances económicos finos del juego comercial.
- Integraciones legales/compliance específicas (menos interfaces genéricas).

Eso permanece en el **repo privado** como consumidor del motor.

---

## 6. Criterio de cierre / Exit criteria (checklist final)

Marcar el framework como **“v1 listo para público”** cuando:

- [ ] `apps/demo` corre en máquina limpia siguiendo solo el README.
- [ ] Un colaborador externo (o tú con cuenta secundaria) añade **un ítem y un interactuable** usando solo docs + manifest + un plugin pequeño.
- [ ] No hay imports de `hotel`, `humboldt`, ni constantes de mapas reales dentro de `packages/engine-*`.
- [ ] Licencia y repositorio público publicados; el juego completo está en repo privado que **depende** del paquete público (versión semver).

---

## 7. Nota sobre el estado actual / Note on current codebase

**ES.** El proyecto **ya tiene** muchas piezas de “motor” (Colyseus, inventario autoritativo, economía, housing, gathering, etc.). Este documento **no** desecha ese trabajo: pide **reorganizar fronteras** y **documentar extensión** para que el esfuerzo futuro sea **contenido y plugins**, no reescritura.

**EN.** Existing work is valuable; this roadmap is about **boundaries and extensibility**, not starting over.

---

*Fin del documento / End of document.*
