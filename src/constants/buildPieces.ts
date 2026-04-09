/**
 * ES: Catálogo Fase 3 — piezas modulares colocables; GLB opcional por convención.
 * EN: Phase 3 — placeable modular pieces; optional GLB by naming convention.
 *
 * Convención / Convention: `getBuildPieceGlbUrl("wall_wood")` → `/models/build/wall_wood.glb`
 * (suelta el archivo en `public/models/build/` con el mismo basename que `pieceId`).
 */

export const BUILD_PIECE_GLB_PREFIX = "/models/build";

/** ES: Paso del grid en XZ (m). EN: Grid step on XZ (m). */
export const BUILD_GRID_STEP = 0.5;

/** ES: Alineación de rotación Y (radianes). EN: Y rotation snap (radians). */
export const BUILD_ROT_SNAP_STEP = Math.PI / 2;

/** ES: Media planta cabaña_t1 en XZ (coincide con caja ~4×4 en `HousingLayer`). EN: Half cabin AABB on XZ. */
export const CABIN_T1_HALF_EXTENT_XZ = { hx: 2, hz: 2 };

export function snapBuildXZ(x: number, z: number): { x: number; z: number } {
  const s = BUILD_GRID_STEP;
  return {
    x: Math.round(x / s) * s,
    z: Math.round(z / s) * s,
  };
}

export function snapBuildRotY(rotY: number): number {
  const step = BUILD_ROT_SNAP_STEP;
  if (!Number.isFinite(rotY)) return 0;
  return Math.round(rotY / step) * step;
}

/**
 * ES: Solape AABB en XZ entre dos rectángulos centrados en (x,z).
 * EN: AABB overlap on XZ for axis-aligned footprints (MVP).
 */
export function buildFootprintsOverlapXZ(
  ax: number,
  az: number,
  ahx: number,
  ahz: number,
  bx: number,
  bz: number,
  bhx: number,
  bhz: number,
  padding = 0.02
): boolean {
  return (
    Math.abs(ax - bx) < ahx + bhx + padding &&
    Math.abs(az - bz) < ahz + bhz + padding
  );
}

function dotXZ(ax: number, az: number, bx: number, bz: number): number {
  return ax * bx + az * bz;
}

/**
 * ES: Solape de dos OBB en el plano XZ; ejes locales = `makeRotationY` de Three.js
 * (media anchura `w` sobre eje local X, profundidad `d` sobre local Z).
 * EN: Two OBBs overlap on XZ; local axes match Three.js `makeRotationY`.
 */
export function buildObbOverlapXZThreeJs(
  ax: number,
  az: number,
  hx: number,
  hz: number,
  rotA: number,
  bx: number,
  bz: number,
  hbx: number,
  hbz: number,
  rotB: number,
  padding = 0.02
): boolean {
  const cA = Math.cos(rotA);
  const sA = Math.sin(rotA);
  const uAx = cA;
  const uAz = -sA;
  const vAx = sA;
  const vAz = cA;

  const cB = Math.cos(rotB);
  const sB = Math.sin(rotB);
  const uBx = cB;
  const uBz = -sB;
  const vBx = sB;
  const vBz = cB;

  const dx = bx - ax;
  const dz = bz - az;

  const testAxis = (lx: number, lz: number): boolean => {
    const len = Math.hypot(lx, lz);
    if (len < 1e-9) return true;
    const nx = lx / len;
    const nz = lz / len;
    const t = dotXZ(dx, dz, nx, nz);
    const ra =
      hx * Math.abs(dotXZ(uAx, uAz, nx, nz)) +
      hz * Math.abs(dotXZ(vAx, vAz, nx, nz));
    const rb =
      hbx * Math.abs(dotXZ(uBx, uBz, nx, nz)) +
      hbz * Math.abs(dotXZ(vBx, vBz, nx, nz));
    return Math.abs(t) <= ra + rb + padding;
  };

  return (
    testAxis(uAx, uAz) &&
    testAxis(vAx, vAz) &&
    testAxis(uBx, uBz) &&
    testAxis(vBx, vBz)
  );
}

export const BUILD_PIECE_IDS = ["wall_wood", "wall_stone", "floor_stone"] as const;

export type BuildPieceId = (typeof BUILD_PIECE_IDS)[number];

export type BuildPieceCatalogEntry = {
  /** ES: Coste al colocar (inventario servidor). EN: Placement cost (server inventory). */
  cost: { itemId: string; quantity: number };
  /** ES: Primitivo si falta el .glb. EN: Primitive when .glb is missing. */
  fallback: { w: number; h: number; d: number; color: string };
};

export const BUILD_PIECE_CATALOG: Record<BuildPieceId, BuildPieceCatalogEntry> = {
  wall_wood: {
    cost: { itemId: "material_wood_plank", quantity: 1 },
    fallback: { w: 2, h: 2.5, d: 0.25, color: "#5c4033" },
  },
  wall_stone: {
    cost: { itemId: "material_stone_raw", quantity: 2 },
    fallback: { w: 2, h: 2.5, d: 0.3, color: "#7a7a7d" },
  },
  floor_stone: {
    cost: { itemId: "material_stone_raw", quantity: 1 },
    fallback: { w: 2, h: 0.2, d: 2, color: "#6b6b6e" },
  },
};

export function isBuildPieceId(id: string): id is BuildPieceId {
  return (BUILD_PIECE_IDS as readonly string[]).includes(id);
}

export function getBuildPieceCatalogEntry(
  pieceId: string
): BuildPieceCatalogEntry | undefined {
  return isBuildPieceId(pieceId) ? BUILD_PIECE_CATALOG[pieceId] : undefined;
}

/** ES: Mitades w/2 y d/2 en ejes locales X/Z del modelo (coinciden con colisión OBB + rotY). EN: Half w/2 & d/2 on local X/Z for OBB + rotY. */
export function getBuildPieceFootprintHalfXZ(
  pieceId: string
): { hx: number; hz: number } | null {
  const cat = getBuildPieceCatalogEntry(pieceId);
  if (!cat) return null;
  return { hx: cat.fallback.w / 2, hz: cat.fallback.d / 2 };
}

/** ES: URL pública del GLB (si existe). EN: Public GLB URL when file is present. */
export function getBuildPieceGlbUrl(pieceId: string): string {
  const safe = pieceId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${BUILD_PIECE_GLB_PREFIX}/${safe}.glb`;
}
