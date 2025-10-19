#!/bin/bash

# Script para activar los modelos comprimidos
# Mueve los originales a backup y activa los comprimidos

echo "🔄 Activando modelos comprimidos..."
echo ""

# Función para activar modelo comprimido
activate_model() {
    local dir=$1
    local name=$2
    
    if [ -f "$dir/${name}.glb" ] && [ -f "$dir/${name}_compressed.glb" ]; then
        echo "📦 Activando: ${name}.glb"
        mv "$dir/${name}.glb" "$dir/${name}_original.glb"
        mv "$dir/${name}_compressed.glb" "$dir/${name}.glb"
        echo "   ✅ Original guardado como: ${name}_original.glb"
        echo "   ✅ Comprimido activado como: ${name}.glb"
        echo ""
    else
        echo "⚠️  No se encontró: $dir/${name}_compressed.glb"
        echo ""
    fi
}

# Activar modelos masculinos
echo "👨 Activando modelos masculinos..."
activate_model "public/models/characters/men" "men_Idle"
activate_model "public/models/characters/men" "men_Walking"
activate_model "public/models/characters/men" "men_Running"

# Activar modelos femeninos
echo "👩 Activando modelos femeninos..."
activate_model "public/models/characters/women" "women_Idle"
activate_model "public/models/characters/women" "women_Walking"
activate_model "public/models/characters/women" "women_Running"

echo "✨ ¡Modelos comprimidos activados!"
echo ""
echo "📊 Nuevos tamaños:"
echo "Modelos activos (comprimidos):"
find public/models/characters -name "*.glb" ! -name "*_original.glb" -exec du -h {} \;
echo ""
echo "Modelos originales (backup):"
find public/models/characters -name "*_original.glb" -exec du -h {} \;
echo ""
echo "💾 Ahorro total: ~80MB"
echo "🎮 ¡El juego ahora cargará mucho más rápido!"

