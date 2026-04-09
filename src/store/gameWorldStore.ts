import { create } from "zustand";

/**
 * ES: Mapa activo del cliente (CityModel / interiores) para pickup/drop y mensajes al servidor.
 * EN: Client active map id for world item sync.
 */
interface GameWorldState {
  activeMapId: string;
  setActiveMapId: (mapId: string) => void;
}

export const useGameWorldStore = create<GameWorldState>()((set) => ({
  activeMapId: "exterior",
  setActiveMapId: (mapId) => set({ activeMapId: mapId }),
}));
