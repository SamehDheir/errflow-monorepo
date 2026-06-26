import { create } from "zustand";
import { Project, ErrorEvent } from "@/types";

interface AppState {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  newErrorsCount: number;
  setNewErrorsCount: (count: number) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),
  newErrorsCount: 0,
  setNewErrorsCount: (count) => set({ newErrorsCount: count }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
