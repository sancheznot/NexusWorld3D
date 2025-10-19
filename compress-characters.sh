#!/bin/bash

# Script para comprimir modelos de personajes con Draco
# Requiere: npm install -g gltf-pipeline

echo "🔧 Comprimiendo modelos de personajes con Draco..."
echo ""

# Directorios
MEN_DIR="public/models/characters/men"
WOMEN_DIR="public/models/characters/women"

# Función para comprimir un modelo
compress_model() {
    local input=$1
    local output=$2
    local filename=$(basename "$input")
    
    echo "📦 Comprimiendo: $filename"
    echo "   Tamaño original: $(du -h "$input" | cut -f1)"
    
    # Comprimir con Draco (nivel máximo)
    gltf-pipeline -i "$input" -o "$output" -d --draco.compressionLevel 10
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Tamaño comprimido: $(du -h "$output" | cut -f1)"
        echo ""
    else
        echo "   ❌ Error al comprimir"
        echo ""
    fi
}

# Comprimir modelos de hombres
echo "👨 Comprimiendo modelos masculinos..."
if [ -d "$MEN_DIR" ]; then
    for file in "$MEN_DIR"/*.glb; do
        if [ -f "$file" ]; then
            filename=$(basename "$file" .glb)
            compress_model "$file" "$MEN_DIR/${filename}_compressed.glb"
        fi
    done
else
    echo "⚠️  Directorio no encontrado: $MEN_DIR"
fi

echo ""

# Comprimir modelos de mujeres
echo "👩 Comprimiendo modelos femeninos..."
if [ -d "$WOMEN_DIR" ]; then
    for file in "$WOMEN_DIR"/*.glb; do
        if [ -f "$file" ]; then
            filename=$(basename "$file" .glb)
            compress_model "$file" "$WOMEN_DIR/${filename}_compressed.glb"
        fi
    done
else
    echo "⚠️  Directorio no encontrado: $WOMEN_DIR"
fi

echo ""
echo "✨ Compresión completada!"
echo ""
echo "📊 Resumen de tamaños:"
echo "Modelos originales:"
find public/models/characters -name "*.glb" ! -name "*_compressed.glb" -exec du -h {} \;
echo ""
echo "Modelos comprimidos:"
find public/models/characters -name "*_compressed.glb" -exec du -h {} \;
echo ""
echo "💡 Para usar los modelos comprimidos, renombra los archivos:"
echo "   cd public/models/characters/men"
echo "   mv men_Idle.glb men_Idle_original.glb"
echo "   mv men_Idle_compressed.glb men_Idle.glb"
echo "   (repetir para cada modelo)"

