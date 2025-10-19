import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Player, Vector3, PlayerStats, PlayerMovement, PlayerAnimation } from '@/types/player.types';

interface PlayerState {
  // Player data
  player: Player | null;
  isOnline: boolean;
  
  // Movement
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  isMoving: boolean;
  isRunning: boolean;
  isJumping: boolean;
  
  // Stats
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  level: number;
  experience: number;
  stats: PlayerStats;
  
  // Animation
  currentAnimation: string;
  isAnimationPlaying: boolean;
  animationSpeed: number;
  
  // Actions
  setPlayer: (player: Player) => void;
  updatePlayer: (updates: Partial<Player>) => void;
  updatePosition: (position: Vector3) => void;
  updateRotation: (rotation: Vector3) => void;
  updateVelocity: (velocity: Vector3) => void;
  setMoving: (isMoving: boolean) => void;
  setRunning: (isRunning: boolean) => void;
  setJumping: (isJumping: boolean) => void;
  updateHealth: (health: number) => void;
  updateStamina: (stamina: number) => void;
  updateLevel: (level: number) => void;
  updateExperience: (experience: number) => void;
  updateStats: (stats: Partial<PlayerStats>) => void;
  setAnimation: (animation: string, speed?: number) => void;
  setOnline: (isOnline: boolean) => void;
  resetPlayer: () => void;
}

const initialStats: PlayerStats = {
  strength: 10,
  agility: 10,
  intelligence: 10,
  vitality: 10,
  luck: 10,
};

export const usePlayerStore = create<PlayerState>()(
  devtools(
    (set, get) => ({
      // Initial state
      player: null,
      isOnline: false,
      position: { x: 0, y: 1.05, z: 0 }, // Y=1.05 (ligeramente elevado para evitar rebotes)
      rotation: { x: 0, y: Math.PI, z: 0 }, // Inicia mirando hacia adelante (180° en radianes)
      velocity: { x: 0, y: 0, z: 0 },
      isMoving: false,
      isRunning: false,
      isJumping: false,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
      stats: initialStats,
      currentAnimation: 'idle',
      isAnimationPlaying: false,
      animationSpeed: 1,

      // Actions
      setPlayer: (player) => {
        set({
          player,
          isOnline: player.isOnline,
          position: player.position,
          rotation: player.rotation,
          health: player.health,
          maxHealth: player.maxHealth,
          stamina: player.stamina,
          maxStamina: player.maxStamina,
          level: player.level,
          experience: player.experience,
        });
      },

      updatePlayer: (updates) => {
        const { player } = get();
        if (player) {
          const updatedPlayer = { ...player, ...updates };
          set({ player: updatedPlayer });
          
          // Update individual state if needed
          if (updates.position) set({ position: updates.position });
          if (updates.rotation) set({ rotation: updates.rotation });
          if (updates.health !== undefined) set({ health: updates.health });
          if (updates.maxHealth !== undefined) set({ maxHealth: updates.maxHealth });
          if (updates.stamina !== undefined) set({ stamina: updates.stamina });
          if (updates.maxStamina !== undefined) set({ maxStamina: updates.maxStamina });
          if (updates.level !== undefined) set({ level: updates.level });
          if (updates.experience !== undefined) set({ experience: updates.experience });
          if (updates.isOnline !== undefined) set({ isOnline: updates.isOnline });
        }
      },

      updatePosition: (position) => {
        set({ position });
        const { player } = get();
        if (player) {
          set({ player: { ...player, position } });
        }
      },

      updateRotation: (rotation) => {
        set({ rotation });
        const { player } = get();
        if (player) {
          set({ player: { ...player, rotation } });
        }
      },

      updateVelocity: (velocity) => {
        set({ velocity });
      },

      setMoving: (isMoving) => {
        set({ isMoving });
        if (isMoving) {
          set({ currentAnimation: 'walk' });
        } else {
          set({ currentAnimation: 'idle' });
        }
      },

      setRunning: (isRunning) => {
        set({ isRunning });
        if (isRunning) {
          set({ currentAnimation: 'run' });
        } else {
          set({ currentAnimation: 'walk' });
        }
      },

      setJumping: (isJumping) => {
        set({ isJumping });
        if (isJumping) {
          set({ currentAnimation: 'jump' });
        }
      },

      updateHealth: (health) => {
        set({ health });
        const { player } = get();
        if (player) {
          set({ player: { ...player, health } });
        }
      },

      updateStamina: (stamina) => {
        set({ stamina });
        const { player } = get();
        if (player) {
          set({ player: { ...player, stamina } });
        }
      },

      updateLevel: (level) => {
        set({ level });
        const { player } = get();
        if (player) {
          set({ player: { ...player, level } });
        }
      },

      updateExperience: (experience) => {
        set({ experience });
        const { player } = get();
        if (player) {
          set({ player: { ...player, experience } });
        }
      },

      updateStats: (newStats) => {
        set((state) => ({
          stats: { ...state.stats, ...newStats }
        }));
      },

      setAnimation: (animation, speed = 1) => {
        set({
          currentAnimation: animation,
          isAnimationPlaying: true,
          animationSpeed: speed,
        });
      },

      setOnline: (isOnline) => {
        set({ isOnline });
        const { player } = get();
        if (player) {
          set({ player: { ...player, isOnline } });
        }
      },

      resetPlayer: () => {
        set({
          player: null,
          isOnline: false,
          position: { x: 0, y: 1.05, z: 0 }, // Y=1.05 (ligeramente elevado para evitar rebotes)
          rotation: { x: 0, y: Math.PI, z: 0 }, // Inicia mirando hacia adelante (180° en radianes)
          velocity: { x: 0, y: 0, z: 0 },
          isMoving: false,
          isRunning: false,
          isJumping: false,
          health: 100,
          maxHealth: 100,
          stamina: 100,
          maxStamina: 100,
          level: 1,
          experience: 0,
          stats: initialStats,
          currentAnimation: 'idle',
          isAnimationPlaying: false,
          animationSpeed: 1,
        });
      },
    }),
    {
      name: 'player-store',
    }
  )
);
