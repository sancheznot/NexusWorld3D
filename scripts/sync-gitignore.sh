#!/bin/bash

# Script para sincronizar .gitignore según el remote activo

REMOTE_URL=$(git remote get-url origin)

if [[ $REMOTE_URL == *"NexusWorld3D"* ]]; then
    echo "🔄 Usando .gitignore para NexusWorld3D (template)"
    cp .gitignore-nexus .gitignore
elif [[ $REMOTE_URL == *"hotel-humbolt"* ]]; then
    echo "🔄 Usando .gitignore para Hotel Humboldt (desarrollo)"
    cp .gitignore-hotel .gitignore
else
    echo "⚠️  Remote no reconocido: $REMOTE_URL"
    echo "Usando .gitignore por defecto"
fi

echo "✅ .gitignore sincronizado"
