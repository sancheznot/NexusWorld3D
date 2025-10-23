#!/bin/bash

# Script para commit al Hotel con mensaje dinámico
# Uso: bash scripts/commit-to-hotel-param.sh "tu mensaje de commit"

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar un mensaje de commit"
    echo "💡 Uso: bash scripts/commit-to-hotel-param.sh \"tu mensaje de commit\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "🏨 Preparando commit para Hotel Humboldt (con modelos)..."
echo "📝 Mensaje: $COMMIT_MESSAGE"

# Paso 1: Cambiar al remote del Hotel
echo "📡 Cambiando remote al Hotel..."
git remote set-url origin git@github.com:sancheznot/hotel-humbolt.git

# Paso 2: Sincronizar .gitignore del Hotel
echo "🔄 Sincronizando .gitignore para Hotel..."
bash scripts/sync-gitignore.sh

# Paso 3: Agregar todos los archivos
echo "📁 Agregando archivos al staging..."
git add .

# Paso 4: Hacer commit
echo "💾 Haciendo commit..."
git commit -m "$COMMIT_MESSAGE"

# Paso 5: Hacer push
echo "🚀 Haciendo push al Hotel..."
git push origin main

echo ""
echo "✅ COMMIT COMPLETADO EN HOTEL!"
echo "🔄 Para volver a Nexus: bash scripts/commit-to-nexus-param.sh \"mensaje\""
