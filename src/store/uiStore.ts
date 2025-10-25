import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface UIState {
  // Modal states
  isInventoryOpen: boolean;
  isMapOpen: boolean;
  isChatOpen: boolean;
  isShopOpen: boolean;
  isBankOpen: boolean;
  isSettingsOpen: boolean;
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
  toggleBank: () => void;
  toggleSettings: () => void;
  setInventoryOpen: (isOpen: boolean) => void;
  setShowCharacterCreator: (show: boolean) => void;
  setMapOpen: (isOpen: boolean) => void;
  setChatOpen: (isOpen: boolean) => void;
  setShopOpen: (isOpen: boolean) => void;
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
      isBankOpen: false,
      isSettingsOpen: false,
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
          // Close other modals when opening inventory
          isMapOpen: state.isInventoryOpen ? state.isMapOpen : false,
          isShopOpen: state.isInventoryOpen ? state.isShopOpen : false,
          isSettingsOpen: state.isInventoryOpen ? state.isSettingsOpen : false,
        }));
      },

      toggleMap: () => {
        set((state) => ({
          isMapOpen: !state.isMapOpen,
          // Close other modals when opening map
          isInventoryOpen: state.isMapOpen ? state.isInventoryOpen : false,
          isShopOpen: state.isMapOpen ? state.isShopOpen : false,
          isSettingsOpen: state.isMapOpen ? state.isSettingsOpen : false,
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
          // Close other modals when opening shop
          isInventoryOpen: state.isShopOpen ? state.isInventoryOpen : false,
          isMapOpen: state.isShopOpen ? state.isMapOpen : false,
          isSettingsOpen: state.isShopOpen ? state.isSettingsOpen : false,
        }));
      },

      toggleBank: () => {
        set((state) => ({
          isBankOpen: !state.isBankOpen,
          isInventoryOpen: state.isBankOpen ? state.isInventoryOpen : false,
          isMapOpen: state.isBankOpen ? state.isMapOpen : false,
          isShopOpen: state.isBankOpen ? state.isShopOpen : false,
          isSettingsOpen: state.isBankOpen ? state.isSettingsOpen : false,
        }));
      },

      toggleSettings: () => {
        set((state) => ({
          isSettingsOpen: !state.isSettingsOpen,
          // Close other modals when opening settings
          isInventoryOpen: state.isSettingsOpen ? state.isInventoryOpen : false,
          isMapOpen: state.isSettingsOpen ? state.isMapOpen : false,
          isShopOpen: state.isSettingsOpen ? state.isShopOpen : false,
        }));
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

      clearChat: () => {
        set({ chatMessages: [] });
      },

      closeAllModals: () => {
        set({
          isInventoryOpen: false,
          isMapOpen: false,
          isChatOpen: false,
          isShopOpen: false,
          isBankOpen: false,
          isSettingsOpen: false,
          showCharacterCreator: false,
        });
      },
    }),
    {
      name: 'ui-store',
    }
  )
);
