# Getting started / Cómo arrancar

## Requisitos / Requirements

- Node 20+ (recomendado)
- MySQL/MariaDB si usas persistencia completa (ver `.env.local.example`)

## Instalar / Install

```bash
npm install
```

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

Luego entra al mapa **exterior** como siempre. Útil para aislar motor vs contenido del juego.

## Paquete `protocol` / `protocol` package

Los nombres de mensajes Colyseus compartidos viven en `packages/protocol` (`@nexusworld3d/protocol`). Importa desde cliente y servidor para evitar typos.

## Siguientes pasos / Next steps

- `docs/ARCHITECTURE.md` — flujo cliente ↔ sala ↔ persistencia
- `docs/ADDING_CONTENT.md` — plugins de sala y datos
