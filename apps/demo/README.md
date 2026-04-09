# Framework demo / Demo del framework

**ES.** Este repo **no** duplica una segunda app Next por ahora. El “demo mode” vive en la app principal:

1. Copia `.env.local.example` → `.env.local`.
2. Añade: `NEXT_PUBLIC_FRAMEWORK_DEMO=1`
3. `npm run dev` — en **exterior** verás suelo + rejilla **sin** `city.glb`, NPCs, housing, tala/mina, etc. La sala Colyseus sigue activa para probar red.

**EN.** There is no separate Next app yet. Enable demo mode on the main app with `NEXT_PUBLIC_FRAMEWORK_DEMO=1` (see root `docs/GETTING_STARTED.md`).
