import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ExtendedJobId } from '@/constants/jobs';

interface UIState {
  // Modal states
  isInventoryOpen: boolean;
  isMapOpen: boolean;
  isChatOpen: boolean;
  isShopOpen: boolean;
  isJobsOpen: boolean;
  selectedJobId: ExtendedJobId | null;
  isBankOpen: boolean;
  isSettingsOpen: boolean;
  /** ES: Menú de pausa (Esc). EN: Pause menu (Esc). */
  isPauseMenuOpen: boolean;
  /** ES: Ranura rápida seleccionada 0–4. EN: Selected quick slot 0–4. */
  hotbarSelectedSlot: number;
  showCharacterCreator: boolean;
  
  // HUD visibility
  isHUDVisible: boolean;
  isMinimapVisible: boolean;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Notifications
  notifications: Notification[];
  
  // Chat
  chatMessages: ChatMessage[];
  chatInput: string;
  chatChannel: string;
  
  // Actions
  toggleInventory: () => void;
  toggleMap: () => void;
  toggleChat: () => void;
  toggleShop: () => void;
  toggleJobs: () => void;
  openJobsPanel: (jobId: ExtendedJobId) => void;
  closeJobs: () => void;
  toggleBank: () => void;
  toggleSettings: () => void;
  togglePauseMenu: () => void;
  setPauseMenuOpen: (open: boolean) => void;
  setHotbarSelectedSlot: (slot: number) => void;
  setInventoryOpen: (isOpen: boolean) => void;
  setShowCharacterCreator: (show: boolean) => void;
  setMapOpen: (isOpen: boolean) => void;
  setChatOpen: (isOpen: boolean) => void;
  setShopOpen: (isOpen: boolean) => void;
  setJobsOpen: (isOpen: boolean) => void;
  setBankOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setHUDVisible: (isVisible: boolean) => void;
  setMinimapVisible: (isVisible: boolean) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatInput: (input: string) => void;
  setChatChannel: (channel: string) => void;
  clearChat: () => void;
  closeAllModals: () => void;
  setSelectedJobId: (jobId: ExtendedJobId | null) => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  message: string;
  channel: string;
  timestamp: Date;
  type?: 'player' | 'system' | 'admin';
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isInventoryOpen: false,
      isMapOpen: false,
      isChatOpen: false,
      isShopOpen: false,
      isJobsOpen: false,
      selectedJobId: null,
      isBankOpen: false,
      isSettingsOpen: false,
      isPauseMenuOpen: false,
      hotbarSelectedSlot: 0,
      showCharacterCreator: false,
      isHUDVisible: true,
      isMinimapVisible: true,
      isLoading: false,
      loadingMessage: '',
      notifications: [],
      chatMessages: [],
      chatInput: '',
      chatChannel: 'global',

      // Actions
      toggleInventory: () => {
        set((state) => ({
          isInventoryOpen: !state.isInventoryOpen,
          isMapOpen: state.isInventoryOpen ? state.isMapOpen : false,
          isShopOpen: state.isInventoryOpen ? state.isShopOpen : false,
          isSettingsOpen: state.isInventoryOpen ? state.isSettingsOpen : false,
          isPauseMenuOpen: state.isInventoryOpen ? state.isPauseMenuOpen : false,
        }));
      },

      toggleMap: () => {
        set((state) => ({
          isMapOpen: !state.isMapOpen,
          isInventoryOpen: state.isMapOpen ? state.isInventoryOpen : false,
          isShopOpen: state.isMapOpen ? state.isShopOpen : false,
          isSettingsOpen: state.isMapOpen ? state.isSettingsOpen : false,
          isPauseMenuOpen: state.isMapOpen ? state.isPauseMenuOpen : false,
        }));
      },

      toggleChat: () => {
        set((state) => ({
          isChatOpen: !state.isChatOpen,
        }));
      },

      toggleShop: () => {
        set((state) => ({
          isShopOpen: !state.isShopOpen,
          isInventoryOpen: state.isShopOpen ? state.isInventoryOpen : false,
          isMapOpen: state.isShopOpen ? state.isMapOpen : false,
          isSettingsOpen: state.isShopOpen ? state.isSettingsOpen : false,
          isPauseMenuOpen: state.isShopOpen ? state.isPauseMenuOpen : false,
        }));
      },

      toggleJobs: () => {
        set((state) => {
          const willOpen = !state.isJobsOpen;
          return {
            isJobsOpen: willOpen,
            selectedJobId: willOpen ? state.selectedJobId : null,
            isInventoryOpen: willOpen ? false : state.isInventoryOpen,
            isMapOpen: willOpen ? false : state.isMapOpen,
            isSettingsOpen: willOpen ? false : state.isSettingsOpen,
            isShopOpen: willOpen ? false : state.isShopOpen,
            isPauseMenuOpen: willOpen ? false : state.isPauseMenuOpen,
          };
        });
      },

      openJobsPanel: (jobId) => {
        set(() => ({
          isJobsOpen: true,
          selectedJobId: jobId,
          isInventoryOpen: false,
          isMapOpen: false,
          isSettingsOpen: false,
          isShopOpen: false,
          isPauseMenuOpen: false,
        }));
      },

      closeJobs: () => {
        set(() => ({
          isJobsOpen: false,
          selectedJobId: null,
        }));
      },

      toggleBank: () => {
        set((state) => ({
          isBankOpen: !state.isBankOpen,
          isInventoryOpen: state.isBankOpen ? state.isInventoryOpen : false,
          isMapOpen: state.isBankOpen ? state.isMapOpen : false,
          isShopOpen: state.isBankOpen ? state.isShopOpen : false,
          isSettingsOpen: state.isBankOpen ? state.isSettingsOpen : false,
          isPauseMenuOpen: state.isBankOpen ? state.isPauseMenuOpen : false,
        }));
      },

      toggleSettings: () => {
        set((state) => ({
          isSettingsOpen: !state.isSettingsOpen,
          isInventoryOpen: state.isSettingsOpen ? state.isInventoryOpen : false,
          isMapOpen: state.isSettingsOpen ? state.isMapOpen : false,
          isShopOpen: state.isSettingsOpen ? state.isShopOpen : false,
          isPauseMenuOpen: state.isSettingsOpen ? state.isPauseMenuOpen : false,
        }));
      },

      togglePauseMenu: () => {
        set((state) => {
          const next = !state.isPauseMenuOpen;
          return {
            isPauseMenuOpen: next,
            ...(next
              ? {
                  isInventoryOpen: false,
                  isMapOpen: false,
                  isShopOpen: false,
                  isJobsOpen: false,
                  selectedJobId: null,
                  isBankOpen: false,
                  isChatOpen: false,
                  isSettingsOpen: false,
                }
              : {}),
          };
        });
      },

      setPauseMenuOpen: (open) => {
        set((state) => ({
          isPauseMenuOpen: open,
          ...(open
            ? {
                isInventoryOpen: false,
                isMapOpen: false,
                isShopOpen: false,
                isJobsOpen: false,
                selectedJobId: null,
                isBankOpen: false,
                isChatOpen: false,
                isSettingsOpen: false,
              }
            : {}),
        }));
      },

      setHotbarSelectedSlot: (slot) => {
        const s = Math.max(0, Math.min(4, Math.floor(slot)));
        set({ hotbarSelectedSlot: s });
      },

      setInventoryOpen: (isOpen) => {
        set({ isInventoryOpen: isOpen });
      },

      setShowCharacterCreator: (show) => {
        set({ showCharacterCreator: show });
      },

      setMapOpen: (isOpen) => {
        set({ isMapOpen: isOpen });
      },

      setChatOpen: (isOpen) => {
        set({ isChatOpen: isOpen });
      },

      setShopOpen: (isOpen) => {
        set({ isShopOpen: isOpen });
      },

      setJobsOpen: (isOpen) => {
        set((state) => ({
          isJobsOpen: isOpen,
          selectedJobId: isOpen ? state.selectedJobId : null,
        }));
      },

      setBankOpen: (isOpen) => {
        set({ isBankOpen: isOpen });
      },

      setSettingsOpen: (isOpen) => {
        set({ isSettingsOpen: isOpen });
      },

      setHUDVisible: (isVisible) => {
        set({ isHUDVisible: isVisible });
      },

      setMinimapVisible: (isVisible) => {
        set({ isMinimapVisible: isVisible });
      },

      setLoading: (isLoading, message = '') => {
        set({ isLoading, loadingMessage: message });
      },

      addNotification: (notification) => {
        set((state) => ({
          notifications: [...state.notifications, notification]
        }));
        
        // Auto-remove notification after duration
        if (notification.duration) {
          setTimeout(() => {
            get().removeNotification(notification.id);
          }, notification.duration);
        }
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      addChatMessage: (message) => {
        set((state) => ({
          chatMessages: [...state.chatMessages, message].slice(-100) // Keep last 100 messages
        }));
      },

      setChatInput: (input) => {
        set({ chatInput: input });
      },

      setChatChannel: (channel) => {
        set({ chatChannel: channel });
      },

      setSelectedJobId: (jobId) => {
        set({ selectedJobId: jobId });
      },

      clearChat: () => {
        set({ chatMessages: [] });
      },

      closeAllModals: () => {
        set({
          isInventoryOpen: false,
          isMapOpen: false,
          isChatOpen: false,
          isShopOpen: false,
          isJobsOpen: false,
          selectedJobId: null,
          isBankOpen: false,
          isSettingsOpen: false,
          isPauseMenuOpen: false,
          showCharacterCreator: false,
        });
      },
    }),
    {
      name: 'ui-store',
    }
  )
);
