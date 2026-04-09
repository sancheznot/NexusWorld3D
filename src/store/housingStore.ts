import { create } from "zustand";
import type {
  BuildPieceRecord,
  HousingFarmSlotRecord,
  HousingStructureRecord,
  StallListing,
} from "@/types/housing.types";

interface HousingState {
  structures: HousingStructureRecord[];
  pieces: BuildPieceRecord[];
  ownedPlotId: string | null;
  clearedPlotDebrisIds: string[];
  farmSlots: HousingFarmSlotRecord[];
  produceStall: { plotId: string; listings: StallListing[] } | null;
  setFromSync: (
    structures: HousingStructureRecord[],
    pieces: BuildPieceRecord[],
    ownedPlotId: string | null,
    clearedPlotDebrisIds: string[],
    farmSlots: HousingFarmSlotRecord[],
    produceStall: { plotId: string; listings: StallListing[] } | null
  ) => void;
  reset: () => void;
}

export const useHousingStore = create<HousingState>()((set) => ({
  structures: [],
  pieces: [],
  ownedPlotId: null,
  clearedPlotDebrisIds: [],
  farmSlots: [],
  produceStall: null,
  setFromSync: (
    structures,
    pieces,
    ownedPlotId,
    clearedPlotDebrisIds,
    farmSlots,
    produceStall
  ) =>
    set({
      structures,
      pieces,
      ownedPlotId,
      clearedPlotDebrisIds,
      farmSlots,
      produceStall,
    }),
  reset: () =>
    set({
      structures: [],
      pieces: [],
      ownedPlotId: null,
      clearedPlotDebrisIds: [],
      farmSlots: [],
      produceStall: null,
    }),
}));
