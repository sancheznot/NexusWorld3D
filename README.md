# 🏨 Hotel Humboldt Framework

> **Un framework open-source para crear mundos 3D multijugador sin necesidad de Blender o programación avanzada**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black)](https://nextjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.180.0-000000)](https://threejs.org/)
[![Colyseus](https://img.shields.io/badge/Colyseus-0.16.5-FF6B6B)](https://colyseus.io/)

## ✨ Características

- 🎮 **Multijugador en tiempo real** - Hasta 50 jugadores simultáneos
- 🎨 **Editor visual de mundos** - Drag & drop de modelos 3D en el navegador
- ⚡ **Sin base de datos** - Todo en Redis + S3 + archivos JSON
- 🔧 **Altamente configurable** - Vida, stamina, física, animaciones, etc.
- 🚀 **Deploy fácil** - Railway, Render, Fly.io (compatible con WebSockets)
- 📦 **Gestión inteligente de assets** - Upload a S3 + CDN opcional
- 🛡️ **Panel de admin** - Sin base de datos, solo variables de entorno
- 🌐 **Open source** - MIT License, comunidad activa

## 🚀 Inicio Rápido

### 1. Clonar y configurar

```bash
git clone https://github.com/tu-usuario/hotel-humboldt-framework.git
cd hotel-humboldt-framework
npm install
```

### 2. Variables de entorno

Copia `env.example.txt` a `.env.local` y configura:

```bash
cp env.example.txt .env.local
```

**Configuración mínima:**
```env
# Admin (sin base de datos)
ADMIN_USERNAME_ACCESS=admin
ADMIN_PASSWORD_ACCESS=tu_password_segura

# Redis (Upstash gratuito)
UPSTASH_REDIS_REST_URL=https://tu-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=tu_token

# Storage (opcional - usa local si no tienes S3)
AWS_ACCESS_KEY_ID=tu_key
AWS_SECRET_ACCESS_KEY=tu_secret
AWS_S3_BUCKET=tu-bucket
```

### 3. Iniciar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y ve a `/admin` para crear tu primer mundo.

## 🎨 Crear tu Primer Mundo

1. **Accede al editor**: `http://localhost:3000/admin`
2. **Sube modelos 3D**: Arrastra archivos `.glb` al editor
3. **Construye tu mundo**: Drag & drop de assets en la escena 3D
4. **Guarda**: Tu mundo se guarda como JSON en `/worlds/`
5. **¡Juega!**: Los jugadores pueden conectarse y explorar tu mundo

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Storage       │
│   (Next.js)     │◄──►│   (Colyseus)    │◄──►│   (Redis + S3)  │
│   + Three.js    │    │   + WebSocket   │    │   + JSON        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Frontend**: Next.js + Three.js + react-three-fiber
- **Backend**: Colyseus (WebSocket) + Next.js API
- **Storage**: Redis (jugadores) + S3 (assets) + JSON (mundos)
- **Deploy**: Railway/Render/Fly.io (un solo servicio)

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [📖 Framework Vision](./docs/FRAMEWORK_VISION.md) | Visión completa, arquitectura y roadmap |
| [🚀 Deployment Guide](./docs/DEPLOYMENT_AND_FRAMEWORK.md) | Guía de despliegue y configuración |
| [⚡ Optimización de Modelos](./docs/OPTIMIZACION_MODELOS.md) | Mejores prácticas para assets 3D |
| [📚 Índice de Documentación](./docs/README.md) | Navegación completa de la documentación |

## 🎮 Características del Juego

### Sistema de Jugadores
- Movimiento WASD + mouse
- Animaciones dinámicas (idle, walking, running, jumping)
- Sistema de salud y stamina
- Física realista con Cannon.js
- Cámara en tercera persona

### Mundo 3D
- Terreno procedural
- Decoraciones de naturaleza
- Iluminación dinámica
- Skybox personalizable
- Colisiones inteligentes

### Multijugador
- Sincronización en tiempo real
- Chat global
- LOD (Level of Detail) automático
- Heartbeat para conexiones estables
- Limpieza automática de jugadores inactivos

## ⚙️ Configuración Avanzada

### humboldt.config.ts
```typescript
export default {
  server: {
    maxPlayers: 50,
    tickRate: 60,
  },
  gameplay: {
    hasHealth: true,
    hasStamina: true,
    hasCombat: false,
  },
  physics: {
    gravity: -9.8,
    playerSpeed: 5,
    runSpeed: 8,
  },
  characters: {
    animations: ['idle', 'walking', 'running', 'jumping'],
  },
}
```

### Variables de Entorno
Ver [env.example.txt](./env.example.txt) para todas las opciones disponibles.

### Documentación Completa
- 📚 [Índice de Documentación](./docs/README.md) - Navegación completa
- 📖 [Framework Vision](./docs/FRAMEWORK_VISION.md) - Visión y arquitectura
- 🚀 [Deployment Guide](./docs/DEPLOYMENT_AND_FRAMEWORK.md) - Guía de despliegue
- ⚡ [Optimización de Modelos](./docs/OPTIMIZACION_MODELOS.md) - Mejores prácticas

## 🚢 Deploy a Producción

### Railway (Recomendado)
1. Conecta tu repo a Railway
2. Configura las variables de entorno
3. Deploy automático

### Render
1. Crea un nuevo Web Service
2. Conecta tu repo
3. Configura build command: `npm run build`
4. Configura start command: `npm run start`

### Fly.io
1. `flyctl launch`
2. Configura variables de entorno
3. `flyctl deploy`

> **⚠️ No compatible con Vercel** - Requiere WebSockets persistentes

## 🛠️ Desarrollo

### Estructura del Proyecto
```
src/
├── core/           # Framework core
├── modules/        # Sistemas del juego
├── admin/          # Panel de administración
├── shared/         # Tipos compartidos
└── app/           # Rutas de Next.js

server/
├── combined.ts    # Servidor unificado
└── rooms/         # Salas de Colyseus

worlds/            # Mundos guardados (JSON)
public/models/     # Assets 3D
```

### Scripts Disponibles
```bash
npm run dev        # Desarrollo (Next + Colyseus)
npm run build      # Build de producción
npm run start      # Servidor unificado
npm run lint       # Linting
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) - Framework React
- [Three.js](https://threejs.org/) - Biblioteca 3D
- [Colyseus](https://colyseus.io/) - Multiplayer framework
- [react-three-fiber](https://github.com/pmndrs/react-three-fiber) - React renderer para Three.js
- [Cannon.js](https://github.com/schteppe/cannon.js/) - Motor de física

## 📞 Soporte

- 📚 [Documentación completa](./docs/README.md)
- 🐛 [Reportar bugs](https://github.com/tu-usuario/hotel-humboldt-framework/issues)
- 💬 [Discord](https://discord.gg/tu-servidor) (próximamente)
- 📧 [Email](mailto:support@hotel-humboldt.dev)

---

**¿Te gusta el proyecto?** ⭐ ¡Dale una estrella en GitHub!

**¿Quieres contribuir?** 🚀 ¡Las contribuciones son bienvenidas!

**¿Tienes preguntas?** 💬 ¡Abre un issue o únete a la comunidad!
