# 🌍 NexusWorld3D Framework

> **An open-source framework for creating 3D and 2D multiplayer worlds without Blender or advanced programming**

> **Un framework open-source para crear mundos 3D y 2D multijugador sin necesidad de Blender o programación avanzada**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black)](https://nextjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.180.0-000000)](https://threejs.org/)
[![Colyseus](https://img.shields.io/badge/Colyseus-0.16.5-FF6B6B)](https://colyseus.io/)

---

## 🌐 Language / Idioma

- 🇺🇸 **[English Documentation](./docs/en/README.md)** - Complete documentation in English
- 🇪🇸 **[Documentación en Español](./docs/es/README.md)** - Documentación completa en español

---

## ✨ Features / Características

- 🎮 **Real-time Multiplayer** / **Multijugador en tiempo real** - Up to 50 simultaneous players / Hasta 50 jugadores simultáneos
- 🏞️ **Multi-Mode Support** / **Soporte Multi-Modo** - Create 3D open worlds or 2.5D side-scrollers / Crea mundos 3D abiertos o 2.5D side-scrollers
- 🎨 **Visual World Editor** / **Editor visual de mundos** - Drag & drop 3D models in browser / Drag & drop de modelos 3D en el navegador
- ⚡ **No Database Required** / **Sin base de datos** - Everything in Redis + S3 + JSON files / Todo en Redis + S3 + archivos JSON
- 🔧 **Highly Configurable** / **Altamente configurable** - Health, stamina, physics, animations, etc. / Vida, stamina, física, animaciones, etc.
- 🚀 **Easy Deploy** / **Deploy fácil** - Railway, Render, Fly.io (WebSocket compatible) / Railway, Render, Fly.io (compatible con WebSockets)
- 📦 **Smart Asset Management** / **Gestión inteligente de assets** - Upload to S3 + optional CDN / Upload a S3 + CDN opcional
- 🛡️ **Admin Panel** / **Panel de admin** - No database, just environment variables / Sin base de datos, solo variables de entorno
- 🌐 **Open Source** / **Open source** - MIT License, active community / Licencia MIT, comunidad activa

## 🚀 Quick Start / Inicio Rápido

### 1. Clone and Setup / Clonar y configurar

```bash
git clone https://github.com/tu-usuario/nexusworld3d-framework.git
cd nexusworld3d-framework
npm install
```

### 2. Environment Variables / Variables de entorno

Copy `env.example.txt` to `.env.local` and configure:

```bash
cp env.example.txt .env.local
```

**Minimum configuration / Configuración mínima:**

```env
# Admin (no database / sin base de datos)
ADMIN_USERNAME_ACCESS=admin
ADMIN_PASSWORD_ACCESS=your_secure_password

# Redis (Upstash free / Upstash gratuito)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Storage (optional - uses local if no S3 / opcional - usa local si no tienes S3)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your-bucket
```

### 3. Start Development / Iniciar desarrollo

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and go to `/admin` to create your first world.

Abre [http://localhost:3000](http://localhost:3000) y ve a `/admin` para crear tu primer mundo.

## 🎨 Create Your First World / Crear tu Primer Mundo

1. **Access the editor** / **Accede al editor**: `http://localhost:3000/admin`
2. **Upload 3D models** / **Sube modelos 3D**: Drag `.glb` files to the editor / Arrastra archivos `.glb` al editor
3. **Build your world** / **Construye tu mundo**: Drag & drop assets into the 3D scene / Drag & drop de assets en la escena 3D
4. **Save** / **Guarda**: Your world is saved as JSON in `/worlds/` / Tu mundo se guarda como JSON en `/worlds/`
5. **Play!** / **¡Juega!**: Players can connect and explore your world / Los jugadores pueden conectarse y explorar tu mundo

## 🏗️ Architecture / Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Storage       │
│   (Next.js)     │◄──►│   (Colyseus)    │◄──►│   (Redis + S3)  │
│   + Three.js    │    │   + WebSocket   │    │   + JSON        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

- **Frontend**: Next.js + Three.js + react-three-fiber
- **Backend**: Colyseus (WebSocket) + Next.js API
- **Storage**: Redis (players) + S3 (assets) + JSON (worlds)
- **Deploy**: Railway/Render/Fly.io (single service)

## 📚 Documentation / Documentación

| Document                                                          | Descripción                               |
| ----------------------------------------------------------------- | ----------------------------------------- |
| [📖 Framework Vision (EN)](./docs/en/FRAMEWORK_VISION.md)         | Complete vision, architecture and roadmap |
| [📖 Framework Vision (ES)](./docs/es/FRAMEWORK_VISION.md)         | Visión completa, arquitectura y roadmap   |
| [🚀 Deployment Guide (EN)](./docs/en/DEPLOYMENT_GUIDE.md)         | Deployment and configuration guide        |
| [🚀 Deployment Guide (ES)](./docs/es/DEPLOYMENT_AND_FRAMEWORK.md) | Guía de despliegue y configuración        |
| [⚡ Model Optimization (EN)](./docs/en/MODEL_OPTIMIZATION.md)     | Best practices for 3D assets              |
| [⚡ Model Optimization (ES)](./docs/es/OPTIMIZACION_MODELOS.md)   | Mejores prácticas para assets 3D          |
| [📚 Documentation Index (EN)](./docs/en/README.md)                | Complete documentation navigation         |
| [📚 Documentation Index (ES)](./docs/es/README.md)                | Navegación completa de la documentación   |

## 🎮 Game Features / Características del Juego

### Player System / Sistema de Jugadores

- WASD movement + mouse / Movimiento WASD + mouse
- Dynamic animations (idle, walking, running, jumping) / Animaciones dinámicas (idle, walking, running, jumping)
- Health and stamina system / Sistema de salud y stamina
- Realistic physics with Cannon.js / Física realista con Cannon.js
- Third-person camera / Cámara en tercera persona

### 3D World / Mundo 3D

- Procedural terrain / Terreno procedural
- Nature decorations / Decoraciones de naturaleza
- Dynamic lighting / Iluminación dinámica
- Customizable skybox / Skybox personalizable
- Smart collisions / Colisiones inteligentes

### Multiplayer / Multijugador

- Real-time synchronization / Sincronización en tiempo real
- Global chat / Chat global
- Automatic LOD (Level of Detail) / LOD (Level of Detail) automático
- Heartbeat for stable connections / Heartbeat para conexiones estables
- Automatic cleanup of inactive players / Limpieza automática de jugadores inactivos

## ⚙️ Advanced Configuration / Configuración Avanzada

### nexusworld3d.config.ts

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
    animations: ["idle", "walking", "running", "jumping"],
  },
};
```

### Environment Variables / Variables de Entorno

See [env.example.txt](./env.example.txt) for all available options.

Ver [env.example.txt](./env.example.txt) para todas las opciones disponibles.

## 🚢 Deploy to Production / Deploy a Producción

### Railway (Recommended / Recomendado)

1. Connect your repo to Railway / Conecta tu repo a Railway
2. Configure environment variables / Configura las variables de entorno
3. Automatic deploy / Deploy automático

### Render

1. Create a new Web Service / Crea un nuevo Web Service
2. Connect your repo / Conecta tu repo
3. Configure build command: `npm run build`
4. Configure start command: `npm run start`

### Fly.io

1. `flyctl launch`
2. Configure environment variables / Configura las variables de entorno
3. `flyctl deploy`

> **⚠️ Not compatible with Vercel** - Requires persistent WebSockets
> **⚠️ No compatible con Vercel** - Requiere WebSockets persistentes

## 🛠️ Development / Desarrollo

### Project Structure / Estructura del Proyecto

```
src/
├── core/           # Framework core / Core del framework
├── modules/        # Game systems / Sistemas del juego
├── admin/          # Administration panel / Panel de administración
├── shared/         # Shared types / Tipos compartidos
└── app/           # Next.js routes / Rutas de Next.js

server/
├── combined.ts    # Unified server / Servidor unificado
└── rooms/         # Colyseus rooms / Salas de Colyseus

worlds/            # Saved worlds (JSON) / Mundos guardados (JSON)
public/models/     # 3D assets / Assets 3D
```

### Available Scripts / Scripts Disponibles

```bash
npm run dev        # Development (Next + Colyseus) / Desarrollo (Next + Colyseus)
npm run build      # Production build / Build de producción
npm run start      # Unified server / Servidor unificado
npm run lint       # Linting / Linting
```

## 🤝 Contributing / Contribuir

1. Fork the project / Fork el proyecto
2. Create a branch: `git checkout -b feature/new-feature` / Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Add new feature'` / Commit: `git commit -m 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/new-feature` / Push: `git push origin feature/nueva-funcionalidad`
5. Open a Pull Request / Abre un Pull Request

## 📄 License / Licencia

This project is under the MIT License. See [LICENSE](LICENSE) for more details.

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🙏 Acknowledgments / Agradecimientos

- [Next.js](https://nextjs.org/) - React framework
- [Three.js](https://threejs.org/) - 3D library
- [Colyseus](https://colyseus.io/) - Multiplayer framework
- [react-three-fiber](https://github.com/pmndrs/react-three-fiber) - React renderer for Three.js
- [Cannon.js](https://github.com/schteppe/cannon.js/) - Physics engine

## 📞 Support / Soporte

- 📚 [Complete Documentation (EN)](./docs/en/README.md) / [Documentación Completa (ES)](./docs/es/README.md)
- 🐛 [Report bugs](https://github.com/tu-usuario/nexusworld3d-framework/issues) / [Reportar bugs](https://github.com/tu-usuario/nexusworld3d-framework/issues)
- 💬 [Discord](https://discord.gg/tu-servidor) (coming soon / próximamente)
- 📧 [Email](mailto:support@nexusworld3d.dev)

---

**Do you like the project?** ⭐ **Give it a star on GitHub!**

**¿Te gusta el proyecto?** ⭐ **¡Dale una estrella en GitHub!**

**Want to contribute?** 🚀 **Contributions are welcome!**

**¿Quieres contribuir?** 🚀 **¡Las contribuciones son bienvenidas!**

**Have questions?** 💬 **Open an issue or join the community!**

**¿Tienes preguntas?** 💬 **¡Abre un issue o únete a la comunidad!**
