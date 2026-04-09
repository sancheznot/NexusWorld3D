/**
 * ES: Parcelas comprables y límites XZ (mapa `exterior`). Ajustar coords al city.glb real.
 * EN: Purchasable plots and XZ bounds on `exterior` map — tune to match city.glb.
 */

export type HousingPlotDef = {
  id: string;
  mapId: string;
  /** ES: Precio en unidades mayores (wallet). EN: Price in major wallet units. */
  priceMajor: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  labelEs: string;
  labelEn: string;
};

export const HOUSING_PLOTS: HousingPlotDef[] = [
  {
    id: "exterior_lot_a1",
    mapId: "exterior",
    priceMajor: 200,
    minX: 48,
    maxX: 62,
    minZ: -18,
    maxZ: -4,
    labelEs: "Lote urbano A1 (césped)",
    labelEn: "Urban plot A1 (grass)",
  },
];

const byId = new Map(HOUSING_PLOTS.map((p) => [p.id, p]));

export function getHousingPlotById(id: string): HousingPlotDef | undefined {
  return byId.get(id);
}

/** ES: Punto (x,z) dentro del rectángulo del lote (ignora Y). */
export function isPointInsidePlotXZ(
  plot: HousingPlotDef,
  x: number,
  z: number
): boolean {
  return x >= plot.minX && x <= plot.maxX && z >= plot.minZ && z <= plot.maxZ;
}
