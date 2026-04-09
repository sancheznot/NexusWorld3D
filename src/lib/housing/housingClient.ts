import {
  type BuildPieceId,
  snapBuildRotY,
  snapBuildXZ,
} from "@/constants/buildPieces";
import type { HousingUpgradeMode } from "@/constants/housingTiers";
import { FarmMessages, HousingMessages } from "@nexusworld3d/protocol";
import { colyseusClient } from "@/lib/colyseus/client";
import { useGameWorldStore } from "@/store/gameWorldStore";
import { usePlayerStore } from "@/store/playerStore";

const DEFAULT_PLOT = "exterior_lot_a1";

export function requestHousingSync(mapId?: string): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  const mid = mapId ?? useGameWorldStore.getState().activeMapId;
  room.send(HousingMessages.Request, { mapId: mid });
}

export function purchaseHousingPlot(plotId: string = DEFAULT_PLOT): void {
  colyseusClient.getSocket()?.send(HousingMessages.Purchase, { plotId });
}

export function devGrantHousingPlot(plotId: string = DEFAULT_PLOT): void {
  colyseusClient.getSocket()?.send(HousingMessages.DevGrantPlot, { plotId });
}

export function placeCabinAtPlayerPosition(): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  const pos = usePlayerStore.getState().position;
  const mapId = useGameWorldStore.getState().activeMapId;
  const rotY = usePlayerStore.getState().rotation.y;
  const dist = 3.5;
  const x = pos.x + Math.sin(rotY) * dist;
  const z = pos.z + Math.cos(rotY) * dist;
  room.send(HousingMessages.Place, {
    mapId,
    x,
    y: pos.y,
    z,
    rotY,
  });
}

/**
 * ES: Mejora la cabaña tuya más cercana (≤8 m en servidor). EN: Upgrade nearest owned cabin.
 */
export function upgradeNearestCabin(mode: HousingUpgradeMode): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  room.send(HousingMessages.Upgrade, { nearest: true, mode });
}

const BUILD_PLACE_DIST = 2.8;

/** ES: Pose snapeada frente al jugador (misma lógica que colocación). EN: Snapped pose ahead of player. */
export function getBuildPlacementPreviewPose(): {
  mapId: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
} | null {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return null;
  const pos = usePlayerStore.getState().position;
  const mapId = useGameWorldStore.getState().activeMapId;
  const rotY = usePlayerStore.getState().rotation.y;
  const rawX = pos.x + Math.sin(rotY) * BUILD_PLACE_DIST;
  const rawZ = pos.z + Math.cos(rotY) * BUILD_PLACE_DIST;
  const { x, z } = snapBuildXZ(rawX, rawZ);
  return {
    mapId,
    x,
    y: pos.y,
    z,
    rotY: snapBuildRotY(rotY),
  };
}

/** ES: Coloca pieza modular frente al jugador (Fase 3). EN: Place modular piece in front of player. */
export function placeBuildPieceAtPlayer(pieceId: BuildPieceId): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  const pose = getBuildPlacementPreviewPose();
  if (!pose) return;
  room.send(HousingMessages.PlacePiece, {
    mapId: pose.mapId,
    pieceId,
    x: pose.x,
    y: pose.y,
    z: pose.z,
    rotY: pose.rotY,
  });
}

/** ES: Desmonta la pieza modular tuya más cercana (≤10 m). EN: Remove nearest owned build piece. */
export function removeNearestBuildPiece(): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  room.send(HousingMessages.RemovePiece, { nearest: true });
}

/** ES: Limpia el escombro de plantilla más cercano en tu lote (Fase 5). EN: Clear nearest plot debris. */
export function clearNearestPlotDebris(): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  room.send(HousingMessages.ClearDebris, { nearest: true });
}

/** ES: Interactúa con un bancal del huerto (sembrar o cosechar). EN: Farm bed interact (plant/harvest). */
export function interactFarmSlot(slotIndex: number): void {
  const room = colyseusClient.getSocket();
  if (!room?.connection.isOpen) return;
  room.send(FarmMessages.Interact, { slotIndex });
}
