# Getting started / Cómo arrancar

## Requisitos / Requirements

- Node 20+ (recomendado)
- MySQL/MariaDB si usas persistencia completa (ver `.env.local.example`)

## Instalar / Install

Desde la **raíz del repositorio** / From the **repository root**:

```bash
npm install
```

**ES.** El workspace incluye `apps/demo`: puedes ejecutar `npm run dev:demo` allí (`cd apps/demo`) — delega a la raíz. Ver [`apps/demo/README.md`](../apps/demo/README.md).

**EN.** Workspace includes `apps/demo`; `cd apps/demo && npm run dev:demo` forwards to root scripts. See [`apps/demo/README.md`](../apps/demo/README.md).

## Desarrollo / Development

```bash
npm run dev
```

Arranca **Next.js** (puerto 3000 por defecto) y **Colyseus** (3001 o `COLYSEUS_PORT`).

## Modo demo del framework / Framework demo mode

Para un mundo **ligero** (plano + rejilla, sin ciudad GLB ni capas de juego pesadas):

```bash
# .env.local
NEXT_PUBLIC_FRAMEWORK_DEMO=1
```

O en la raíz del repo (Linux/macOS): `npm run dev:demo` (equivale a fijar la variable y arrancar Next + Colyseus).

Luego entra al mapa **exterior** como siempre. Útil para aislar motor vs contenido del juego.

**Demo sin DB ni Redis real:** `docs/DEMO_MINIMAL.md`.

Hay un **cubo dorado** cerca del origen: acércate (~5 m), haz clic; el servidor otorga una manzana (`food_apple`) si pasas validación de distancia y cooldown (plugin `core:demo-framework-cube`).

## Paquete `protocol` / `protocol` package

Los nombres de mensajes Colyseus compartidos viven en `packages/protocol` (`@nexusworld3d/protocol`). Importa desde cliente y servidor para evitar typos.

**Handshake:** al unirse a la **sala mundo**, el cliente envía `protocolVersion` en las opciones de join (`withWorldProtocolJoinOptions` en `@nexusworld3d/engine-client`, usado desde `src/lib/colyseus/client.ts`). El servidor (`NexusWorldRoom`) debe ver el mismo `PROTOCOL_VERSION` del paquete; si no, el join falla con un error explícito.

**Paquetes motor (capa inicial):** `@nexusworld3d/engine-server` (contrato de plugins de sala), `@nexusworld3d/engine-client` (helpers de join cliente).

**Manifest en runtime:** Colyseus carga `content/manifest.json` al arranque (`loadContentManifestOrThrow`); si falla la validación, el proceso termina — alinea con `npm run validate-content` antes de desplegar.

**Assets de construcción:** `npm run validate-build-assets` comprueba `public/models/build/{pieceId}.glb` para el catálogo de piezas + `buildingPieces[].pieceId` del manifest (ver `docs/ADDING_CONTENT.md` §5). Usa `--strict` en CI si quieres fallar sin GLB.

## Siguientes pasos / Next steps

- `docs/ARCHITECTURE.md` — flujo cliente ↔ sala ↔ persistencia
- `docs/ADDING_CONTENT.md` — plugins de sala y datos
- `docs/DEPLOYMENT.md` — producción, Docker, variables
