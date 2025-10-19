import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DecorationData {
  id: string;
  type: 'tree' | 'rock' | 'grass' | 'plant';
  position: [number, number, number];
  rotation: number;
  scale: number;
  modelIndex: number;
}

interface WorldObjectsState {
  decorations: DecorationData[];
  buildingsColliders: Map<string, { position: [number, number, number]; size: [number, number, number] }>;
  
  // Actions
  setDecorations: (decorations: DecorationData[]) => void;
  getDecorations: () => DecorationData[];
  addBuildingCollider: (id: string, position: [number, number, number], size: [number, number, number]) => void;
  getBuildingColliders: () => Map<string, { position: [number, number, number]; size: [number, number, number] }>;
  clearAll: () => void;
}

export const useWorldObjectsStore = create<WorldObjectsState>()(
  persist(
    (set, get) => ({
      decorations: [],
      buildingsColliders: new Map(),

      setDecorations: (decorations) => {
        set({ decorations });
        console.log(`💾 Saved ${decorations.length} decorations to store`);
      },

      getDecorations: () => {
        return get().decorations;
      },

      addBuildingCollider: (id, position, size) => {
        const colliders = get().buildingsColliders;
        colliders.set(id, { position, size });
        set({ buildingsColliders: new Map(colliders) });
      },

      getBuildingColliders: () => {
        return get().buildingsColliders;
      },

      clearAll: () => {
        set({ decorations: [], buildingsColliders: new Map() });
        console.log('🧹 Cleared all world objects');
      },
    }),
    {
      name: 'world-objects-storage',
      // Solo persistir decorations, no buildingsColliders
      partialize: (state) => ({ decorations: state.decorations }),
    }
  )
);

