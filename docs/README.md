# 📚 Documentación del Hotel Humboldt Framework

Bienvenido a la documentación completa del framework Hotel Humboldt. Aquí encontrarás todo lo necesario para entender, configurar y extender el framework.

## 📖 Documentos Disponibles

### 🎯 [Framework Vision](./FRAMEWORK_VISION.md)
**Visión completa y roadmap del framework**
- Objetivo principal y propuesta de valor
- Arquitectura detallada del framework
- Sistema de configuración central (`humboldt.config.ts`)
- Editor de mundos y gestión de assets
- Sistema de storage (S3 + CDN + temp/persistent)
- Panel de administración sin base de datos
- Animaciones dinámicas y configurables
- Roadmap de implementación en 6 fases
- Consideraciones técnicas y contribuciones futuras

### 🚀 [Deployment Guide](./DEPLOYMENT_AND_FRAMEWORK.md)
**Guía de despliegue y configuración actual**
- Servidor unificado (Next.js + Colyseus)
- Configuración para Railway, Render, Fly.io
- Variables de entorno y Docker
- Limpieza de código legacy (Socket.IO)
- Políticas de runtime (multiplayer)
- Roadmap para framework "build-on-it"

### ⚡ [Optimización de Modelos](./OPTIMIZACION_MODELOS.md)
**Mejores prácticas para assets 3D**
- Compresión de modelos GLB
- Optimización de texturas
- LOD (Level of Detail) automático
- Instancing para objetos repetidos
- Gestión de memoria y performance
- Herramientas recomendadas

## 🚀 Inicio Rápido

1. **Lee la [Framework Vision](./FRAMEWORK_VISION.md)** para entender el proyecto completo
2. **Sigue el [Deployment Guide](./DEPLOYMENT_AND_FRAMEWORK.md)** para configurar tu entorno
3. **Consulta [Optimización de Modelos](./OPTIMIZACION_MODELOS.md)** para mejores prácticas con assets 3D

## 🎯 Estado Actual

- ✅ **Multiplayer funcional** - Sistema de jugadores sincronizado en tiempo real
- ✅ **Deploy en Railway** - Servidor unificado funcionando en producción
- ✅ **Arquitectura base** - Next.js + Colyseus + Redis + S3
- 🚧 **En desarrollo** - Editor de mundos y sistema de configuración central

## 🛠️ Próximos Pasos

1. **Sistema de configuración central** (`humboldt.config.ts`)
2. **Editor de mundos visual** (drag & drop + save/load JSON)
3. **Gestión inteligente de assets** (temp → persistent → S3)
4. **Panel de administración** (sin base de datos)
5. **Animaciones dinámicas** (quitar hardcoding)

## 🤝 Contribuir

¿Quieres contribuir al framework? Revisa la [Framework Vision](./FRAMEWORK_VISION.md) para ver el roadmap completo y las áreas donde puedes ayudar.

## 📞 Soporte

- 🐛 [Reportar bugs](https://github.com/tu-usuario/hotel-humboldt-framework/issues)
- 💬 [Discord](https://discord.gg/tu-servidor) (próximamente)
- 📧 [Email](mailto:support@hotel-humboldt.dev)

---

**Última actualización**: Diciembre 2024
