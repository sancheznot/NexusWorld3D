import { Room, Client } from "colyseus";
import type { InventoryEvents } from "@resources/inventory/server/InventoryEvents";
import type { EconomyEvents } from "@resources/economy/server/EconomyEvents";
import {
  getHousingPlotById,
  isPointInsidePlotXZ,
} from "@/constants/housingPlots";
import {
  findPlotDebrisTemplateItem,
  getDebrisTemplateForPlot,
  isKnownPlotDebrisId,
  type PlotDebrisTemplateItem,
} from "@/constants/housingPlotDebris";
import {
  buildObbOverlapXZThreeJs,
  CABIN_T1_HALF_EXTENT_XZ,
  getBuildPieceFootprintHalfXZ,
  getBuildPieceCatalogEntry,
  isBuildPieceId,
  snapBuildRotY,
  snapBuildXZ,
} from "@/constants/buildPieces";
import { ITEMS_CATALOG } from "@/constants/items";
import {
  CABIN_T1_MAX_TIER,
  getCabinUpgradeDef,
  type HousingUpgradeMode,
} from "@/constants/housingTiers";
import {
  FARM_CROP_IDS,
  FARM_CROPS,
  FARM_SLOT_TEMPLATES,
  getFarmSlotTemplate,
  isFarmCropId,
  type FarmCropId,
} from "@/constants/farmPlots";
import { RPG_XP_FARM_HARVEST } from "@/constants/rpgProgression";
import {
  isNearProduceStallKiosk,
  isProduceStallItemId,
  normalizePlayerStall,
  PRODUCE_STALL_KIOSK,
  PRODUCE_STALL_MAX_LISTINGS,
  PRODUCE_STALL_MAX_PRICE_MAJOR,
  PRODUCE_STALL_MIN_PRICE_MAJOR,
  PRODUCE_STALL_TAX_RATE,
} from "@/constants/playerStall";
import type {
  BuildPieceRecord,
  HousingFarmSlotRecord,
  HousingSavePayload,
  HousingStructureRecord,
  HousingSyncPayload,
  StallListing,
} from "@/types/housing.types";
import type {
  InventoryItem,
  ItemRarity,
  ItemType,
} from "@/types/inventory.types";
import type { PlayerData } from "./housingTypes";

const CABIN_KIT_ID = "placeable_cabin_kit";
const MAX_PLACE_DIST = 10;
const MAX_UPGRADE_DIST = 8;
const MAX_CLEAR_DEBRIS_DIST = 4;
const FARM_SLOT_DIST_SLACK = 0.85;
const HOUSING_DEV = process.env.HOUSING_DEV === "1";

function refundBaseForCatalogItem(
  itemId: string,
  quantity: number
): Omit<InventoryItem, "id" | "isEquipped" | "slot"> {
  const cat =
    ITEMS_CATALOG[itemId as keyof typeof ITEMS_CATALOG] ?? undefined;
  return {
    itemId,
    name: cat?.name ?? itemId,
    description: "",
    type: (cat?.type ?? "material") as ItemType,
    rarity: (cat?.rarity ?? "common") as ItemRarity,
    quantity,
    maxStack: Math.max(cat?.maxStack ?? 99, quantity),
    level: 1,
    weight: cat?.weight ?? 0.1,
    icon: cat?.icon ?? "📦",
  };
}

function normalizeStructureTier(t: unknown): number {
  const n = typeof t === "number" && Number.isFinite(t) ? Math.floor(t) : 1;
  if (n < 1) return 1;
  if (n > CABIN_T1_MAX_TIER) return CABIN_T1_MAX_TIER;
  return n;
}

function emptyHousing(): HousingSavePayload {
  return {
    version: 1,
    ownedPlotId: null,
    structures: [],
    pieces: [],
    clearedDebrisIds: [],
    farmSlots: [],
    playerStall: { listings: [], pendingCreditsMajor: 0 },
  };
}

function parseHousingRaw(raw: unknown): HousingSavePayload {
  if (raw == null) return emptyHousing();
  let o: unknown = raw;
  if (typeof raw === "string") {
    try {
      o = JSON.parse(raw);
    } catch {
      return emptyHousing();
    }
  }
  if (typeof o !== "object" || !o) return emptyHousing();
  const p = o as Partial<HousingSavePayload>;
  if (p.version != null && p.version !== 1) return emptyHousing();
  const structures = Array.isArray(p.structures)
    ? p.structures.filter(
        (s): s is HousingStructureRecord =>
          typeof s === "object" &&
          s != null &&
          typeof (s as HousingStructureRecord).id === "string" &&
          typeof (s as HousingStructureRecord).kind === "string" &&
          typeof (s as HousingStructureRecord).mapId === "string"
      )
    : [];
  const pieces = Array.isArray(p.pieces)
    ? p.pieces.filter(
        (q): q is BuildPieceRecord =>
          typeof q === "object" &&
          q != null &&
          typeof (q as BuildPieceRecord).id === "string" &&
          typeof (q as BuildPieceRecord).pieceId === "string" &&
          isBuildPieceId((q as BuildPieceRecord).pieceId) &&
          typeof (q as BuildPieceRecord).mapId === "string" &&
          Number.isFinite((q as BuildPieceRecord).x) &&
          Number.isFinite((q as BuildPieceRecord).z)
      )
    : [];
  const clearedDebrisIds = Array.isArray(p.clearedDebrisIds)
    ? [
        ...new Set(
          p.clearedDebrisIds.filter(
            (id): id is string => typeof id === "string" && id.length > 0
          )
        ),
      ]
    : [];
  const farmBySlot = new Map<number, HousingFarmSlotRecord>();
  for (const row of Array.isArray(p.farmSlots) ? p.farmSlots : []) {
    if (typeof row !== "object" || row == null) continue;
    const r = row as Partial<HousingFarmSlotRecord>;
    if (typeof r.slotIndex !== "number" || !Number.isFinite(r.slotIndex)) continue;
    if (typeof r.cropId !== "string" || !isFarmCropId(r.cropId)) continue;
    if (typeof r.plantedAt !== "number" || !Number.isFinite(r.plantedAt))
      continue;
    if (typeof r.mapId !== "string") continue;
    const si = Math.floor(r.slotIndex);
    farmBySlot.set(si, {
      slotIndex: si,
      cropId: r.cropId,
      plantedAt: r.plantedAt,
      mapId: r.mapId,
    });
  }
  const farmSlots = [...farmBySlot.values()];
  const playerStall = normalizePlayerStall(p.playerStall);
  return {
    version: 1,
    ownedPlotId:
      typeof p.ownedPlotId === "string" ? p.ownedPlotId : null,
    structures,
    pieces,
    clearedDebrisIds,
    farmSlots,
    playerStall,
  };
}

export class HousingEvents {
  private room: Room;
  private inventory: InventoryEvents;
  private economy: EconomyEvents;
  private getPlayer: (sessionId: string) => PlayerData | undefined;
  private getPlayerMapId: (sessionId: string) => string | null;
  private getPlayerPosition: (
    sessionId: string
  ) => { x: number; y: number; z: number } | null;
  private normalizeUsername: (username: string) => string;
  /** ES: Todos los modelos colocados (multijugador). EN: All placed structures. */
  private worldStructures: HousingStructureRecord[] = [];
  /** ES: Piezas modulares en mundo. EN: Modular build pieces in world. */
  private worldPieces: BuildPieceRecord[] = [];
  private housingByNorm = new Map<string, HousingSavePayload>();
  private awardExperience?: (
    sessionId: string,
    baseXp: number
  ) => void;

  constructor(
    room: Room,
    opts: {
      inventory: InventoryEvents;
      economy: EconomyEvents;
      getPlayer: (sessionId: string) => PlayerData | undefined;
      getPlayerMapId: (sessionId: string) => string | null;
      getPlayerPosition: (
        sessionId: string
      ) => { x: number; y: number; z: number } | null;
      normalizeUsername: (username: string) => string;
      awardExperience?: (sessionId: string, baseXp: number) => void;
    }
  ) {
    this.room = room;
    this.inventory = opts.inventory;
    this.economy = opts.economy;
    this.getPlayer = opts.getPlayer;
    this.getPlayerMapId = opts.getPlayerMapId;
    this.getPlayerPosition = opts.getPlayerPosition;
    this.normalizeUsername = opts.normalizeUsername;
    this.awardExperience = opts.awardExperience;
    this.setupHandlers();
  }

  private normFor(client: Client): string | null {
    const p = this.getPlayer(client.sessionId);
    if (!p?.username) return null;
    return this.normalizeUsername(p.username);
  }

  /** ES: Cargar desde perfil al hacer join. EN: Hydrate from DB row on join. */
  hydrateFromProfile(
    usernameNorm: string,
    displayUsername: string,
    raw: unknown
  ): void {
    const data = parseHousingRaw(raw);
    for (const s of data.structures) {
      s.ownerNorm = usernameNorm;
      if (!s.ownerUsername) s.ownerUsername = displayUsername;
      s.tier = normalizeStructureTier(s.tier);
    }
    const pieceList = data.pieces ?? [];
    for (const q of pieceList) {
      q.ownerNorm = usernameNorm;
      if (!q.ownerUsername) q.ownerUsername = displayUsername;
    }
    const plotId = data.ownedPlotId;
    const allowedDebris = new Set(
      plotId ? getDebrisTemplateForPlot(plotId).map((d) => d.id) : []
    );
    const clearedDebrisIds = (data.clearedDebrisIds ?? []).filter((id) =>
      allowedDebris.has(id)
    );
    const allowedFarm = new Set(
      plotId
        ? FARM_SLOT_TEMPLATES.filter((t) => t.plotId === plotId).map(
            (t) => t.slotIndex
          )
        : []
    );
    const farmSlots = (data.farmSlots ?? []).filter((s) =>
      allowedFarm.has(s.slotIndex)
    );
    const playerStall = normalizePlayerStall(data.playerStall);
    this.housingByNorm.set(usernameNorm, {
      ...data,
      pieces: pieceList,
      clearedDebrisIds,
      farmSlots,
      playerStall,
    });
    this.worldStructures = this.worldStructures.filter(
      (s) => s.ownerNorm !== usernameNorm
    );
    for (const s of data.structures) {
      this.worldStructures.push({ ...s });
    }
    this.worldPieces = this.worldPieces.filter(
      (q) => q.ownerNorm !== usernameNorm
    );
    for (const q of pieceList) {
      this.worldPieces.push({ ...q });
    }
  }

  /** ES: Serializar para guardar en MariaDB. EN: Serialize for MariaDB upsert. */
  getHousingJsonForSave(usernameNorm: string): unknown | undefined {
    const h = this.housingByNorm.get(usernameNorm);
    if (!h) return undefined;
    return {
      ...h,
      pieces: h.pieces ?? [],
      playerStall:
        h.playerStall ?? { listings: [], pendingCreditsMajor: 0 },
    };
  }

  /** ES: Quitar estructuras en memoria al salir (otros jugadores siguen viendo hasta reload). EN: Drop session copy on leave — optional. */
  onPlayerLeave(sessionId: string): void {
    void sessionId;
    /* ES: Las construcciones persisten en BD; no borrar del mundo al desconectar. */
  }

  /** ES: Tras join + hydrate, enviar estado al cliente. EN: After join + hydrate, push state. */
  afterPlayerJoined(client: Client): void {
    this.flushStallPendingForClient(client);
    const mapId = this.getPlayerMapId(client.sessionId) ?? "exterior";
    this.syncClient(client, mapId);
  }

  private flushStallPendingForClient(client: Client): void {
    const norm = this.normFor(client);
    if (!norm) return;
    const h = this.housingByNorm.get(norm);
    if (!h?.playerStall) return;
    const pending = h.playerStall.pendingCreditsMajor ?? 0;
    if (pending <= 0) return;
    this.economy.creditWalletMajor(
      client.sessionId,
      pending,
      "stall:pending"
    );
    h.playerStall.pendingCreditsMajor = 0;
    this.housingByNorm.set(norm, h);
  }

  private findPlotOwnerNorm(plotId: string): string | null {
    for (const [norm, h] of this.housingByNorm) {
      if (h.ownedPlotId === plotId) return norm;
    }
    return null;
  }

  private sessionIdForUsernameNorm(targetNorm: string): string | null {
    for (const c of this.room.clients) {
      const p = this.getPlayer(c.sessionId);
      if (
        p &&
        this.normalizeUsername(p.username) === targetNorm
      ) {
        return c.sessionId;
      }
    }
    return null;
  }

  private buildProduceStallPayload(
    mapId: string
  ): { plotId: string; listings: StallListing[] } | null {
    if (mapId !== PRODUCE_STALL_KIOSK.mapId) return null;
    const plotId = PRODUCE_STALL_KIOSK.plotId;
    const norm = this.findPlotOwnerNorm(plotId);
    if (!norm) return { plotId, listings: [] };
    const h = this.housingByNorm.get(norm);
    const listings = h?.playerStall?.listings ?? [];
    return { plotId, listings: listings.map((l) => ({ ...l })) };
  }

  private collectClearedPlotDebrisIdsForMap(mapId: string): string[] {
    const out = new Set<string>();
    for (const h of this.housingByNorm.values()) {
      const pid = h.ownedPlotId;
      if (!pid) continue;
      const plot = getHousingPlotById(pid);
      if (!plot || plot.mapId !== mapId) continue;
      for (const id of h.clearedDebrisIds ?? []) {
        if (isKnownPlotDebrisId(id)) out.add(id);
      }
    }
    return [...out];
  }

  private syncClient(client: Client, mapId: string): void {
    const norm = this.normFor(client);
    const owned = norm ? this.housingByNorm.get(norm)?.ownedPlotId ?? null : null;
    const structures = this.worldStructures.filter((s) => s.mapId === mapId);
    const pieces = this.worldPieces.filter((q) => q.mapId === mapId);
    const clearedPlotDebrisIds = this.collectClearedPlotDebrisIdsForMap(mapId);
    const hOwn = norm ? this.housingByNorm.get(norm) : null;
    const farmSlots = hOwn?.farmSlots ?? [];
    const produceStall = this.buildProduceStallPayload(mapId);
    const payload: HousingSyncPayload = {
      mapId,
      structures,
      pieces,
      ownedPlotId: owned,
      clearedPlotDebrisIds,
      farmSlots,
      produceStall,
    };
    client.send("housing:sync", payload);
  }

  private broadcastMap(mapId: string): void {
    this.room.clients.forEach((c) => {
      if (this.getPlayerMapId(c.sessionId) === mapId) {
        this.syncClient(c, mapId);
      }
    });
  }

  private setupHandlers(): void {
    this.room.onMessage(
      "housing:request",
      (client: Client, data: { mapId?: string }) => {
        const mapId =
          typeof data?.mapId === "string"
            ? data.mapId
            : this.getPlayerMapId(client.sessionId) ?? "exterior";
        this.syncClient(client, mapId);
      }
    );

    this.room.onMessage(
      "housing:purchase",
      (client: Client, data: { plotId?: string }) => {
        const plotId = typeof data?.plotId === "string" ? data.plotId : "";
        const plot = getHousingPlotById(plotId);
        const norm = this.normFor(client);
        if (!norm || !plot) {
          client.send("housing:error", { message: "Lote inválido" });
          return;
        }
        const cur = this.housingByNorm.get(norm) ?? emptyHousing();
        if (cur.ownedPlotId != null) {
          client.send("housing:error", {
            message: "Ya tienes un lote asignado",
          });
          return;
        }
        const charged = this.economy.chargeWalletMajor(
          client.sessionId,
          plot.priceMajor,
          `housing:plot:${plot.id}`
        );
        if (!charged) {
          client.send("housing:error", {
            message: "No tienes créditos suficientes para el lote",
          });
          return;
        }
        cur.ownedPlotId = plot.id;
        this.housingByNorm.set(norm, cur);
        client.send("housing:purchased", { plotId: plot.id });
        this.broadcastMap(plot.mapId);
      }
    );

    if (HOUSING_DEV) {
      this.room.onMessage(
        "housing:dev_grant_plot",
        (client: Client, data: { plotId?: string }) => {
          const plotId =
            typeof data?.plotId === "string" ? data.plotId : "exterior_lot_a1";
          const plot = getHousingPlotById(plotId);
          const norm = this.normFor(client);
          if (!norm || !plot) {
            client.send("housing:error", { message: "Lote inválido (dev)" });
            return;
          }
          const cur = this.housingByNorm.get(norm) ?? emptyHousing();
          cur.ownedPlotId = plot.id;
          this.housingByNorm.set(norm, cur);
          client.send("housing:purchased", { plotId: plot.id, dev: true });
          this.broadcastMap(plot.mapId);
        }
      );
    }

    this.room.onMessage(
      "housing:place",
      (
        client: Client,
        data: { mapId?: string; x?: number; y?: number; z?: number; rotY?: number }
      ) => {
        const mapId =
          typeof data?.mapId === "string"
            ? data.mapId
            : this.getPlayerMapId(client.sessionId) ?? "";
        const x = Number(data?.x);
        const y = Number(data?.y);
        const z = Number(data?.z);
        const rotY = Number(data?.rotY ?? 0);
        const norm = this.normFor(client);
        if (!norm || !Number.isFinite(x) || !Number.isFinite(z)) {
          client.send("housing:error", { message: "Datos inválidos" });
          return;
        }
        const yy = Number.isFinite(y) ? y : 0.5;
        const housing = this.housingByNorm.get(norm) ?? emptyHousing();
        const plotId = housing.ownedPlotId;
        if (!plotId) {
          client.send("housing:error", {
            message: "Primero compra un lote (pausa → Vivienda)",
          });
          return;
        }
        const plot = getHousingPlotById(plotId);
        if (!plot || plot.mapId !== mapId) {
          client.send("housing:error", { message: "Lote no válido en este mapa" });
          return;
        }
        if (!isPointInsidePlotXZ(plot, x, z)) {
          client.send("housing:error", {
            message: "Fuera de tu parcela — coloca dentro del área del lote",
          });
          return;
        }
        const pos = this.getPlayerPosition(client.sessionId);
        if (pos) {
          const d = Math.hypot(pos.x - x, pos.z - z);
          if (d > MAX_PLACE_DIST) {
            client.send("housing:error", {
              message: "Demasiado lejos del punto de construcción",
            });
            return;
          }
        }
        const consumed = this.inventory.tryConsumeCatalogItems(client.sessionId, [
          { itemId: CABIN_KIT_ID, quantity: 1 },
        ]);
        if (!consumed) {
          client.send("housing:error", {
            message: "Necesitas un kit cabaña en el inventario",
          });
          return;
        }
        const p = this.getPlayer(client.sessionId);
        const rec: HousingStructureRecord = {
          id: `cabin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          kind: "cabin_t1",
          mapId,
          x,
          y: yy,
          z,
          rotY: Number.isFinite(rotY) ? rotY : 0,
          tier: 1,
          hp: 100,
          ownerNorm: norm,
          ownerUsername: p?.username,
        };
        housing.structures.push({ ...rec });
        this.housingByNorm.set(norm, housing);
        this.worldStructures.push({ ...rec });
        client.send("housing:placed", { structure: rec });
        this.broadcastMap(mapId);
      }
    );

    this.room.onMessage(
      "housing:placePiece",
      (
        client: Client,
        data: {
          mapId?: string;
          pieceId?: string;
          x?: number;
          y?: number;
          z?: number;
          rotY?: number;
        }
      ) => {
        const mapId =
          typeof data?.mapId === "string"
            ? data.mapId
            : this.getPlayerMapId(client.sessionId) ?? "";
        const pieceId =
          typeof data?.pieceId === "string" ? data.pieceId.trim() : "";
        const x = Number(data?.x);
        const y = Number(data?.y);
        const z = Number(data?.z);
        const rotY = Number(data?.rotY ?? 0);
        const norm = this.normFor(client);
        if (!norm || !pieceId || !isBuildPieceId(pieceId)) {
          client.send("housing:error", {
            message: "pieza inválida (revisa el catálogo de construcción)",
          });
          return;
        }
        const cat = getBuildPieceCatalogEntry(pieceId);
        if (!cat) {
          client.send("housing:error", { message: "Pieza no catalogada" });
          return;
        }
        if (!Number.isFinite(x) || !Number.isFinite(z)) {
          client.send("housing:error", { message: "Datos inválidos" });
          return;
        }
        const yy = Number.isFinite(y) ? y : 0.5;
        const snapped = snapBuildXZ(x, z);
        const sx = snapped.x;
        const sz = snapped.z;
        const srot = snapBuildRotY(rotY);
        const housing = this.housingByNorm.get(norm) ?? emptyHousing();
        if (!housing.pieces) housing.pieces = [];
        const plotId = housing.ownedPlotId;
        if (!plotId) {
          client.send("housing:error", {
            message: "Primero compra un lote (pausa → Vivienda)",
          });
          return;
        }
        const plot = getHousingPlotById(plotId);
        if (!plot || plot.mapId !== mapId) {
          client.send("housing:error", { message: "Lote no válido en este mapa" });
          return;
        }
        if (!isPointInsidePlotXZ(plot, sx, sz)) {
          client.send("housing:error", {
            message: "Fuera de tu parcela — coloca dentro del área del lote",
          });
          return;
        }
        const pos = this.getPlayerPosition(client.sessionId);
        if (pos) {
          const d = Math.hypot(pos.x - sx, pos.z - sz);
          if (d > MAX_PLACE_DIST) {
            client.send("housing:error", {
              message: "Demasiado lejos del punto de colocación",
            });
            return;
          }
        }

        const newHalf = getBuildPieceFootprintHalfXZ(pieceId);
        if (!newHalf) {
          client.send("housing:error", { message: "Pieza sin footprint" });
          return;
        }
        for (const q of housing.pieces) {
          if (q.mapId !== mapId || q.ownerNorm !== norm) continue;
          const oh = getBuildPieceFootprintHalfXZ(q.pieceId);
          const qRot = Number.isFinite(q.rotY) ? q.rotY : 0;
          if (
            oh &&
            buildObbOverlapXZThreeJs(
              sx,
              sz,
              newHalf.hx,
              newHalf.hz,
              srot,
              q.x,
              q.z,
              oh.hx,
              oh.hz,
              qRot
            )
          ) {
            client.send("housing:error", {
              message: "Choca con otra pieza — prueba otro hueco u orientación",
            });
            return;
          }
        }
        for (const st of housing.structures) {
          if (st.mapId !== mapId || st.ownerNorm !== norm) continue;
          if (st.kind !== "cabin_t1") continue;
          const stRot = Number.isFinite(st.rotY) ? st.rotY : 0;
          if (
            buildObbOverlapXZThreeJs(
              sx,
              sz,
              newHalf.hx,
              newHalf.hz,
              srot,
              st.x,
              st.z,
              CABIN_T1_HALF_EXTENT_XZ.hx,
              CABIN_T1_HALF_EXTENT_XZ.hz,
              stRot
            )
          ) {
            client.send("housing:error", {
              message: "Choca con la cabaña — aléjate o usa otro tile del grid",
            });
            return;
          }
        }

        const consumed = this.inventory.tryConsumeCatalogItems(
          client.sessionId,
          [cat.cost]
        );
        if (!consumed) {
          client.send("housing:error", {
            message:
              "Materiales insuficientes para esta pieza (tablas / piedra según tipo)",
          });
          return;
        }
        const p = this.getPlayer(client.sessionId);
        const rec: BuildPieceRecord = {
          id: `piece_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          pieceId,
          mapId,
          x: sx,
          y: yy,
          z: sz,
          rotY: srot,
          ownerNorm: norm,
          ownerUsername: p?.username,
        };
        housing.pieces.push({ ...rec });
        this.housingByNorm.set(norm, housing);
        this.worldPieces.push({ ...rec });
        client.send("housing:piecePlaced", { piece: rec });
        this.broadcastMap(mapId);
      }
    );

    this.room.onMessage(
      "housing:removePiece",
      (
        client: Client,
        data: { id?: string; nearest?: boolean }
      ) => {
        const norm = this.normFor(client);
        const mapId =
          this.getPlayerMapId(client.sessionId) ?? "exterior";
        if (!norm) {
          client.send("housing:error", { message: "Jugador no encontrado" });
          return;
        }
        const housing = this.housingByNorm.get(norm) ?? emptyHousing();
        if (!housing.pieces) housing.pieces = [];
        const plotId = housing.ownedPlotId;
        if (!plotId) {
          client.send("housing:error", { message: "Sin lote asignado" });
          return;
        }
        const plot = getHousingPlotById(plotId);
        if (!plot || plot.mapId !== mapId) {
          client.send("housing:error", { message: "Lote no válido aquí" });
          return;
        }

        const pos = this.getPlayerPosition(client.sessionId);
        if (!pos) {
          client.send("housing:error", { message: "Posición desconocida" });
          return;
        }

        const mineOnMap = housing.pieces.filter(
          (q) => q.mapId === mapId && q.ownerNorm === norm
        );
        let target: BuildPieceRecord | undefined;

        if (typeof data?.id === "string" && data.id) {
          target = mineOnMap.find((q) => q.id === data.id);
        } else if (data?.nearest) {
          let best: BuildPieceRecord | undefined;
          let bestD = Infinity;
          for (const q of mineOnMap) {
            const d = Math.hypot(pos.x - q.x, pos.z - q.z);
            if (d < bestD) {
              bestD = d;
              best = q;
            }
          }
          if (best && bestD <= MAX_PLACE_DIST) target = best;
        }

        if (!target) {
          client.send("housing:error", {
            message:
              "No hay pieza tuya cerca (≤10 m) o id inválido. Acércate o revisa el id.",
          });
          return;
        }

        if (!isPointInsidePlotXZ(plot, target.x, target.z)) {
          client.send("housing:error", {
            message: "La pieza quedó fuera de tu parcela (datos inconsistentes)",
          });
          return;
        }

        const dPlayer = Math.hypot(pos.x - target.x, pos.z - target.z);
        if (dPlayer > MAX_PLACE_DIST) {
          client.send("housing:error", {
            message: "Acércate más a la pieza para desmontarla",
          });
          return;
        }

        const cat = getBuildPieceCatalogEntry(target.pieceId);
        const costQty = cat?.cost.quantity ?? 0;
        const costItemId = cat?.cost.itemId;

        housing.pieces = housing.pieces.filter((q) => q.id !== target.id);
        this.worldPieces = this.worldPieces.filter((q) => q.id !== target.id);
        this.housingByNorm.set(norm, housing);

        if (cat && costItemId && costQty > 0) {
          const added = this.inventory.addItemFromWorld(
            client.sessionId,
            refundBaseForCatalogItem(costItemId, costQty)
          );
          if (added < costQty) {
            housing.pieces.push({ ...target });
            this.worldPieces.push({ ...target });
            this.housingByNorm.set(norm, housing);
            client.send("housing:error", {
              message:
                "No caben los materiales en el inventario — libera espacio o peso e inténtalo de nuevo",
            });
            return;
          }
        }

        client.send("housing:pieceRemoved", {
          pieceId: target.pieceId,
          instanceId: target.id,
        });
        this.broadcastMap(mapId);
      }
    );

    this.room.onMessage(
      "housing:clearDebris",
      (client: Client, data: { debrisId?: string; nearest?: boolean }) => {
        const norm = this.normFor(client);
        const mapId =
          this.getPlayerMapId(client.sessionId) ?? "exterior";
        if (!norm) {
          client.send("housing:error", { message: "Jugador no encontrado" });
          return;
        }
        const housing = this.housingByNorm.get(norm) ?? emptyHousing();
        if (!housing.clearedDebrisIds) housing.clearedDebrisIds = [];
        const plotId = housing.ownedPlotId;
        if (!plotId) {
          client.send("housing:error", {
            message: "Primero compra un lote para limpiar escombros",
          });
          return;
        }
        const plot = getHousingPlotById(plotId);
        if (!plot || plot.mapId !== mapId) {
          client.send("housing:error", { message: "Lote no válido aquí" });
          return;
        }

        const pos = this.getPlayerPosition(client.sessionId);
        if (!pos) {
          client.send("housing:error", { message: "Posición desconocida" });
          return;
        }

        const clearedSet = new Set(housing.clearedDebrisIds);
        const mineTemplate = getDebrisTemplateForPlot(plotId).filter(
          (d) => d.mapId === mapId && !clearedSet.has(d.id)
        );

        let target: PlotDebrisTemplateItem | undefined;

        if (typeof data?.debrisId === "string" && data.debrisId) {
          const t = findPlotDebrisTemplateItem(data.debrisId);
          if (
            t &&
            t.plotId === plotId &&
            t.mapId === mapId &&
            !clearedSet.has(t.id)
          ) {
            target = t;
          }
        } else if (data?.nearest) {
          let best: (typeof mineTemplate)[0] | undefined;
          let bestD = Infinity;
          for (const d of mineTemplate) {
            const dist = Math.hypot(pos.x - d.x, pos.z - d.z);
            if (dist < bestD) {
              bestD = dist;
              best = d;
            }
          }
          if (best && bestD <= MAX_CLEAR_DEBRIS_DIST) target = best;
        }

        if (!target) {
          client.send("housing:error", {
            message:
              "No hay escombro cercano en tu parcela (≤4 m) o ya fue limpiado.",
          });
          return;
        }

        if (!isPointInsidePlotXZ(plot, target.x, target.z)) {
          client.send("housing:error", {
            message: "Escombro fuera de parcela",
          });
          return;
        }

        const dPlayer = Math.hypot(pos.x - target.x, pos.z - target.z);
        if (dPlayer > MAX_CLEAR_DEBRIS_DIST) {
          client.send("housing:error", {
            message: "Acércate más al escombro (≤4 m)",
          });
          return;
        }

        const granted: { itemId: string; quantity: number }[] = [];
        for (const r of target.reward) {
          const itemId = r.itemId;
          const quantity = Math.max(
            0,
            Math.floor(typeof r.quantity === "number" ? r.quantity : 0)
          );
          if (quantity <= 0) continue;
          const added = this.inventory.addItemFromWorld(
            client.sessionId,
            refundBaseForCatalogItem(itemId, quantity)
          );
          if (added < quantity) {
            for (const g of granted) {
              this.inventory.tryConsumeCatalogItems(client.sessionId, [
                { itemId: g.itemId, quantity: g.quantity },
              ]);
            }
            client.send("housing:error", {
              message:
                "Inventario lleno o sin capacidad de peso — libera espacio e inténtalo de nuevo",
            });
            return;
          }
          granted.push({ itemId, quantity });
        }

        housing.clearedDebrisIds = [...housing.clearedDebrisIds, target.id];
        this.housingByNorm.set(norm, housing);

        client.send("housing:debrisCleared", { debrisId: target.id });
        this.broadcastMap(mapId);
      }
    );

    this.room.onMessage(
      "housing:upgrade",
      (
        client: Client,
        data: {
          structureId?: string;
          nearest?: boolean;
          mode?: HousingUpgradeMode;
        }
      ) => {
        const norm = this.normFor(client);
        const mapId =
          this.getPlayerMapId(client.sessionId) ?? "exterior";
        const mode: HousingUpgradeMode =
          data?.mode === "cash" ? "cash" : "materials";
        if (!norm) {
          client.send("housing:error", { message: "Jugador no encontrado" });
          return;
        }
        const housing = this.housingByNorm.get(norm) ?? emptyHousing();
        const plotId = housing.ownedPlotId;
        if (!plotId) {
          client.send("housing:error", { message: "Sin lote asignado" });
          return;
        }
        const plot = getHousingPlotById(plotId);
        if (!plot || plot.mapId !== mapId) {
          client.send("housing:error", { message: "Lote no válido aquí" });
          return;
        }

        const pos = this.getPlayerPosition(client.sessionId);
        if (!pos) {
          client.send("housing:error", { message: "Posición desconocida" });
          return;
        }

        const mineOnMap = housing.structures.filter(
          (s) => s.mapId === mapId && s.ownerNorm === norm
        );
        let target: HousingStructureRecord | undefined;

        if (typeof data?.structureId === "string" && data.structureId) {
          target = mineOnMap.find((s) => s.id === data.structureId);
        } else if (data?.nearest) {
          let best: HousingStructureRecord | undefined;
          let bestD = Infinity;
          for (const s of mineOnMap) {
            const d = Math.hypot(pos.x - s.x, pos.z - s.z);
            if (d < bestD) {
              bestD = d;
              best = s;
            }
          }
          if (best && bestD <= MAX_UPGRADE_DIST) target = best;
        }

        if (!target) {
          client.send("housing:error", {
            message:
              "No hay cabaña tuya cerca (≤8 m) o id inválido. Acércate y usa “más cercana”.",
          });
          return;
        }

        if (!isPointInsidePlotXZ(plot, target.x, target.z)) {
          client.send("housing:error", {
            message: "La estructura quedó fuera de tu parcela",
          });
          return;
        }

        const dPlayer = Math.hypot(pos.x - target.x, pos.z - target.z);
        if (dPlayer > MAX_UPGRADE_DIST) {
          client.send("housing:error", {
            message: "Acércate más a la cabaña para mejorarla",
          });
          return;
        }

        const curTier = normalizeStructureTier(target.tier);
        const def = getCabinUpgradeDef(target.kind, curTier);
        if (!def) {
          client.send("housing:error", {
            message: "Esta cabaña ya está al máximo de mejora",
          });
          return;
        }

        if (mode === "cash") {
          const ok = this.economy.chargeWalletMajor(
            client.sessionId,
            def.cashShortcutMajor,
            `housing:upgrade:cash:${target.id}`
          );
          if (!ok) {
            client.send("housing:error", {
              message: `Necesitas ${def.cashShortcutMajor} créditos para el atajo de mejora`,
            });
            return;
          }
        } else {
          const consumed = this.inventory.tryConsumeCatalogItems(
            client.sessionId,
            def.materials
          );
          if (!consumed) {
            client.send("housing:error", {
              message:
                "Materiales insuficientes (piedra ×12 + tablas ×8) o usa el atajo con créditos",
            });
            return;
          }
        }

        target.tier = def.nextTier;
        target.hp =
          typeof target.hp === "number"
            ? Math.min(200, target.hp + 50)
            : 150;

        this.housingByNorm.set(norm, housing);

        const patchWorld = this.worldStructures.find((s) => s.id === target.id);
        if (patchWorld) {
          patchWorld.tier = target.tier;
          patchWorld.hp = target.hp;
        }

        client.send("housing:upgraded", {
          structureId: target.id,
          tier: target.tier,
          mode,
        });
        this.broadcastMap(mapId);
      }
    );

    this.room.onMessage(
      "farm:interact",
      (client: Client, data: { slotIndex?: number }) => {
        const slotIndex = Math.floor(Number(data?.slotIndex));
        const mapId =
          this.getPlayerMapId(client.sessionId) ?? "exterior";
        const norm = this.normFor(client);
        if (!norm) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Jugador no encontrado",
          });
          return;
        }
        if (!Number.isFinite(slotIndex) || slotIndex < 0) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Bancal inválido",
          });
          return;
        }

        const housing = this.housingByNorm.get(norm) ?? emptyHousing();
        if (!housing.farmSlots) housing.farmSlots = [];
        const plotId = housing.ownedPlotId;
        if (!plotId) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Necesitas un lote para usar el huerto",
          });
          return;
        }

        const tpl = getFarmSlotTemplate(plotId, slotIndex);
        if (!tpl || tpl.mapId !== mapId) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Este bancal no existe en tu parcela",
          });
          return;
        }

        const plot = getHousingPlotById(plotId);
        if (!plot || plot.mapId !== mapId) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Parcela no válida en este mapa",
          });
          return;
        }

        const pos = this.getPlayerPosition(client.sessionId);
        if (!pos) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Posición desconocida",
          });
          return;
        }

        const dPlayer = Math.hypot(pos.x - tpl.x, pos.z - tpl.z);
        if (dPlayer > tpl.radius + FARM_SLOT_DIST_SLACK) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Acércate más al bancal",
          });
          return;
        }

        if (!isPointInsidePlotXZ(plot, tpl.x, tpl.z)) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Bancal fuera de parcela (datos inconsistentes)",
          });
          return;
        }

        const existing = housing.farmSlots.find(
          (s) => s.slotIndex === slotIndex
        );

        if (!existing) {
          let chosen: FarmCropId | null = null;
          for (const cid of FARM_CROP_IDS) {
            const def = FARM_CROPS[cid];
            const consumed = this.inventory.tryConsumeCatalogItems(
              client.sessionId,
              [{ itemId: def.seedItemId, quantity: 1 }]
            );
            if (consumed) {
              chosen = cid;
              break;
            }
          }
          if (!chosen) {
            client.send("farm:result", {
              ok: false,
              action: "error",
              message:
                "Necesitas semillas (p. ej. lechuga en la tienda general)",
            });
            return;
          }

          const plantedAt = Date.now();
          housing.farmSlots.push({
            slotIndex,
            cropId: chosen,
            plantedAt,
            mapId: tpl.mapId,
          });
          this.housingByNorm.set(norm, housing);
          client.send("farm:result", {
            ok: true,
            action: "planted",
            slotIndex,
            cropId: chosen,
          });
          this.broadcastMap(mapId);
          return;
        }

        if (!isFarmCropId(existing.cropId)) {
          housing.farmSlots = housing.farmSlots.filter(
            (s) => s.slotIndex !== slotIndex
          );
          this.housingByNorm.set(norm, housing);
          client.send("farm:result", {
            ok: false,
            action: "error",
            message: "Cultivo corrupto — bancal vaciado",
          });
          this.broadcastMap(mapId);
          return;
        }

        const cropDef = FARM_CROPS[existing.cropId];
        const readyAt = existing.plantedAt + cropDef.growTimeMs;
        const now = Date.now();
        if (now < readyAt) {
          client.send("farm:result", {
            ok: false,
            action: "growing",
            slotIndex,
            msLeft: readyAt - now,
          });
          return;
        }

        const qty = Math.max(1, Math.floor(cropDef.harvestQuantity));
        const added = this.inventory.addItemFromWorld(
          client.sessionId,
          refundBaseForCatalogItem(cropDef.harvestItemId, qty)
        );
        if (added < qty) {
          client.send("farm:result", {
            ok: false,
            action: "error",
            message:
              "No cabe la cosecha en el inventario — libera espacio e inténtalo de nuevo",
          });
          return;
        }

        housing.farmSlots = housing.farmSlots.filter(
          (s) => s.slotIndex !== slotIndex
        );
        this.housingByNorm.set(norm, housing);
        this.awardExperience?.(client.sessionId, RPG_XP_FARM_HARVEST);
        client.send("farm:result", {
          ok: true,
          action: "harvested",
          slotIndex,
          itemId: cropDef.harvestItemId,
          quantity: qty,
        });
        this.broadcastMap(mapId);
      }
    );

    this.room.onMessage(
      "stall:addListing",
      (
        client: Client,
        data: {
          plotId?: string;
          itemId?: string;
          quantity?: number;
          priceMajor?: number;
        }
      ) => {
        const plotId = typeof data?.plotId === "string" ? data.plotId : "";
        const itemId = typeof data?.itemId === "string" ? data.itemId : "";
        const qty = Math.floor(Number(data?.quantity));
        const price = Math.floor(Number(data?.priceMajor));
        const mapId =
          this.getPlayerMapId(client.sessionId) ?? "exterior";
        const norm = this.normFor(client);
        if (!norm) {
          client.send("stall:result", {
            ok: false,
            message: "Jugador no encontrado",
          });
          return;
        }
        if (plotId !== PRODUCE_STALL_KIOSK.plotId) {
          client.send("stall:result", {
            ok: false,
            message: "Este puesto solo aplica al lote A1",
          });
          return;
        }
        const ownerNorm = this.findPlotOwnerNorm(plotId);
        if (!ownerNorm || ownerNorm !== norm) {
          client.send("stall:result", {
            ok: false,
            message: "Solo el dueño del lote puede surtir el puesto",
          });
          return;
        }
        const pos = this.getPlayerPosition(client.sessionId);
        if (!pos || !isNearProduceStallKiosk(mapId, pos)) {
          client.send("stall:result", {
            ok: false,
            message: "Acércate al mostrador del puesto",
          });
          return;
        }
        if (
          !isProduceStallItemId(itemId) ||
          !ITEMS_CATALOG[itemId as keyof typeof ITEMS_CATALOG]
        ) {
          client.send("stall:result", {
            ok: false,
            message: "Ítem no vendible aquí (solo consumibles permitidos)",
          });
          return;
        }
        if (
          !Number.isFinite(qty) ||
          qty < 1 ||
          qty > 99 ||
          !Number.isFinite(price) ||
          price < PRODUCE_STALL_MIN_PRICE_MAJOR ||
          price > PRODUCE_STALL_MAX_PRICE_MAJOR
        ) {
          client.send("stall:result", {
            ok: false,
            message: "Cantidad o precio inválido",
          });
          return;
        }
        const housing = this.housingByNorm.get(norm) ?? emptyHousing();
        if (!housing.playerStall) {
          housing.playerStall = { listings: [], pendingCreditsMajor: 0 };
        }
        if (housing.playerStall.listings.length >= PRODUCE_STALL_MAX_LISTINGS) {
          client.send("stall:result", {
            ok: false,
            message: "Límite de anuncios en el puesto",
          });
          return;
        }
        const consumed = this.inventory.tryConsumeCatalogItems(
          client.sessionId,
          [{ itemId, quantity: qty }]
        );
        if (!consumed) {
          client.send("stall:result", {
            ok: false,
            message: "No tienes esa cantidad en el inventario",
          });
          return;
        }
        const id = `sl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        housing.playerStall.listings.push({
          id,
          itemId,
          quantity: qty,
          priceMajor: price,
        });
        this.housingByNorm.set(norm, housing);
        client.send("stall:result", { ok: true, action: "listed" });
        this.broadcastMap(mapId);
      }
    );

    this.room.onMessage(
      "stall:removeListing",
      (client: Client, data: { plotId?: string; listingId?: string }) => {
        const plotId = typeof data?.plotId === "string" ? data.plotId : "";
        const listingId =
          typeof data?.listingId === "string" ? data.listingId : "";
        const mapId =
          this.getPlayerMapId(client.sessionId) ?? "exterior";
        const norm = this.normFor(client);
        if (!norm) {
          client.send("stall:result", {
            ok: false,
            message: "Jugador no encontrado",
          });
          return;
        }
        if (plotId !== PRODUCE_STALL_KIOSK.plotId) {
          client.send("stall:result", { ok: false, message: "Lote inválido" });
          return;
        }
        const ownerNorm = this.findPlotOwnerNorm(plotId);
        if (!ownerNorm || ownerNorm !== norm) {
          client.send("stall:result", {
            ok: false,
            message: "No eres el dueño del puesto",
          });
          return;
        }
        const pos = this.getPlayerPosition(client.sessionId);
        if (!pos || !isNearProduceStallKiosk(mapId, pos)) {
          client.send("stall:result", {
            ok: false,
            message: "Acércate al mostrador",
          });
          return;
        }
        const housing = this.housingByNorm.get(norm) ?? emptyHousing();
        if (!housing.playerStall?.listings.length) {
          client.send("stall:result", {
            ok: false,
            message: "No hay anuncios que quitar",
          });
          return;
        }
        const idx = housing.playerStall.listings.findIndex(
          (l) => l.id === listingId
        );
        if (idx < 0) {
          client.send("stall:result", {
            ok: false,
            message: "Anuncio no encontrado",
          });
          return;
        }
        const [removed] = housing.playerStall.listings.splice(idx, 1);
        this.housingByNorm.set(norm, housing);
        const added = this.inventory.addItemFromWorld(
          client.sessionId,
          refundBaseForCatalogItem(removed.itemId, removed.quantity)
        );
        if (added < removed.quantity) {
          housing.playerStall.listings.splice(idx, 0, removed);
          this.housingByNorm.set(norm, housing);
          client.send("stall:result", {
            ok: false,
            message: "Inventario lleno — no se pudo devolver el stock",
          });
          return;
        }
        client.send("stall:result", { ok: true, action: "unlisted" });
        this.broadcastMap(mapId);
      }
    );

    this.room.onMessage(
      "stall:buy",
      (
        client: Client,
        data: {
          plotId?: string;
          listingId?: string;
          quantity?: number;
        }
      ) => {
        const plotId = typeof data?.plotId === "string" ? data.plotId : "";
        const listingId =
          typeof data?.listingId === "string" ? data.listingId : "";
        const wantQty = Math.floor(Number(data?.quantity));
        const mapId =
          this.getPlayerMapId(client.sessionId) ?? "exterior";
        const buyerNorm = this.normFor(client);
        if (!buyerNorm) {
          client.send("stall:result", {
            ok: false,
            message: "Jugador no encontrado",
          });
          return;
        }
        if (plotId !== PRODUCE_STALL_KIOSK.plotId) {
          client.send("stall:result", { ok: false, message: "Lote inválido" });
          return;
        }
        const sellerNorm = this.findPlotOwnerNorm(plotId);
        if (!sellerNorm) {
          client.send("stall:result", {
            ok: false,
            message: "Este lote no tiene dueño todavía",
          });
          return;
        }
        if (sellerNorm === buyerNorm) {
          client.send("stall:result", {
            ok: false,
            message: "No puedes comprar en tu propio puesto",
          });
          return;
        }
        const pos = this.getPlayerPosition(client.sessionId);
        if (!pos || !isNearProduceStallKiosk(mapId, pos)) {
          client.send("stall:result", {
            ok: false,
            message: "Acércate al mostrador para comprar",
          });
          return;
        }
        if (!Number.isFinite(wantQty) || wantQty < 1) {
          client.send("stall:result", {
            ok: false,
            message: "Cantidad inválida",
          });
          return;
        }
        const sellerHousing =
          this.housingByNorm.get(sellerNorm) ?? emptyHousing();
        if (!sellerHousing.playerStall?.listings.length) {
          client.send("stall:result", {
            ok: false,
            message: "El puesto está vacío",
          });
          return;
        }
        const lix = sellerHousing.playerStall.listings.findIndex(
          (l) => l.id === listingId
        );
        if (lix < 0) {
          client.send("stall:result", {
            ok: false,
            message: "Ese artículo ya no está a la venta",
          });
          return;
        }
        const listing = sellerHousing.playerStall.listings[lix];
        const take = Math.min(wantQty, listing.quantity);
        const gross = listing.priceMajor * take;
        if (
          !this.economy.chargeWalletMajor(
            client.sessionId,
            gross,
            `stall:buy:${listing.itemId}`
          )
        ) {
          client.send("stall:result", {
            ok: false,
            message: "Saldo insuficiente",
          });
          return;
        }
        const added = this.inventory.addItemFromWorld(
          client.sessionId,
          refundBaseForCatalogItem(listing.itemId, take)
        );
        if (added < take) {
          this.economy.creditWalletMajor(
            client.sessionId,
            gross,
            "stall:refund"
          );
          client.send("stall:result", {
            ok: false,
            message: "No cabe en el inventario — compra cancelada",
          });
          return;
        }
        const tax = Math.floor(gross * PRODUCE_STALL_TAX_RATE);
        const net = Math.max(0, gross - tax);
        listing.quantity -= take;
        if (listing.quantity <= 0) {
          sellerHousing.playerStall.listings.splice(lix, 1);
        }
        this.housingByNorm.set(sellerNorm, sellerHousing);
        const sellerSession = this.sessionIdForUsernameNorm(sellerNorm);
        if (sellerSession) {
          this.economy.creditWalletMajor(
            sellerSession,
            net,
            `stall:sale:${listing.itemId}`
          );
        } else {
          if (!sellerHousing.playerStall) {
            sellerHousing.playerStall = { listings: [], pendingCreditsMajor: 0 };
          }
          sellerHousing.playerStall.pendingCreditsMajor =
            (sellerHousing.playerStall.pendingCreditsMajor ?? 0) + net;
          this.housingByNorm.set(sellerNorm, sellerHousing);
        }
        client.send("stall:result", {
          ok: true,
          action: "bought",
          itemId: listing.itemId,
          quantity: take,
          total: gross,
        });
        this.broadcastMap(mapId);
      }
    );
  }
}
