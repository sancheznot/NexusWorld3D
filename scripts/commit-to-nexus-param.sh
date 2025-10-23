#!/bin/bash

# Script para commit a Nexus con mensaje dinámico
# Uso: bash scripts/commit-to-nexus-param.sh "tu mensaje de commit"

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar un mensaje de commit"
    echo "💡 Uso: bash scripts/commit-to-nexus-param.sh \"tu mensaje de commit\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "🚀 Preparando commit para Nexus (sin modelos)..."
echo "📝 Mensaje: $COMMIT_MESSAGE"

# Paso 1: Cambiar al remote de Nexus
echo "📡 Cambiando remote a Nexus..."
git remote set-url origin git@github.com:sancheznot/NexusWorld3D.git

# Paso 2: Sincronizar .gitignore de Nexus
echo "🔄 Sincronizando .gitignore para Nexus..."
bash scripts/sync-gitignore.sh

# Paso 3: Agregar todos los archivos
echo "📁 Agregando archivos al staging..."
git add .

# Paso 4: Hacer commit
echo "💾 Haciendo commit..."
git commit -m "$COMMIT_MESSAGE"

# Paso 5: Hacer push
echo "🚀 Haciendo push a Nexus..."
git push origin main

echo ""
echo "✅ COMMIT COMPLETADO EN NEXUS!"
echo "🔄 Para volver al Hotel: bash scripts/commit-to-hotel-param.sh \"mensaje\""
