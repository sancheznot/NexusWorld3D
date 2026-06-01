# Scale Reference Guide

## Problem
Different 3D models come with different scales from their original export:
- Tree models from the project: scale 0.01
- Buildings from CartoonCity GLB: scale 1.0
- Cars from the project: scale 1.0
- Roads from CartoonCity: scale 1.0

## Correct Scale Values

| Asset Type | Source | Scale | Notes |
|------------|--------|-------|-------|
| Trees (project) | public/models/terrain/trees/*.glb | 0.008 | ~4.6 units tall |
| Buildings | CartoonCity GLB exports | 1.0 | Original size |
| Cars | public/models/vehicles/*.glb | 1.0 | ~3.2 units long |
| Roads | CartoonCity Road/*.glb | 1.0 | 6x6 tile |

## Proportions (working)
- Tree (~4.6) : House (~6.3) : Car (~3.2) = correct ratio
- Road tile is 6x6 units

## How to Apply
```python
# For tree models from project:
tree.scale = (0.008, 0.008, 0.008)

# For buildings/cars/roads:
obj.scale = (1.0, 1.0, 1.0)
```

## Map Dimensions
- Map size: 1000x1000 units
- Player should be ~1.7-2.0 units tall (to match car proportions)
