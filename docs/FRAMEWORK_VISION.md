# Hotel Humboldt Framework - Visión y Roadmap

## 🎯 Objetivo Principal

Convertir Hotel Humboldt en un **framework open-source** para crear mundos 3D multijugador sin necesidad de conocimientos de Blender o programación avanzada.

## 🌟 Propuesta de Valor

- ✅ **Clonar y listo**: `git clone` → configurar ENVs → `npm run dev`
- ✅ **Sin bases de datos complejas**: Todo en Redis + S3 + archivos JSON
- ✅ **Editor visual de mundos**: Drag & drop de modelos 3D en el navegador
- ✅ **Altamente configurable**: Vida, stamina, max players, física, etc.
- ✅ **Deploy fácil**: Railway, Render, Fly.io (NO Vercel por WebSockets)
- ✅ **Assets gestionados**: Upload a S3 + CDN opcional para carga rápida

## 🏗️ Arquitectura del Framework

### 1. Configuración Central (`humboldt.config.ts`)

```typescript
export default {
  // Server
  server: {
    maxPlayers: 50,
    tickRate: 60,
    port: 3000,
  },
  
  // Game mechanics
  gameplay: {
    hasHealth: true,
    hasStamina: true,
    hasCombat: false,
    hasInventory: true,
    maxInventorySlots: 20,
  },
  
  // Physics
  physics: {
    gravity: -9.8,
    playerSpeed: 5,
    runSpeed: 8,
    jumpForce: 4,
  },
  
  // Assets
  assets: {
    storageProvider: 's3', // 's3' | 'local' | 'cloudflare-r2'
    cdnUrl: process.env.CDN_URL || '',
    defaultTerrain: '/models/terrain/Terrain_01.glb',
    defaultSkybox: '/models/sky/sky_43_2k.png',
  },
  
  // Characters
  characters: {
    models: {
      male: '/models/characters/men/men-all.glb',
      female: '/models/characters/women/women-all.glb',
    },
    // Animaciones dinámicas (no hardcodeadas)
    animations: ['idle', 'walking', 'running', 'jumping', 'attacking'],
  },
  
  // Worlds/Levels
  worlds: {
    default: 'main-world',
    directory: './worlds', // JSON files
  },
}
```

### 2. Variables de Entorno (`.env.local`)

```bash
# ========================================
# ADMIN ACCESS (Sin base de datos)
# ========================================
ADMIN_USERNAME_ACCESS=tu_username_admin
ADMIN_PASSWORD_ACCESS=tu_password_segura_aqui

# ========================================
# STORAGE (S3 Compatible)
# ========================================
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=hotel-humboldt-assets
CDN_URL=https://tu-cdn.cloudfront.net # Opcional

# ========================================
# REDIS (Upstash o cualquier Redis)
# ========================================
UPSTASH_REDIS_REST_URL=https://tu-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=tu_token_aqui

# ========================================
# GAME CONFIG
# ========================================
NODE_ENV=development
NEXT_PUBLIC_GAME_NAME=Hotel Humboldt
NEXT_PUBLIC_MAX_PLAYERS=50
NEXT_PUBLIC_WORLD_SIZE=1000

# ========================================
# DEPLOYMENT
# ========================================
# Railway/Render/Fly.io inyectan PORT automáticamente
# NO definir PORT aquí
```

### 3. Estructura de Archivos

```
hotel-humboldt/
├── src/
│   ├── core/                    # Framework core
│   │   ├── config.ts           # Carga humboldt.config.ts
│   │   ├── storage.ts          # S3/Local storage abstraction
│   │   └── auth.ts             # Admin auth (ENV-based)
│   ├── modules/
│   │   ├── player/             # Sistema de jugadores
│   │   ├── world/              # Sistema de mundos
│   │   ├── chat/               # Sistema de chat
│   │   ├── inventory/          # Sistema de inventario
│   │   └── editor/             # 🆕 Editor de mundos
│   ├── admin/                   # 🆕 Panel de administración
│   │   ├── page.tsx            # /admin (protegido)
│   │   ├── worlds/             # Editor de mundos
│   │   ├── assets/             # Gestor de assets
│   │   └── config/             # Configuración del juego
│   ├── shared/                  # Tipos compartidos
│   │   ├── protocol.ts         # Mensajes cliente-servidor
│   │   └── types.ts            # Tipos del juego
│   └── app/
│       └── admin/              # Rutas protegidas
│           └── [...]/
├── worlds/                      # 🆕 Niveles guardados (JSON)
│   ├── main-world.json
│   ├── dungeon-level-1.json
│   └── pvp-arena.json
├── public/
│   └── models/
│       └── default/            # Solo assets por defecto (pequeños < 10MB)
│           ├── characters/
│           └── terrain/
├── server/
│   ├── combined.ts             # Servidor unificado
│   └── rooms/
│       └── HotelHumboldtRoom.ts
├── humboldt.config.ts          # 🆕 Configuración central
├── FRAMEWORK_GUIDE.md          # 🆕 Guía para usuarios
└── package.json
```

## 🎨 Editor de Mundos (Prioridad #1)

### Funcionalidades

1. **Vista 3D en tiempo real** (Three.js + react-three-fiber)
   - Cámara orbital para navegar
   - Grid para referencia
   - Controles de transformación (mover, rotar, escalar)

2. **Panel lateral de assets**
   - Lista de modelos disponibles
   - Preview de cada modelo
   - Drag & drop al mundo

3. **Upload de modelos**
   - Drag & drop de archivos `.glb`
   - Upload a carpeta temporal: `/public/models/temp/`
   - Validación de tamaño y formato
   - Preview antes de usar

4. **Propiedades de objetos**
   - Posición (x, y, z)
   - Rotación (x, y, z)
   - Escala (x, y, z)
   - Tipo (terrain, decoration, building, interactive)
   - Colisión (sí/no)

5. **Guardar mundo**
   - Formato JSON:
   ```json
   {
     "id": "main-world",
     "name": "Mundo Principal",
     "spawnPoint": { "x": 0, "y": 0, "z": 0 },
     "skybox": "/models/sky/sky_43_2k.png",
     "objects": [
       {
         "id": "terrain-1",
         "type": "terrain",
         "model": "/models/terrain/Terrain_01.glb",
         "position": { "x": 0, "y": 0, "z": 0 },
         "rotation": { "x": 0, "y": 0, "z": 0 },
         "scale": { "x": 1, "y": 1, "z": 1 },
         "hasCollision": true
       },
       {
         "id": "hotel-1",
         "type": "building",
         "model": "/models/hotel_humboldt_model.glb",
         "position": { "x": 0, "y": 0, "z": -100 },
         "rotation": { "x": 0, "y": 0, "z": 0 },
         "scale": { "x": 6, "y": 6, "z": 6 },
         "hasCollision": true
       }
     ]
   }
   ```

6. **Persistencia de assets**
   - Al guardar mundo:
     - Mover modelos de `/temp/` a `/persistent/worlds/{world-id}/`
     - Subir a S3 si está configurado
     - Actualizar URLs en el JSON
   - Opción de limpiar modelos no usados

## 📦 Sistema de Storage (S3 + CDN)

### Estrategia de Assets Mejorada

```typescript
// src/core/storage.ts
export class AssetStorage {
  private provider: 'local' | 's3' | 'cloudflare-r2';
  private cdnUrl?: string;
  private projectName: string;
  
  constructor() {
    this.projectName = process.env.PROJECT_NAME || 'hotel-humboldt';
  }
  
  async uploadTemp(file: File): Promise<string> {
    // Upload a S3: s3://bucket/project-name/temp/model-abc123.glb
    // Retorna URL temporal
  }
  
  async makePersistent(tempUrl: string, worldId: string): Promise<string> {
    // Mover de temp/ a maps/{worldId}/models/
    // s3://bucket/project-name/maps/main-world/models/terrain.glb
    // Retorna URL final (CDN si existe, sino S3)
  }
  
  async cleanupTemp(): Promise<void> {
    // Eliminar archivos en S3 temp/ más viejos de 24h
  }
  
  async deleteWorld(worldId: string): Promise<void> {
    // Eliminar carpeta S3 maps/{worldId}/
  }
  
  getAssetUrl(path: string): string {
    // Si CDN: CDN_URL + path
    // Si S3: S3 URL + path
    // Si local: /models/default/ + path (solo assets pequeños)
  }
  
  // Estructura S3
  getS3Paths() {
    return {
      temp: `${this.projectName}/temp/`,
      maps: `${this.projectName}/maps/`,
      shared: `${this.projectName}/shared/`,
    };
  }
}
```

### Estructura S3 Propuesta

```
s3://tu-bucket/hotel-humboldt/
├── temp/                           # Modelos temporales (editor)
│   ├── model-abc123.glb           # Se eliminan después de 24h
│   └── model-def456.glb
├── maps/                          # Mundos guardados
│   ├── main-world/
│   │   ├── map.json              # Metadatos del mundo
│   │   └── models/
│   │       ├── terrain.glb       # Assets específicos del mundo
│   │       └── hotel.glb
│   └── dungeon-1/
│       ├── map.json
│       └── models/
│           └── castle.glb
└── shared/                        # Assets compartidos
    ├── characters/
    │   ├── male.glb              # Personajes por defecto
    │   └── female.glb
    └── default/
        ├── terrain.glb           # Terreno por defecto
        └── skybox.png            # Skybox por defecto
```

### Flujo de trabajo mejorado

1. **Usuario sube modelo** → `s3://bucket/hotel-humboldt/temp/model-abc123.glb`
2. **Usuario arrastra al editor** → Se muestra en la escena (desde S3)
3. **Usuario guarda mundo** → 
   - Modelo se mueve a `s3://bucket/hotel-humboldt/maps/main-world/models/terrain.glb`
   - JSON del mundo guarda la URL final
4. **Carga del mundo** → 
   - Si CDN: `https://cdn.example.com/hotel-humboldt/maps/main-world/models/terrain.glb`
   - Si S3: `https://s3.amazonaws.com/bucket/hotel-humboldt/maps/main-world/models/terrain.glb`
   - Si local: `/models/default/terrain.glb` (solo assets pequeños)

### Ventajas de esta estrategia

- ✅ **Sin límites de GitHub** - Todo pesado en S3
- ✅ **Organización clara** - temp/ vs maps/ vs shared/
- ✅ **Limpieza automática** - temp/ se limpia cada 24h
- ✅ **Escalable** - Sin límites de tamaño
- ✅ **CDN ready** - URLs consistentes para cache
- ✅ **Desarrollo local** - Solo assets pequeños en `/public/models/default/`

## 🔐 Sistema de Admin (Sin DB)

### Autenticación simple con ENV

```typescript
// src/core/auth.ts
export function checkAdminAuth(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USERNAME_ACCESS;
  const adminPass = process.env.ADMIN_PASSWORD_ACCESS;
  
  if (!adminUser || !adminPass) {
    throw new Error('Admin credentials not configured');
  }
  
  return username === adminUser && password === adminPass;
}

// Middleware para rutas /admin
export function withAdminAuth(handler: Function) {
  return async (req: Request) => {
    const session = await getSession(req); // Cookie simple
    
    if (!session?.isAdmin) {
      return Response.redirect('/admin/login');
    }
    
    return handler(req);
  };
}
```

### Rutas protegidas

```
/admin/login          → Login simple (username + password)
/admin/dashboard      → Overview del servidor
/admin/worlds         → Editor de mundos
/admin/assets         → Gestor de assets
/admin/config         → Configuración del juego
/admin/players        → Lista de jugadores (Redis)
```

## 🎮 Sistema de Animaciones Dinámicas

### Problema actual
Las animaciones están hardcodeadas en el código.

### Solución propuesta

```typescript
// humboldt.config.ts
export default {
  characters: {
    animations: {
      // Mapeo flexible de nombres
      idle: ['Idle', 'idle', 'Standing'],
      walking: ['Walking', 'Walk', 'walking'],
      running: ['Running', 'Run', 'running'],
      jumping: ['Jumping', 'Jump', 'jumping'],
      attacking: ['Attacking', 'Attack', 'attacking'],
      // Usuarios pueden agregar más
      dancing: ['Dancing', 'Dance'],
      sitting: ['Sitting', 'Sit'],
    }
  }
}

// src/components/world/AnimatedCharacter.tsx
function getAnimationName(action: string, availableActions: string[]): string {
  const config = getConfig();
  const possibleNames = config.characters.animations[action] || [action];
  
  for (const name of possibleNames) {
    if (availableActions.includes(name)) {
      return name;
    }
  }
  
  // Fallback a idle
  return getAnimationName('idle', availableActions);
}
```

## 📚 Documentación para Usuarios

### FRAMEWORK_GUIDE.md (Para usuarios del framework)

```markdown
# Hotel Humboldt Framework - Guía de Inicio

## 🚀 Instalación

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno (ver `.env.example`)
4. Iniciar en desarrollo: `npm run dev`

## ⚙️ Configuración Inicial

### 1. Credenciales de Admin
### 2. Storage (S3 o local)
### 3. Redis
### 4. Configuración del juego

## 🎨 Crear tu Primer Mundo

### 1. Subir assets básicos
### 2. Configurar personajes
### 3. Usar el editor de mundos
### 4. Guardar y probar

## 🚢 Deploy a Producción

### Railway
### Render
### Fly.io

## 🔧 Personalización Avanzada

### Modificar física
### Agregar nuevas mecánicas
### Crear plugins
```

## 📋 Roadmap de Implementación

### Fase 1: Core del Framework (Actual → 2 semanas)
- [x] Servidor unificado (Next + Colyseus)
- [x] Sistema de jugadores multijugador
- [x] Deploy a Railway
- [ ] Extraer configuración a `humboldt.config.ts`
- [ ] Sistema de storage abstracto (S3/local)
- [ ] Autenticación admin con ENV
- [ ] Animaciones dinámicas (no hardcodeadas)

### Fase 2: Editor de Mundos (2-3 semanas)
- [ ] Ruta `/admin` protegida
- [ ] Vista 3D con Three.js
- [ ] Upload de modelos GLB
- [ ] Drag & drop de assets
- [ ] Panel de propiedades
- [ ] Guardar/cargar mundos (JSON)
- [ ] Sistema de carpetas temp/persistent
- [ ] Integración con S3

### Fase 3: Gestor de Assets (1-2 semanas)
- [ ] Lista de assets disponibles
- [ ] Preview de modelos
- [ ] Upload masivo
- [ ] Organización por categorías
- [ ] Limpieza de assets no usados
- [ ] Integración con CDN

### Fase 4: Panel de Admin Completo (1 semana)
- [ ] Dashboard con métricas
- [ ] Lista de jugadores online
- [ ] Configuración del servidor
- [ ] Logs en tiempo real
- [ ] Comandos de admin

### Fase 5: Documentación y Ejemplos (1 semana)
- [ ] FRAMEWORK_GUIDE.md completo
- [ ] Ejemplos de mundos
- [ ] Video tutoriales
- [ ] Templates de configuración
- [ ] Troubleshooting común

### Fase 6: Open Source y Comunidad (Ongoing)
- [ ] Limpiar código para release
- [ ] README atractivo
- [ ] Licencia (MIT recomendado)
- [ ] GitHub Actions para CI/CD
- [ ] Discord/comunidad
- [ ] Contribuciones de la comunidad

## 🎯 Prioridades Inmediatas

1. **Editor de mundos básico** (drag & drop + save JSON)
2. **Sistema de storage inteligente** (temp → persistent → S3)
3. **Animaciones configurables** (quitar hardcoding)
4. **Documentación clara** (para que otros puedan usar)

## 💡 Consideraciones Técnicas

### Storage sin CDN
Si el usuario no tiene CDN:
- Opción 1: Servir desde S3 directamente (más lento pero funciona)
- Opción 2: Servir desde `/public` local (solo para dev/pequeña escala)
- Opción 3: Usar Cloudflare R2 (gratis hasta 10GB, compatible con S3)

### Límites de tamaño
- Modelos temporales: Max 100MB por archivo
- Total en `/temp`: Max 500MB (limpieza automática cada 24h)
- Total en `/persistent`: Sin límite (depende de S3/local)

### Performance
- Lazy loading de modelos
- LOD (Level of Detail) automático
- Compresión de texturas
- Instancing para objetos repetidos

## 🤝 Contribuciones Futuras

Este framework será open source para que la comunidad pueda:
- Agregar nuevos sistemas (combate, crafting, etc.)
- Crear plugins
- Compartir mundos/assets
- Mejorar el editor
- Agregar soporte para más plataformas de deploy

---

**Estado actual**: ✅ Multiplayer funcional en Railway
**Siguiente paso**: 🎨 Implementar editor de mundos básico
**Meta final**: 🌟 Framework completo y documentado para la comunidad

