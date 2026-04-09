import { create } from "zustand";
import type { BuildPieceId } from "@/constants/buildPieces";

interface BuildPreviewState {
  /** ES: Pieza a colocar con fantasma + E. EN: Piece to place with ghost + E confirm. */
  previewPieceId: BuildPieceId | null;
  setBuildPreviewPieceId: (id: BuildPieceId | null) => void;
}

export const useBuildPreviewStore = create<BuildPreviewState>()((set) => ({
  previewPieceId: null,
  setBuildPreviewPieceId: (id) => set({ previewPieceId: id }),
}));
