import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { World, WorldObject } from '@/types/world.types';
import { Player } from '@/types/player.types';

interface WorldState {
  // Current world
  currentWorld: World | null;
  worldId: string;
  
  // Players in current world
  players: Player[];
  playerCount: number;
  
  // World objects
  objects: WorldObject[];
  
  // World loading state
  isLoading: boolean;
  isLoaded: boolean;
  
  // Actions
  setCurrentWorld: (world: World) => void;
  setWorldId: (worldId: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setPlayers: (players: Player[]) => void;
  addObject: (object: WorldObject) => void;
  removeObject: (objectId: string) => void;
  updateObject: (objectId: string, updates: Partial<WorldObject>) => void;
  setObjects: (objects: WorldObject[]) => void;
  setLoading: (isLoading: boolean) => void;
  setLoaded: (isLoaded: boolean) => void;
  clearWorld: () => void;
}

const initialWorld: World = {
  id: 'default',
  name: 'Hotel Humboldt',
  type: 'hotel',
  maxPlayers: 50,
  currentPlayers: 0,
  spawnPoint: { x: 0, y: 0, z: 0 },
  bounds: {
    min: { x: -100, y: 0, z: -100 },
    max: { x: 100, y: 50, z: 100 }
  },
  isActive: true,
  createdAt: new Date(),
};

export const useWorldStore = create<WorldState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentWorld: null,
      worldId: 'default',
      players: [],
      playerCount: 0,
      objects: [],
      isLoading: false,
      isLoaded: false,

      // Actions
      setCurrentWorld: (world) => {
        set({
          currentWorld: world,
          worldId: world.id,
          playerCount: world.currentPlayers,
        });
      },

      setWorldId: (worldId) => {
        set({ worldId });
      },

      addPlayer: (player) => {
        set((state) => {
          const existingPlayerIndex = state.players.findIndex(p => p.id === player.id);
          let newPlayers;
          
          if (existingPlayerIndex >= 0) {
            // Update existing player
            newPlayers = [...state.players];
            newPlayers[existingPlayerIndex] = player;
          } else {
            // Add new player
            newPlayers = [...state.players, player];
          }
          
          return {
            players: newPlayers,
            playerCount: newPlayers.length,
          };
        });
      },

      removePlayer: (playerId) => {
        set((state) => {
          const newPlayers = state.players.filter(p => p.id !== playerId);
          return {
            players: newPlayers,
            playerCount: newPlayers.length,
          };
        });
      },

      updatePlayer: (playerId, updates) => {
        set((state) => {
          const newPlayers = state.players.map(player =>
            player.id === playerId ? { ...player, ...updates } : player
          );
          return { players: newPlayers };
        });
      },

      setPlayers: (players) => {
        set({
          players,
          playerCount: players.length,
        });
      },

      addObject: (object) => {
        set((state) => {
          const existingObjectIndex = state.objects.findIndex(o => o.id === object.id);
          let newObjects;
          
          if (existingObjectIndex >= 0) {
            // Update existing object
            newObjects = [...state.objects];
            newObjects[existingObjectIndex] = object;
          } else {
            // Add new object
            newObjects = [...state.objects, object];
          }
          
          return { objects: newObjects };
        });
      },

      removeObject: (objectId) => {
        set((state) => ({
          objects: state.objects.filter(o => o.id !== objectId)
        }));
      },

      updateObject: (objectId, updates) => {
        set((state) => ({
          objects: state.objects.map(object =>
            object.id === objectId ? { ...object, ...updates } : object
          )
        }));
      },

      setObjects: (objects) => {
        set({ objects });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setLoaded: (isLoaded) => {
        set({ isLoaded });
      },

      clearWorld: () => {
        set({
          currentWorld: null,
          worldId: 'default',
          players: [],
          playerCount: 0,
          objects: [],
          isLoading: false,
          isLoaded: false,
        });
      },
    }),
    {
      name: 'world-store',
    }
  )
);
