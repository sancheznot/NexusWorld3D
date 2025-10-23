#!/bin/bash

# Script para preparar commit al Hotel (con modelos)
# Ejecuta: bash scripts/commit-to-hotel.sh

echo "🏨 Preparando commit para Hotel Humboldt (con modelos)..."

# Paso 1: Cambiar al remote del Hotel
echo "📡 Cambiando remote al Hotel..."
git remote set-url origin git@github.com:sancheznot/hotel-humbolt.git

# Paso 2: Sincronizar .gitignore del Hotel
echo "🔄 Sincronizando .gitignore para Hotel..."
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
echo "🔄 Para volver a Nexus después del commit:"
echo "   bash scripts/commit-to-nexus.sh"
