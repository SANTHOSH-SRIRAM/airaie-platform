import { create } from 'zustand';

// --- Types ---

export type SidebarContentType = 'navigation' | 'nodePalette' | 'sessions' | 'filters' | 'artifacts' | 'profile' | 'tool-detail';

export interface RightPanelState {
  open: boolean;
  contentType: string | null;
  width: number;
  data: Record<string, unknown> | null;
}

export interface BottomBarState {
  visible: boolean;
  contentType: string | null;
}

export interface ModalEntry {
  id: string;
  component: string;
  props: Record<string, unknown>;
}

interface SectionState {
  [key: string]: boolean;
}

export type ToolRegistryViewMode = 'grid' | 'table';

export interface UiStore {
  // --- Existing state ---
  sidebarCollapsed: boolean;
  studioFullscreen: boolean;
  activeRoute: string;
  sidebarSections: SectionState;

  // --- New state ---
  sidebarContentType: SidebarContentType;
  rightPanel: RightPanelState;
  bottomBar: BottomBarState;
  modals: ModalEntry[];
  toolRegistryViewMode: ToolRegistryViewMode;
  activeArtifactSection: string;
  activeProfileSection: string;
  activeToolSection: string;

  // --- Existing actions ---
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  setStudioFullscreen: (fs: boolean) => void;
  setActiveRoute: (route: string) => void;
  toggleSection: (section: string) => void;

  // --- New actions ---
  setSidebarContentType: (type: SidebarContentType) => void;
  openRightPanel: (contentType: string, data?: Record<string, unknown>) => void;
  closeRightPanel: () => void;
  toggleRightPanel: () => void;
  setRightPanelWidth: (width: number) => void;
  setBottomBar: (contentType: string) => void;
  hideBottomBar: () => void;
  pushModal: (entry: ModalEntry) => void;
  popModal: () => void;
  clearModals: () => void;
  setToolRegistryViewMode: (mode: ToolRegistryViewMode) => void;
  setActiveArtifactSection: (section: string) => void;
  setActiveProfileSection: (section: string) => void;
  setActiveToolSection: (section: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  // --- Existing state ---
  sidebarCollapsed: false,
  studioFullscreen: false,
  activeRoute: '/dashboard',
  sidebarSections: {
    workspace: true,
    build: true,
    'project-data': true,
  },

  // --- New state ---
  sidebarContentType: 'navigation',
  rightPanel: {
    open: false,
    contentType: null,
    width: 320,
    data: null,
  },
  bottomBar: {
    visible: false,
    contentType: null,
  },
  modals: [],
  toolRegistryViewMode: 'grid' as ToolRegistryViewMode,
  activeArtifactSection: 'overview',
  activeProfileSection: 'overview',
  activeToolSection: 'overview',

  // --- Existing actions ---
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  collapseSidebar: () => set({ sidebarCollapsed: true }),
  setStudioFullscreen: (fs) => set({ studioFullscreen: fs }),
  setActiveRoute: (route) => set({ activeRoute: route }),
  toggleSection: (section) =>
    set((s) => ({
      sidebarSections: {
        ...s.sidebarSections,
        [section]: !s.sidebarSections[section],
      },
    })),

  // --- New actions ---
  setSidebarContentType: (type) => set({ sidebarContentType: type }),

  openRightPanel: (contentType, data = {}) =>
    set({
      rightPanel: {
        open: true,
        contentType,
        width: 320,
        data: data ?? null,
      },
    }),

  closeRightPanel: () =>
    set((s) => ({
      rightPanel: { ...s.rightPanel, open: false },
    })),

  toggleRightPanel: () =>
    set((s) => ({
      rightPanel: { ...s.rightPanel, open: !s.rightPanel.open },
    })),

  setRightPanelWidth: (width) =>
    set((s) => ({
      rightPanel: { ...s.rightPanel, width },
    })),

  setBottomBar: (contentType) =>
    set({ bottomBar: { visible: true, contentType } }),

  hideBottomBar: () =>
    set({ bottomBar: { visible: false, contentType: null } }),

  pushModal: (entry) =>
    set((s) => ({ modals: [...s.modals, entry] })),

  popModal: () =>
    set((s) => ({ modals: s.modals.slice(0, -1) })),

  clearModals: () => set({ modals: [] }),

  setToolRegistryViewMode: (mode) => set({ toolRegistryViewMode: mode }),

  setActiveArtifactSection: (section) => set({ activeArtifactSection: section }),

  setActiveProfileSection: (section) => set({ activeProfileSection: section }),
  setActiveToolSection: (section) => set({ activeToolSection: section }),
}));
