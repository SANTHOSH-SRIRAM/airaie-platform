import { create } from 'zustand';

interface SectionState {
  [key: string]: boolean;
}

interface UiStore {
  sidebarCollapsed: boolean;
  activeRoute: string;
  sidebarSections: SectionState;
  toggleSidebar: () => void;
  setActiveRoute: (route: string) => void;
  toggleSection: (section: string) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  sidebarCollapsed: false,
  activeRoute: '/dashboard',
  sidebarSections: {
    workspace: true,
    build: true,
    'project-data': true,
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveRoute: (route) => set({ activeRoute: route }),
  toggleSection: (section) =>
    set((s) => ({
      sidebarSections: {
        ...s.sidebarSections,
        [section]: !s.sidebarSections[section],
      },
    })),
}));
