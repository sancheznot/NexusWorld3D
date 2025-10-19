# Hotel Humboldt - Railway Deployment

## 🚀 Configuración para Railway

### Variables de Entorno Requeridas

```bash
# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here

# Socket.IO Server
NEXT_PUBLIC_SOCKET_URL=https://your-app.railway.app
SOCKET_PORT=3001

# Game Configuration
NEXT_PUBLIC_GAME_NAME=Hotel Humboldt
NEXT_PUBLIC_MAX_PLAYERS=50
NEXT_PUBLIC_WORLD_SIZE=1000

# Railway
PORT=3001
NODE_ENV=production
```

### Pasos para Deploy

1. **Crear cuenta en Railway**
   - Ir a [railway.app](https://railway.app)
   - Conectar con GitHub

2. **Crear proyecto en Railway**
   - New Project → Deploy from GitHub repo
   - Seleccionar este repositorio

3. **Configurar Redis**
   - Add Service → Database → Redis
   - O usar Upstash Redis externo

4. **Configurar Variables de Entorno**
   - Settings → Variables
   - Agregar todas las variables de arriba

5. **Deploy**
   - Railway detectará automáticamente el proyecto
   - Usará el `railway.json` para configuración

### Estructura del Proyecto

```
hotel-humboldt/
├── server/           # Socket.IO server
├── src/             # Next.js client
├── public/          # Assets estáticos
├── railway.json     # Configuración Railway
├── Procfile         # Comando de inicio
├── Dockerfile       # Docker config
└── package.json     # Dependencias
```

### Comandos Disponibles

```bash
# Desarrollo local
npm run dev:all      # Cliente + Servidor

# Producción
npm run start:all    # Cliente + Servidor
npm run build        # Build del cliente
```

### Puertos

- **3000**: Next.js client (desarrollo)
- **3001**: Socket.IO server (producción)
- **Railway**: Puerto dinámico asignado

### Redis

- **Desarrollo**: Upstash Redis (gratis)
- **Producción**: Railway Redis o Upstash

### Monitoreo

- Railway Dashboard para logs
- Redis Dashboard para datos
- Socket.IO logs en Railway
