import { create } from "zustand";

export interface Project {
  id: string;
  title: string;
  sourceNovel: string;
  sourceAuthor: string;
  chapterCount: number;
  status: "idle" | "importing" | "converting" | "ready";
  createdAt: string;
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  setCurrentProject: (id: string | null) => void;
  addProject: (project: Project) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProjectId: null,
  setCurrentProject: (id) => set({ currentProjectId: id }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
}));
