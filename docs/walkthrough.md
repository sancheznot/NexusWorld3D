# Trucker Job Implementation Walkthrough

## Overview

We have refactored the job system to support decentralized jobs, specifically implementing the "Trucker" role. The job is now acquired at a specific location (Trucker Base) and follows a defined route.

## Changes

1.  **Job Definition (`src/constants/jobs.ts`)**:

    - Added `trucker` job configuration.
    - Defined a specific `start` location at `{ x: 60, y: 1, z: 60 }`.
    - Defined a 4-step route:
      1.  **Load Point (A)**: `{ x: 70, y: 1, z: 50 }`
      2.  **Unload Point (B)**: `{ x: -20, y: 1, z: -20 }`
      3.  **Reload Point (C)**: `{ x: -30, y: 1, z: 30 }`
      4.  **Return to Base**: `{ x: 60, y: 1, z: 60 }`
    - Added `trucker` to `ExtendedJobId` type.

2.  **NPC Configuration (`src/constants/npcs.ts`)**:
    - Added `npc_trucker_boss` at `{ x: 60, y: 1, z: 60 }`.
    - This NPC allows the player to take the `trucker` job.
    - Updated `NPCId` type.

## Verification Steps

### 1. Acquire the Job

1.  Travel to the **Trucker Base** at coordinates `X: 60, Z: 60`.
2.  Look for the **Jefe de Camioneros** NPC (using the `men_Idle` model).
3.  Interact with the NPC (press interaction key, usually 'E' or click).
4.  In the Job Menu, select **"Asignar rol"** for "Camionero Profesional".
5.  Verify the UI shows "Rol actual: Camionero Profesional".

### 2. Start the Route

1.  Ensure you are in a vehicle (press 'F' near a vehicle).
    - _Note: If no vehicle is nearby, you may need to bring one or use a spawn command if available._
2.  Drive to the **"Iniciar Ruta de Carga"** checkpoint at the Trucker Base (`60, 1, 60`).
3.  Interact to start the job.

### 3. Complete the Route

1.  Follow the waypoints:
    - **Waypoint 1**: Go to `70, 50` to "Cargar Mercancía". Wait 15 seconds.
    - **Waypoint 2**: Drive to `-20, -20` to "Descargar". Wait 15 seconds.
    - **Waypoint 3**: Drive to `-30, 30` to "Recargar". Wait 15 seconds.
    - **Waypoint 4**: Return to `60, 60` to "Entregar y Finalizar".
2.  Upon completion, verify you receive the payment (Base Pay + Bonuses).

## Notes

- The system requires the player to be in a vehicle to start the route.
- The route is timed (20 minutes limit).
- **Fix Implemented**: Player position is now synchronized with the vehicle while driving, ensuring the map and server see the correct location.
