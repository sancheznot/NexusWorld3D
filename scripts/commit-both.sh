#!/bin/bash

# Script para hacer commit automático a ambos repositorios
# Uso: bash scripts/commit-both.sh "tu mensaje de commit"

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar un mensaje de commit"
    echo "💡 Uso: bash scripts/commit-both.sh \"tu mensaje de commit\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "🚀 INICIANDO COMMIT AUTOMÁTICO A AMBOS REPOSITORIOS"
echo "📝 Mensaje: $COMMIT_MESSAGE"
echo ""

# Guardar el remote original
ORIGINAL_REMOTE=$(git remote get-url origin)
echo "📡 Remote original: $ORIGINAL_REMOTE"

# ===== FASE 1: NEXUS =====
echo "🔄 FASE 1: COMMIT A NEXUS (sin modelos)"
echo "=========================================="

# Cambiar al remote de Nexus
echo "📡 Cambiando remote a Nexus..."
git remote set-url origin git@github.com:sancheznot/NexusWorld3D.git

# Sincronizar .gitignore de Nexus
echo "🔄 Sincronizando .gitignore para Nexus..."
bash scripts/sync-gitignore.sh

# Agregar archivos
echo "📁 Agregando archivos al staging..."
git add .

# Commit a Nexus
echo "💾 Haciendo commit a Nexus..."
git commit -m "$COMMIT_MESSAGE"

# Push a Nexus
echo "🚀 Haciendo push a Nexus..."
git push origin main

echo "✅ NEXUS COMPLETADO!"
echo ""

# ===== FASE 2: HOTEL =====
echo "🔄 FASE 2: COMMIT AL HOTEL (con modelos)"
echo "=========================================="

# Cambiar al remote del Hotel
echo "📡 Cambiando remote al Hotel..."
git remote set-url origin git@github.com:sancheznot/hotel-humbolt.git

# Sincronizar .gitignore del Hotel
echo "🔄 Sincronizando .gitignore para Hotel..."
bash scripts/sync-gitignore.sh

# Restaurar los modelos que fueron removidos en Nexus
echo "🔄 Restaurando modelos para Hotel..."
git checkout HEAD~1 -- public/models/city.glb public/models/car-wash.glb public/models/hotel_humboldt_model.glb public/models/Green_Dome_Structure.glb 2>/dev/null || echo "⚠️ Algunos modelos no se pudieron restaurar (normal si es la primera vez)"

# Agregar archivos
echo "📁 Agregando archivos al staging..."
git add .

# Commit al Hotel
echo "💾 Haciendo commit al Hotel..."
git commit -m "$COMMIT_MESSAGE"

# Push al Hotel
echo "🚀 Haciendo push al Hotel..."
git push origin main

echo "✅ HOTEL COMPLETADO!"
echo ""

# ===== RESUMEN =====
echo "🎉 ¡COMMIT COMPLETADO EN AMBOS REPOSITORIOS!"
echo "📊 Resumen:"
echo "   ✅ Nexus (template): Sin modelos"
echo "   ✅ Hotel (desarrollo): Con modelos"
echo "   📝 Mensaje: $COMMIT_MESSAGE"
echo ""
echo "🔄 Para commits individuales:"
echo "   bash scripts/commit-to-nexus-param.sh \"mensaje\""
echo "   bash scripts/commit-to-hotel-param.sh \"mensaje\""

# Restaurar el remote original
echo ""
echo "🔄 Restaurando remote original..."
git remote set-url origin "$ORIGINAL_REMOTE"
echo "✅ Remote restaurado a: $ORIGINAL_REMOTE"
