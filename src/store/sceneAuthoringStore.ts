import { create } from "zustand";
import type { SceneDocumentV0_1 } from "@nexusworld3d/content-schema";

type SceneAuthoringState = {
  document: SceneDocumentV0_1 | null;
  appliedAt: number | null;
  roomId: string | null;
  setApplied: (payload: {
    document: SceneDocumentV0_1;
    appliedAt: number;
    roomId: string;
  }) => void;
  clear: () => void;
};

export const useSceneAuthoringStore = create<SceneAuthoringState>((set) => ({
  document: null,
  appliedAt: null,
  roomId: null,
  setApplied: (payload) =>
    set({
      document: payload.document,
      appliedAt: payload.appliedAt,
      roomId: payload.roomId,
    }),
  clear: () =>
    set({
      document: null,
      appliedAt: null,
      roomId: null,
    }),
}));
