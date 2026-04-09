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
  /** ES: Panel de crafting (C). EN: Crafting panel. */
  isCraftingOpen: boolean;
  /** ES: Modal compra/ver lote in-world (Fase 4). EN: In-world plot purchase modal. */
  housingPlotModalOpen: boolean;
  housingPlotModalPlotId: string | null;
  /** ES: Modal puesto de productos (Fase 8). EN: Produce stall modal. */
  produceStallModalOpen: boolean;
  showCharacterCreator: boolean;
  
  // HUD visibility
  isHUDVisible: boolean;
  isMinimapVisible: boolean;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Notifications
  notifications: Notification[];
  itemGainToasts: ItemGainToast[];
  
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
  toggleCrafting: () => void;
  setCraftingOpen: (isOpen: boolean) => void;
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
  pushItemGainToast: (t: Omit<ItemGainToast, 'id' | 'timestamp'> & { id?: string }) => void;
  removeItemGainToast: (id: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatInput: (input: string) => void;
  setChatChannel: (channel: string) => void;
  clearChat: () => void;
  closeAllModals: () => void;
  setSelectedJobId: (jobId: ExtendedJobId | null) => void;
  openHousingPlotModal: (plotId: string) => void;
  closeHousingPlotModal: () => void;
  openProduceStallModal: () => void;
  closeProduceStallModal: () => void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

/** ES: Toast derecho (+cantidad / ítem). EN: Right-side item gain toast. */
export interface ItemGainToast {
  id: string;
  itemId: string;
  name: string;
  icon: string;
  quantity: number;
  timestamp: number;
  /** ES: Línea secundaria (p. ej. vida del árbol). EN: Secondary line (e.g. tree HP). */
  subtitle?: string;
  /** ES: Estilo visual (golpe de tala, etc.). EN: Visual variant. */
  variant?: 'default' | 'chop';
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
      isCraftingOpen: false,
      housingPlotModalOpen: false,
      housingPlotModalPlotId: null,
      produceStallModalOpen: false,
      showCharacterCreator: false,
      isHUDVisible: true,
      isMinimapVisible: true,
      isLoading: false,
      loadingMessage: '',
      notifications: [],
      itemGainToasts: [],
      chatMessages: [],
      chatInput: '',
      chatChannel: 'global',

      // Actions
      toggleInventory: () => {
        set((state) => {
          const next = !state.isInventoryOpen;
          return {
            isInventoryOpen: next,
            isMapOpen: state.isInventoryOpen ? state.isMapOpen : false,
            isShopOpen: state.isInventoryOpen ? state.isShopOpen : false,
            isSettingsOpen: state.isInventoryOpen ? state.isSettingsOpen : false,
            isPauseMenuOpen: state.isInventoryOpen ? state.isPauseMenuOpen : false,
            isCraftingOpen: next ? false : state.isCraftingOpen,
            housingPlotModalOpen: next ? false : state.housingPlotModalOpen,
            housingPlotModalPlotId: next ? null : state.housingPlotModalPlotId,
            produceStallModalOpen: next ? false : state.produceStallModalOpen,
          };
        });
      },

      toggleCrafting: () => {
        set((state) => {
          const next = !state.isCraftingOpen;
          return {
            isCraftingOpen: next,
            housingPlotModalOpen: next ? false : state.housingPlotModalOpen,
            housingPlotModalPlotId: next ? null : state.housingPlotModalPlotId,
            produceStallModalOpen: next ? false : state.produceStallModalOpen,
            ...(next
              ? {
                  isInventoryOpen: false,
                  isMapOpen: false,
                  isShopOpen: false,
                  isSettingsOpen: false,
                  isPauseMenuOpen: false,
                }
              : {}),
          };
        });
      },

      setCraftingOpen: (isOpen) => {
        set((state) => ({
          isCraftingOpen: isOpen,
          housingPlotModalOpen: isOpen ? false : state.housingPlotModalOpen,
          housingPlotModalPlotId: isOpen ? null : state.housingPlotModalPlotId,
          produceStallModalOpen: isOpen ? false : state.produceStallModalOpen,
          ...(isOpen
            ? {
                isInventoryOpen: false,
                isMapOpen: false,
                isShopOpen: false,
                isSettingsOpen: false,
                isPauseMenuOpen: false,
              }
            : {}),
        }));
      },

      toggleMap: () => {
        set((state) => {
          const next = !state.isMapOpen;
          return {
            isMapOpen: next,
            isInventoryOpen: state.isMapOpen ? state.isInventoryOpen : false,
            isShopOpen: state.isMapOpen ? state.isShopOpen : false,
            isSettingsOpen: state.isMapOpen ? state.isSettingsOpen : false,
            isPauseMenuOpen: state.isMapOpen ? state.isPauseMenuOpen : false,
            housingPlotModalOpen: next ? false : state.housingPlotModalOpen,
            housingPlotModalPlotId: next ? null : state.housingPlotModalPlotId,
            produceStallModalOpen: next ? false : state.produceStallModalOpen,
          };
        });
      },

      toggleChat: () => {
        set((state) => ({
          isChatOpen: !state.isChatOpen,
        }));
      },

      toggleShop: () => {
        set((state) => {
          const next = !state.isShopOpen;
          return {
            isShopOpen: next,
            isInventoryOpen: state.isShopOpen ? state.isInventoryOpen : false,
            isMapOpen: state.isShopOpen ? state.isMapOpen : false,
            isSettingsOpen: state.isShopOpen ? state.isSettingsOpen : false,
            isPauseMenuOpen: state.isShopOpen ? state.isPauseMenuOpen : false,
            housingPlotModalOpen: next ? false : state.housingPlotModalOpen,
            housingPlotModalPlotId: next ? null : state.housingPlotModalPlotId,
            produceStallModalOpen: next ? false : state.produceStallModalOpen,
          };
        });
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
            housingPlotModalOpen: willOpen ? false : state.housingPlotModalOpen,
            housingPlotModalPlotId: willOpen ? null : state.housingPlotModalPlotId,
            produceStallModalOpen: willOpen ? false : state.produceStallModalOpen,
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
          housingPlotModalOpen: false,
          housingPlotModalPlotId: null,
          produceStallModalOpen: false,
        }));
      },

      closeJobs: () => {
        set(() => ({
          isJobsOpen: false,
          selectedJobId: null,
        }));
      },

      toggleBank: () => {
        set((state) => {
          const next = !state.isBankOpen;
          return {
            isBankOpen: next,
            isInventoryOpen: state.isBankOpen ? state.isInventoryOpen : false,
            isMapOpen: state.isBankOpen ? state.isMapOpen : false,
            isShopOpen: state.isBankOpen ? state.isShopOpen : false,
            isSettingsOpen: state.isBankOpen ? state.isSettingsOpen : false,
            isPauseMenuOpen: state.isBankOpen ? state.isPauseMenuOpen : false,
            housingPlotModalOpen: next ? false : state.housingPlotModalOpen,
            housingPlotModalPlotId: next ? null : state.housingPlotModalPlotId,
            produceStallModalOpen: next ? false : state.produceStallModalOpen,
          };
        });
      },

      toggleSettings: () => {
        set((state) => {
          const next = !state.isSettingsOpen;
          return {
            isSettingsOpen: next,
            isInventoryOpen: state.isSettingsOpen ? state.isInventoryOpen : false,
            isMapOpen: state.isSettingsOpen ? state.isMapOpen : false,
            isShopOpen: state.isSettingsOpen ? state.isShopOpen : false,
            isPauseMenuOpen: state.isSettingsOpen ? state.isPauseMenuOpen : false,
            housingPlotModalOpen: next ? false : state.housingPlotModalOpen,
            housingPlotModalPlotId: next ? null : state.housingPlotModalPlotId,
            produceStallModalOpen: next ? false : state.produceStallModalOpen,
          };
        });
      },

      togglePauseMenu: () => {
        set((state) => {
          const next = !state.isPauseMenuOpen;
          return {
            isPauseMenuOpen: next,
            housingPlotModalOpen: next ? false : state.housingPlotModalOpen,
            housingPlotModalPlotId: next ? null : state.housingPlotModalPlotId,
            produceStallModalOpen: next ? false : state.produceStallModalOpen,
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
                  isCraftingOpen: false,
                }
              : {}),
          };
        });
      },

      setPauseMenuOpen: (open) => {
        set((state) => ({
          isPauseMenuOpen: open,
          housingPlotModalOpen: open ? false : state.housingPlotModalOpen,
          housingPlotModalPlotId: open ? null : state.housingPlotModalPlotId,
          produceStallModalOpen: open ? false : state.produceStallModalOpen,
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
                isCraftingOpen: false,
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

      pushItemGainToast: (t) => {
        const id = t.id ?? `gain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const entry: ItemGainToast = {
          ...t,
          id,
          timestamp: Date.now(),
          variant: t.variant ?? 'default',
        };
        set((state) => ({
          itemGainToasts: [...state.itemGainToasts.slice(-7), entry],
        }));
        const ms = 3200;
        window.setTimeout(() => {
          get().removeItemGainToast(id);
        }, ms);
      },

      removeItemGainToast: (id) => {
        set((state) => ({
          itemGainToasts: state.itemGainToasts.filter((x) => x.id !== id),
        }));
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

      openHousingPlotModal: (plotId) => {
        set(() => ({
          housingPlotModalOpen: true,
          housingPlotModalPlotId: plotId,
          produceStallModalOpen: false,
          isInventoryOpen: false,
          isMapOpen: false,
          isShopOpen: false,
          isJobsOpen: false,
          selectedJobId: null,
          isBankOpen: false,
          isPauseMenuOpen: false,
          isCraftingOpen: false,
          isSettingsOpen: false,
        }));
      },

      closeHousingPlotModal: () => {
        set({ housingPlotModalOpen: false, housingPlotModalPlotId: null });
      },

      openProduceStallModal: () => {
        set(() => ({
          produceStallModalOpen: true,
          housingPlotModalOpen: false,
          housingPlotModalPlotId: null,
          isInventoryOpen: false,
          isMapOpen: false,
          isShopOpen: false,
          isJobsOpen: false,
          selectedJobId: null,
          isBankOpen: false,
          isPauseMenuOpen: false,
          isCraftingOpen: false,
          isSettingsOpen: false,
        }));
      },

      closeProduceStallModal: () => {
        set({ produceStallModalOpen: false });
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
          isCraftingOpen: false,
          showCharacterCreator: false,
          housingPlotModalOpen: false,
          housingPlotModalPlotId: null,
          produceStallModalOpen: false,
        });
      },
    }),
    {
      name: 'ui-store',
    }
  )
);
