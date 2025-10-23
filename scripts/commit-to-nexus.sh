#!/bin/bash

# Script para preparar commit a Nexus (sin modelos)
# Ejecuta: bash scripts/commit-to-nexus.sh

echo "🚀 Preparando commit para Nexus (sin modelos)..."

# Paso 1: Cambiar al remote de Nexus
echo "📡 Cambiando remote a Nexus..."
git remote set-url origin git@github.com:sancheznot/NexusWorld3D.git

# Paso 2: Sincronizar .gitignore de Nexus
echo "🔄 Sincronizando .gitignore para Nexus..."
bash scripts/sync-gitignore.sh

# Paso 3: Agregar todos los archivos
echo "📁 Agregando archivos al staging..."
git add .

# Paso 4: Mostrar status
echo "📊 Estado actual:"
git status

echo ""
echo "✅ LISTO PARA COMMIT!"
echo "💡 Ahora puedes hacer:"
echo "   git commit -m 'tu mensaje de commit'"
echo "   git push origin main"
echo ""
echo "🔄 Para volver al Hotel después del commit:"
echo "   bash scripts/commit-to-hotel.sh"
