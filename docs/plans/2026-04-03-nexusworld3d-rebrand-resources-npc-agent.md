# Plan: NexusWorld3D — rebrand, arquitectura tipo recursos y NPC Agent (backlog)

**EN (summary):** Stepwise plan to align naming with **NexusWorld3D** as a browser 3D/2D framework, introduce **server+client resource packs** with a **core exports** surface (QB/FiveM-style mental model), and reserve a **future phase** for a **central NPC/enemy agent brain**. The root `package.json` already identifies the project as `nexusworld3d-framework`; many runtime strings, room names, and file names still say Hotel Humboldt.

**ES (resumen):** Plan por fases para alinear el producto con **NexusWorld3D** (framework listo para mundos 2D/3D en navegador), introducir **recursos emparejados servidor+cliente** con **API de core exportable**, y dejar documentada la **fase futura** del **cerebro de agentes** para NPCs y enemigos inteligentes.

Las skills nuevas que instalaste se usarán según encaje cada tarea (p. ej. brainstorming antes de diseño fino, AI SDK si el agente usa LLM, etc.).

---

## Principios / Principles

1. **Separar marca del framework vs. mundo demo** — *Framework* = NexusWorld3D; el hotel puede seguir siendo **contenido** de un mundo de ejemplo, no el nombre del runtime.
2. **Migración sin romper** — Donde haya clientes o salas existentes, mantener **alias** de nombre de sala o `worldId` durante una versión.
3. **Un piloto antes del gran refactor** — Un solo recurso de ejemplo (`resources/_example` o similar) antes de mover economía, jobs, etc.

---

## Fase 0 — Inventario y convenciones de nombres

| Ámbito | Acción |
|--------|--------|
| **Sala Colyseus** | Definir nombre canónico (p. ej. `nexus-world` o `nexus-default`) y mapear `hotel-humboldt` como alias deprecado. |
| **Clase `HotelHumboldtRoom`** | Renombrar a `NexusWorldRoom` (o `GameWorldRoom`) + re-export opcional con nombre viejo marcado `@deprecated`. |
| **Cliente** | `joinOrCreate` debe leer el nombre desde config (`nexusworld3d.config.ts` o env `NEXT_PUBLIC_COLYSEUS_ROOM`). |
| **worldId por defecto** | Sustituir `"hotel-humboldt"` por id neutral (`main`, `default`, o el del mundo demo en JSON). |
| **UI / metadata** | `layout.tsx`, `LoginModal`, chat: usar `NEXT_PUBLIC_GAME_NAME` o campo `branding.appName` en config. |
| **Assets** | Rutas `/models/hotel_humboldt_model.glb` pueden quedarse como archivo físico; renombrar solo si aporta claridad (evitar romper mundos guardados sin migración). |
| **Repos / carpetas** | El workspace puede seguir llamándose `hotel-humboldt` en disco; el remoto público/privado ya los tenéis separados. Documentar nombres recomendados en README. |

**Entregable:** Lista cerrada de strings a cambiar (grep `hotel-humboldt`, `HotelHumboldt`, `Hotel Humboldt`) y PR dedicado solo a renombre + alias.

---

## Fase 1 — Config única y branding

1. Extender `nexusworld3d.config.ts` con `branding: { appName, shortName, defaultRoom, defaultWorldId }`.
2. Sustituir literales en cliente/servidor por lectura de config (o env con fallback).
3. Actualizar `README-RAILWAY.md`, `client/package.json` name/description, y variables de ejemplo.

**Entregable:** Nuevo clon arranca con nombre correcto sin tocar código de gameplay.

---

## Fase 2 — Núcleo “Core” explícito (`src/core` + servidor)

Objetivo: superficie estable tipo **exports** para recursos.

1. **Delimitar** qué es core hoy: `auth`, `worlds`, `config`, `storage`, clientes Colyseus compartidos, tipos comunes.
2. **Definir** `CoreContext` (servidor): referencia a sala, tick, acceso a Redis/economía si aplica — inyectado al registrar recursos.
3. **API pública** documentada (TypeScript): p. ej. `core.players`, `core.world`, `core.messaging` (nombres tentativos).
4. Evitar que los recursos importen internals profundos de la room; solo interfaces.

**Entregable:** `docs` corto “Core API” + un módulo `core/registerResources(room)` vacío que compila.

---

## Fase 3 — Recursos emparejados servidor + cliente

Estructura objetivo (por recurso):

```text
resources/
  <nombre-del-recurso>/
    resource.json          # nombre, versión, dependencias, orden de carga
    server/
      register.ts          # registra handlers Colyseus / hooks de sala
    client/
      register.ts          # registra hooks React / suscripciones / UI opcional
    shared/
      types.ts             # opcional: tipos mensajes Zod/schema si los usáis
```

Pasos:

1. Crear carpeta `resources/` y cargador en servidor: lee manifiestos, ordena por `dependencies`, llama `registerServer(coreCtx)`.
2. En cliente: punto de entrada único (`src/resources/loadClientResources.ts`) importado desde `GameCanvas` o `app/game` que ejecuta `registerClient(clientCtx)`.
3. **Piloto:** extraer un sistema pequeño (p. ej. reloj de servidor / un solo evento) a un recurso para validar el flujo.
4. Migración incremental: `JobsEvents`, `ShopEvents`, etc. → recursos sin big-bang.

**Entregable:** 1 recurso piloto + guía “cómo añadir un recurso” en `docs/`.

---

## Fase 4 — Escalabilidad para misiones y juego avanzado

1. Contrato de **misión** como recurso o subtipo: estados, objetivos, eventos de red, hooks `onPlayerEnter`, `onItemDelivered`.
2. Registro de **triggers** y **waypoints** vía datos (JSON del mundo) + código en recurso que los interpreta.
3. Tests manuales o checklist por recurso (carga, desconexión, reconexión).

**Entregable:** Plantilla `resources/mission-stub/` con README.

---

## Fase futura (backlog) — Cerebro central de agentes para NPC y enemigos

**Idea a implementar más adelante:** un **NPC Agent Director** (servidor autoritativo) que coordina comportamiento inteligente.

### Conceptos

- **Percepción:** estado del mundo relevante (posiciones, salud, objetivos de misión, afinidad) inyectada al agente.
- **Decisión:** capa que puede empezar como **árbol/FSM** y evolucionar a **LLM opcional** (tool-calling) para diálogo o planificación de alto nivel.
- **Ejecución:** órdenes concretas al simulador (mover, atacar, cubrirse) ya alineadas con vuestro `CharacterState` / física.
- **Separación:** el “cerebro” no vive en cada mesh de Three.js; vive en **servidor** o **worker**; el cliente solo **interpola** y muestra.

### Pasos de implementación (cuando toque)

1. Documento de diseño: qué es “inteligente” en v1 (combat básico vs. solo patrulla vs. diálogo).
2. Interfaz `INpcBrain` + implementación `FsmBrain`; segunda implementación `LlmBrain` detrás de feature flag.
3. Canal de mensajes Colyseus: `npc-intent` o similar, con validación server-side.
4. Integración con sistema de recursos: `resources/npc-agent/` (server + client).

**Entregable inicial de esta fase:** solo diseño + interfaces; **no** bloquea las fases 0–4.

---

## Orden recomendado de ejecución

1. Fase 0 (renombre técnico + alias sala/worldId)  
2. Fase 1 (config/branding)  
3. Fase 2 (core API mínima)  
4. Fase 3 (recurso piloto → migración gradual)  
5. Fase 4 (misiones / plantillas)  
6. **Paralelo o después:** diseño detallado del **NPC Agent Director** (fase futura)

---

## Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Romper clientes antiguos | Alias de nombre de sala + `worldId` legacy en config |
| Bundler no “descubre” carpetas nuevas | Manifiesto explícito `resource.json` + imports en índice |
| Scope creep del agente IA | Mantener fase LLM detrás de flag; v1 con FSM |

---

## Checklist rápido de seguimiento

- [ ] Fase 0: grep y PR de renombre + alias  
- [ ] Fase 1: branding desde config/env  
- [ ] Fase 2: `CoreContext` + doc API  
- [ ] Fase 3: `resources/` + piloto + guía  
- [ ] Fase 4: plantilla misión  
- [ ] Backlog: issue o doc “NPC Agent Director” enlazado a este plan  

---

*Última actualización: 2026-04-03*
