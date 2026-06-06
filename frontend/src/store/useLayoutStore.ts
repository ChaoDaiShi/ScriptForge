import { create } from "zustand";

interface LayoutState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  leftPaneWidth: number;
  setLeftPaneWidth: (width: number) => void;
  centerPaneWidth: number;
  setCenterPaneWidth: (width: number) => void;
  rightPaneWidth: number;
  setRightPaneWidth: (width: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  leftPaneWidth: 33.3,
  setLeftPaneWidth: (width) => set({ leftPaneWidth: width }),
  centerPaneWidth: 33.3,
  setCenterPaneWidth: (width) => set({ centerPaneWidth: width }),
  rightPaneWidth: 33.4,
  setRightPaneWidth: (width) => set({ rightPaneWidth: width }),
}));
