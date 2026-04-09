/**
 * ES: Tipos compartidos vivienda / construcción (Fase 1).
 * EN: Shared housing / build types (Phase 1).
 */

export type HousingStructureKind = "cabin_t1";

/**
 * ES: Pieza modular colocada (pared, suelo, …). EN: Placed modular build piece.
 */
export type BuildPieceRecord = {
  id: string;
  /** ES: Coincide con basename del GLB en `public/models/build/`. EN: Matches GLB basename. */
  pieceId: string;
  mapId: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  ownerNorm?: string;
  ownerUsername?: string;
};

export type HousingStructureRecord = {
  id: string;
  kind: HousingStructureKind;
  mapId: string;
  x: number;
  y: number;
  z: number;
  rotY: number;
  /**
   * ES: 1 = madera, 2 = refuerzo piedra (Fase 2). EN: 1 wood, 2 stone tier.
   * @default 1
   */
  tier?: number;
  /** ES: Reservado combate/daño futuro. EN: Reserved for future damage. */
  hp?: number;
  /** ES: Clave estable para sync / limpiar al hidratar. EN: Stable key for sync. */
  ownerNorm?: string;
  /** ES: Para mostrar en multijugador. EN: Display label in MP. */
  ownerUsername?: string;
};

/** ES: Lote en puesto de productos (Fase 8). EN: Produce stall listing. */
export type StallListing = {
  id: string;
  itemId: string;
  quantity: number;
  priceMajor: number;
};

/** ES: Estado del puesto en `housing_json`. EN: Stall state in housing save. */
export type HousingPlayerStall = {
  listings: StallListing[];
  /** ES: Créditos pendientes si el vendedor estaba offline. EN: Pending credits when seller was offline. */
  pendingCreditsMajor?: number;
};

/** ES: Un bancal sembrado (autoridad servidor para `plantedAt`). EN: One planted farm bed. */
export type HousingFarmSlotRecord = {
  slotIndex: number;
  cropId: string;
  plantedAt: number;
  mapId: string;
};

export type HousingSavePayload = {
  version: 1;
  ownedPlotId: string | null;
  structures: HousingStructureRecord[];
  /** ES: Módulos Fase 3 (opcional en saves antiguos). EN: Phase 3 modules (optional in old saves). */
  pieces?: BuildPieceRecord[];
  /** ES: IDs de escombro limpiados en tu lote (Fase 5). EN: Cleared plot debris ids (Phase 5). */
  clearedDebrisIds?: string[];
  /** ES: Cultivos en huerto de parcela (Fase 7). EN: Plot farm crops (Phase 7). */
  farmSlots?: HousingFarmSlotRecord[];
  /** ES: Puesto de productos en parcela (Fase 8). EN: Player produce stall (Phase 8). */
  playerStall?: HousingPlayerStall;
};

export type HousingSyncPayload = {
  mapId: string;
  structures: HousingStructureRecord[];
  pieces: BuildPieceRecord[];
  ownedPlotId: string | null;
  /**
   * ES: Unión de escombros ya limpiados en parcelas de este mapa (todos los jugadores).
   * EN: Union of cleared debris on this map (all players).
   */
  clearedPlotDebrisIds: string[];
  /** ES: Solo tu huerto (Fase 7). EN: Your farm slots only (Phase 7). */
  farmSlots: HousingFarmSlotRecord[];
  /**
   * ES: Puesto público del lote A1 en mapa exterior (listados + precios).
   * EN: Public produce stall for plot A1 on exterior map.
   */
  produceStall: { plotId: string; listings: StallListing[] } | null;
};
